import { useCallback, useEffect, useState } from 'react';
import { track } from '../track';
import type { StorageAdapter } from '../storage';
import type { Topic } from '../map/types';
import type { PracticePack } from '../practice';
import { loadGrade, type GradeContent } from './gradeLoader';
import { loadEnglishPack } from './englishLoader';
import { loadExamCalendar } from './examLoader';
import type { ExamSeries } from './examTypes';
import { MASTERY_LABEL, topicMastery, type MasteryState } from './prepMastery';
import { updatePrepProgress, vocabLevelParam } from './prep';
import { Probe } from './Probe';
import { Play } from './Play';
import { PracticeScreen } from './PracticeScreen';
import { EnglishVocab } from './EnglishVocab';

interface Props {
  seriesId: string;
  adapter: StorageAdapter;
  studentId: string;
  onBack: () => void;
}

// 一个备考知识点。math: 解析到所在年级的 Topic + 该年级内容包（跨年级渲染练习）；
// english: 解析到英语练习包里的某个题集（不按年级组织）。
type PrepItem =
  | { kind: 'math'; key: string; group: string; label: string; status: string; grade: number; content: GradeContent; topic: Topic }
  | { kind: 'english'; key: string; group: string; label: string; status: string; pack: PracticePack; setId: string };

type View =
  | { kind: 'list' }
  | { kind: 'probe'; item: PrepItem; seed: number }
  | { kind: 'play'; item: PrepItem; seed: number }
  | { kind: 'practice'; item: PrepItem; seed: number }
  | { kind: 'vocab'; level: string };

const GRADE_LABELS: Record<number, string> = {
  3: '三年级', 4: '四年级', 5: '五年级', 6: '六年级', 7: '初一', 8: '初二', 9: '初三',
};
const gradeLabel = (g: number) => GRADE_LABELS[g] ?? `${g}年级`;
const ENGLISH_GROUP = '英语阅读·语法';

const MARK: Record<MasteryState, string> = {
  mastered: '✓',
  in_progress: '◐',
  not_started: '○',
  unavailable: '🔒',
};

const newSeed = () => Date.now() & 0xffffffff;

async function itemMastery(adapter: StorageAdapter, studentId: string, it: PrepItem): Promise<MasteryState> {
  if (it.kind === 'english') {
    const rec = await adapter.getPractice(studentId, it.setId);
    if (rec?.completed) return 'mastered';
    return rec && rec.bestFirstTry > 0 ? 'in_progress' : 'not_started';
  }
  return topicMastery(adapter, studentId, it.content.pack, it.topic);
}

