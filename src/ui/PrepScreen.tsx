import { useCallback, useEffect, useState } from 'react';
import { track } from '../track';
import type { StorageAdapter } from '../storage';
import type { Topic } from '../map/types';
import { loadGrade, type GradeContent } from './gradeLoader';
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

// 一个备考知识点：把 prepTopic 解析到其所在年级的 Topic + 该年级内容包（供跨年级渲染练习）
interface PrepItem {
  key: string; // `${grade}:${topicId}`
  grade: number;
  topic: Topic;
  content: GradeContent;
  label: string;
}

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

const MARK: Record<MasteryState, string> = {
  mastered: '✓',
  in_progress: '◐',
  not_started: '○',
  unavailable: '🔒',
};

const newSeed = () => Date.now() & 0xffffffff;

export function PrepScreen({ seriesId, adapter, studentId, onBack }: Props) {
  const [series, setSeries] = useState<ExamSeries | null>(null);
  const [items, setItems] = useState<PrepItem[]>([]);
  const [mastery, setMastery] = useState<Record<string, MasteryState>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ kind: 'list' });

  // 加载考试系列 + 跨年级解析所有备考知识点
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

      const grades = [...new Set(s.prepTopics.map((p) => p.grade))];
      const loaded = await Promise.all(grades.map((g) => loadGrade(g).catch(() => null)));
      const byGrade = new Map<number, GradeContent>();
      grades.forEach((g, i) => { if (loaded[i]) byGrade.set(g, loaded[i]!); });

      const its: PrepItem[] = [];
      for (const pt of s.prepTopics) {
        const content = byGrade.get(pt.grade);
        if (!content) continue;
        const topic = content.knowledgeMap.topics.find((t) => t.id === pt.topicId);
        if (!topic) continue;
        its.push({ key: `${pt.grade}:${pt.topicId}`, grade: pt.grade, topic, content, label: pt.label || topic.title });
      }
      if (!alive) return;
      setItems(its);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [seriesId]);

  const refreshMastery = useCallback(async () => {
    const entries = await Promise.all(
      items.map(async (it) => [it.key, await topicMastery(adapter, studentId, it.content.pack, it.topic)] as const),
    );
    setMastery(Object.fromEntries(entries));
    const mastered = entries.filter(([, m]) => m === 'mastered').length;
    updatePrepProgress(studentId, mastered, entries.length);
  }, [items, adapter, studentId]);

  useEffect(() => { if (items.length) refreshMastery(); }, [items, refreshMastery]);

  const openTopic = async (it: PrepItem) => {
    if (it.topic.status !== 'ready') return;
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

  // —— 练习子视图（跨年级：用 item 所在年级的内容包）——
  if (view.kind === 'probe') {
    return (
      <Probe
        pack={view.item.content.pack}
        adapter={adapter}
        studentId={studentId}
        onDone={() => setView({ kind: 'play', item: view.item, seed: view.seed })}
      />
    );
  }
  if (view.kind === 'play') {
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
    return (
      <PracticeScreen
        key={'prep-prac' + view.item.key + view.seed}
        setId={view.item.topic.problemSetId!}
        practicePack={view.item.content.practicePack}
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

  const grades = [...new Set(items.map((i) => i.grade))].sort((a, b) => a - b);
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

      {grades.map((g) => (
        <section key={g} className="prep-group">
          <h2 className="prep-group-title">{gradeLabel(g)}</h2>
          <div className="prep-list">
            {items.filter((i) => i.grade === g).map((it) => (
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
  const ready = item.topic.status === 'ready' && state !== 'unavailable';
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