export function PrepScreen({ seriesId, adapter, studentId, onBack }: Props) {
  const [series, setSeries] = useState<ExamSeries | null>(null);
  const [items, setItems] = useState<PrepItem[]>([]);
  const [mastery, setMastery] = useState<Record<string, MasteryState>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ kind: 'list' });

  // 加载考试系列 + 解析所有备考知识点（数学跨年级、英语单独包）
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      track('prep_open', { seriesId });
      const data = await loadExamCalendar();
      const s = data.series.find((x) => x.id === seriesId) ?? null;
      if (!alive) return;
      setSeries(s);
      if (!s) { setLoading(false); return; }

      const needEnglish = s.prepTopics.some((p) => p.pack === 'english');
      const grades = [...new Set(s.prepTopics.filter((p) => p.pack !== 'english' && p.grade != null).map((p) => p.grade!))];
      const [gradeContents, englishPack] = await Promise.all([
        Promise.all(grades.map((g) => loadGrade(g).catch(() => null))),
        needEnglish ? loadEnglishPack().catch(() => null) : Promise.resolve(null),
      ]);
      const byGrade = new Map<number, GradeContent>();
      grades.forEach((g, i) => { if (gradeContents[i]) byGrade.set(g, gradeContents[i]!); });

      const its: PrepItem[] = [];
      for (const pt of s.prepTopics) {
        if (pt.pack === 'english') {
          if (!englishPack) continue;
          const set = englishPack.sets.find((x) => x.id === pt.topicId);
          if (!set) continue;
          its.push({ kind: 'english', key: `en:${pt.topicId}`, group: ENGLISH_GROUP, label: pt.label || set.title, status: 'ready', pack: englishPack, setId: pt.topicId });
        } else {
          const content = byGrade.get(pt.grade!);
          if (!content) continue;
          const topic = content.knowledgeMap.topics.find((t) => t.id === pt.topicId);
          if (!topic) continue;
          its.push({ kind: 'math', key: `${pt.grade}:${pt.topicId}`, group: gradeLabel(pt.grade!), label: pt.label || topic.title, status: topic.status, grade: pt.grade!, content, topic });
        }
      }
      if (!alive) return;
      setItems(its);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [seriesId]);

  const refreshMastery = useCallback(async () => {
    const entries = await Promise.all(
      items.map(async (it) => [it.key, await itemMastery(adapter, studentId, it)] as const),
    );
    setMastery(Object.fromEntries(entries));
    const mastered = entries.filter(([, m]) => m === 'mastered').length;
    updatePrepProgress(studentId, mastered, entries.length);
  }, [items, adapter, studentId]);

  useEffect(() => { if (items.length) refreshMastery(); }, [items, refreshMastery]);

  const openTopic = async (it: PrepItem) => {
    if (it.status !== 'ready') return;
    if (it.kind === 'english') {
      track('prep_open_topic', { seriesId, kind: 'english', setId: it.setId });
      setView({ kind: 'practice', item: it, seed: newSeed() });
      return;
    }
    if (it.topic.problemSetId) {
      track('prep_open_topic', { seriesId, grade: it.grade, topicId: it.topic.id, kind: 'practice' });
      setView({ kind: 'practice', item: it, seed: newSeed() });
      return;
    }
    if (it.topic.fluencyTrackId) {
      track('prep_open_topic', { seriesId, grade: it.grade, topicId: it.topic.id, kind: 'play' });
      const student = await adapter.getStudent(studentId);
      setView({ kind: student?.latencyGateMs ? 'play' : 'probe', item: it, seed: newSeed() });
    }
  };

  const exitToList = () => { setView({ kind: 'list' }); refreshMastery(); };

  // —— 练习子视图 ——
  if (view.kind === 'probe' && view.item.kind === 'math') {
    return (
      <Probe
        pack={view.item.content.pack}
        adapter={adapter}
        studentId={studentId}
        onDone={() => setView({ kind: 'play', item: view.item, seed: view.seed })}
      />
    );
  }
  if (view.kind === 'play' && view.item.kind === 'math') {
    return (
      <Play
        key={'prep-play' + view.item.key + view.seed}
        trackId={view.item.topic.fluencyTrackId!}
        pack={view.item.content.pack}
        adapter={adapter}
        studentId={studentId}
        seed={view.seed}
        onExit={exitToList}
      />
    );
  }
  if (view.kind === 'practice') {
    const it = view.item;
    const pack = it.kind === 'english' ? it.pack : it.content.practicePack;
    const setId = it.kind === 'english' ? it.setId : it.topic.problemSetId!;
    return (
      <PracticeScreen
        key={'prep-prac' + it.key + view.seed}
        setId={setId}
        practicePack={pack}
        adapter={adapter}
        studentId={studentId}
        seed={view.seed}
        onExit={exitToList}
      />
    );
  }
  if (view.kind === 'vocab') {
    return <EnglishVocab level={view.level} onBack={exitToList} />;
  }

  // —— 备考清单视图 ——
  if (loading) {
    return (
      <div className="map prep-screen">
        <button className="map-back" onClick={onBack}>← 返回</button>
        <p className="prep-empty">备考清单加载中…</p>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="map prep-screen">
        <button className="map-back" onClick={onBack}>← 返回</button>
        <p className="prep-empty">未找到该考试</p>
      </div>
    );
  }

  // 分组顺序：数学按年级升序，英语阅读·语法置后
  const groupOrder: string[] = [];
  [...new Set(items.filter((i) => i.kind === 'math').map((i) => (i as Extract<PrepItem, { kind: 'math' }>).grade))]
    .sort((a, b) => a - b)
    .forEach((g) => groupOrder.push(gradeLabel(g)));
  if (items.some((i) => i.kind === 'english')) groupOrder.push(ENGLISH_GROUP);

  const masteredCount = items.filter((i) => mastery[i.key] === 'mastered').length;
  const pct = items.length ? Math.round((masteredCount / items.length) * 100) : 0;
  const hasContent = items.length > 0 || !!series.vocabLink;

  return (
    <div className="map prep-screen">
      <button className="map-back" onClick={onBack}>← 返回</button>
      <header className="prep-header">
        <h1 className="prep-title">🎯 备考 · {series.name}</h1>
        <p className="subtitle">{series.format}</p>
      </header>

      {items.length > 0 && (
        <div className="prep-progress">
          <div className="prep-progress-row">
            <span className="prep-progress-count">已掌握 {masteredCount}/{items.length} 个知识点</span>
            <span className="prep-progress-pct">{pct}%</span>
          </div>
          <div className="prep-bar"><div className="prep-fill" style={{ width: `${pct}%` }} /></div>
        </div>
      )}

      {groupOrder.map((g) => (
        <section key={g} className="prep-group">
          <h2 className="prep-group-title">{g}</h2>
          <div className="prep-list">
            {items.filter((i) => i.group === g).map((it) => (
              <PrepRow key={it.key} item={it} state={mastery[it.key] ?? 'not_started'} onOpen={openTopic} />
            ))}
          </div>
        </section>
      ))}

      {series.vocabLink && (
        <section className="prep-group">
          <h2 className="prep-group-title">英语词汇</h2>
          <div className="prep-list">
            <button
              className="prep-row state-vocab"
              onClick={() => {
                track('prep_open_vocab', { seriesId, level: series.vocabLink!.level });
                setView({ kind: 'vocab', level: vocabLevelParam(series.vocabLink!.level) });
              }}
            >
              <span className="prep-row-mark">📖</span>
              <span className="prep-row-body">
                <span className="prep-row-name">{series.name} 高频词汇</span>
                <span className="prep-row-meta">背单词 →</span>
              </span>
            </button>
          </div>
        </section>
      )}

      {!hasContent && (
        <p className="prep-empty">该考试的备考内容正在建设中，敬请期待 🛠️</p>
      )}
    </div>
  );
}

function PrepRow({
  item,
  state,
  onOpen,
}: {
  item: PrepItem;
  state: MasteryState;
  onOpen: (it: PrepItem) => void;
}) {
  const ready = item.status === 'ready' && state !== 'unavailable';
  return (
    <button
      className={`prep-row state-${state}`}
      disabled={!ready}
      onClick={() => ready && onOpen(item)}
    >
      <span className="prep-row-mark">{MARK[state]}</span>
      <span className="prep-row-body">
        <span className="prep-row-name">{item.label}</span>
        <span className="prep-row-meta">
          {MASTERY_LABEL[state]}
          {ready && state !== 'mastered' ? ' · 去练习 →' : ''}
          {ready && state === 'mastered' ? ' · 再练一次 →' : ''}
        </span>
      </span>
    </button>
  );
}
