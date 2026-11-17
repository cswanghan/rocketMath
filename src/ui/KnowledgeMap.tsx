import { useEffect, useState } from 'react';
import type { ContentPack, Track } from '../engine';
import { levelFromXp } from '../practice';
import { PEDAGOGY_LABEL, topicsOf, unitsByTerm } from '../map/map';
import type { KnowledgeMap as KnowledgeMapData, Term, Topic } from '../map/types';
import type { StorageAdapter } from '../storage';
import { RocketChart } from './RocketChart';

interface Props {
  pack: ContentPack;
  knowledgeMap: KnowledgeMapData;
  adapter: StorageAdapter;
  studentId: string;
  onPlay: (trackId: string) => void;
  onRace: (trackId: string) => void;
  onPractice: (setId: string) => void;
  onBack?: () => void;
}

interface Prog {
  completed: string[];
  current: string;
}

interface PracProg {
  completed: boolean;
  bestFirstTry: number;
  total: number;
}

const GRADE_LABELS: Record<number, string> = {
  3: '三年级', 4: '四年级', 5: '五年级', 6: '六年级', 7: '初一', 8: '初二', 9: '初三',
};
function gradeLabel(g: number): string { return GRADE_LABELS[g] ?? `${g}年级`; }

const TERMS: { key: Term; label: string }[] = [
  { key: 'upper', label: '上册' },
  { key: 'lower', label: '下册' },
];

export function extraFluencyTracks(pack: ContentPack, knowledgeMap: KnowledgeMapData): Track[] {
  const mapped = new Set(knowledgeMap.topics.map(topic => topic.fluencyTrackId));
  return pack.tracks.filter(track => track.enabled && !mapped.has(track.trackId));
}

export function KnowledgeMap({ pack, knowledgeMap, adapter, studentId, onPlay, onRace, onPractice, onBack }: Props) {
  const [progress, setProgress] = useState<Record<string, Prog>>({});
  const [pracProgress, setPracProgress] = useState<Record<string, PracProg>>({});
  const [xp, setXp] = useState(0);

  useEffect(() => {
    let alive = true;
    const readyTracks = pack.tracks.filter(track => track.enabled).map(track => track.trackId);
    const readySets = knowledgeMap.topics
      .filter((t) => t.status === 'ready' && t.problemSetId)
      .map((t) => t.problemSetId!);
    (async () => {
      const entries = await Promise.all(
        readyTracks.map(async (trackId) => {
          const s = await adapter.getTrackState(studentId, trackId);
          return [trackId, { completed: s?.completedLevels ?? [], current: s?.currentLevel ?? 'A' }] as const;
        }),
      );
      const pracEntries = await Promise.all(
        readySets.map(async (setId) => {
          const p = await adapter.getPractice(studentId, setId);
          return [setId, { completed: p?.completed ?? false, bestFirstTry: p?.bestFirstTry ?? 0, total: p?.total ?? 0 }] as const;
        }),
      );
      const student = await adapter.getStudent(studentId);
      if (alive) {
        setProgress(Object.fromEntries(entries));
        setPracProgress(Object.fromEntries(pracEntries));
        setXp(student?.xp ?? 0);
      }
    })();
    return () => {
      alive = false;
    };
  }, [adapter, studentId, pack, knowledgeMap]);

  const readyCount = knowledgeMap.topics.filter((t) => t.status === 'ready').length;
  const lvl = levelFromXp(xp);
  const extraTracks = extraFluencyTracks(pack, knowledgeMap);

  return (
    <div className="map">
      {onBack && (
        <button className="map-back" onClick={onBack}>← 返回</button>
      )}
      <h1 className="title">🚀 {gradeLabel(knowledgeMap.grade)}数学 · 知识地图</h1>
      <p className="subtitle">
        {knowledgeMap.textbook} · {knowledgeMap.topics.length} 个知识点 · 已上线 {readyCount}
      </p>

      <div className="level-panel">
        <div className="level-row">
          <span className="lv-badge">Lv.{lvl.level}</span>
          <span className="xp-text">⭐ {xp} 经验</span>
          <span className="xp-next">距下一级还差 {lvl.toNext}</span>
        </div>
        <div className="xp-bar">
          <div className="xp-fill" style={{ width: `${Math.round((lvl.intoLevel / lvl.span) * 100)}%` }} />
        </div>
      </div>

      {TERMS.map((term) => (
        <section key={term.key} className="term">
          <h2 className="term-title">{term.label}</h2>
          {unitsByTerm(knowledgeMap, term.key).map((unit) => (
            <div key={unit.id} className="unit">
              <div className="unit-title">
                {unit.index > 0 ? `${unit.index}. ` : ''}
                {unit.title}
              </div>
              <div className="topic-grid">
                {topicsOf(knowledgeMap, unit).map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    pack={pack}
                    prog={topic.fluencyTrackId ? progress[topic.fluencyTrackId] : undefined}
                    prac={topic.problemSetId ? pracProgress[topic.problemSetId] : undefined}
                    onPlay={onPlay}
                    onRace={onRace}
                    onPractice={onPractice}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
      {extraTracks.length > 0 && <section className="term" aria-label="更多口算">
        <h2 className="term-title">更多口算</h2>
        <div className="topic-grid">
          {extraTracks.map(track => <FluencyTrackCard key={track.trackId}
            track={track} prog={progress[track.trackId]} onPlay={onPlay} onRace={onRace} />)}
        </div>
      </section>}
    </div>
  );
}

export function TopicCard({
  topic,
  pack,
  prog,
  prac,
  onPlay,
  onRace,
  onPractice,
}: {
  topic: Topic;
  pack: ContentPack;
  prog?: Prog;
  prac?: PracProg;
  onPlay: (trackId: string) => void;
  onRace: (trackId: string) => void;
  onPractice: (setId: string) => void;
}) {
  const ped = <span className={`ped ped-${topic.pedagogy}`}>{PEDAGOGY_LABEL[topic.pedagogy]}</span>;
  const fluency = pack.tracks.find(track => track.enabled && track.trackId === topic.fluencyTrackId);

  // Some topics have both sets and timed drills. Keep the comprehensive
  // practice as the primary action and expose its oral practice separately.
  if (topic.status === 'ready' && topic.problemSetId) {
    const setId = topic.problemSetId;
    return (
      <div className="topic topic-ready">
        <button className="topic-main" onClick={() => onPractice(setId)}>
          <div className="topic-head">
            {ped}
            <span className="topic-name">{topic.title}</span>
            {prac?.completed && <span className="done-tag">✓ 完成</span>}
          </div>
          <span className="topic-meta">
            {prac?.completed ? `最好 ${prac.bestFirstTry}/${prac.total} 一次答对` : fluency ? '综合练习 →' : '开始练习 →'}
          </span>
        </button>
        {fluency && <>
          <div style={{ padding: '0 16px 10px' }}>
            <RocketChart levels={fluency.levels.map(level => level.level)} completed={prog?.completed ?? []} current={prog?.current} compact />
            <span className="topic-meta">口算已过 {prog?.completed.length ?? 0}/{fluency.levels.length} 关</span>
          </div>
          <button className="race-btn small" onClick={() => onPlay(fluency.trackId)} aria-label={`${topic.title} · 口算练习`}>
            口算练习
          </button>
          <button className="race-btn small" onClick={() => onRace(fluency.trackId)} aria-label={`${topic.title} · 竞速`}>
            🚀 竞速
          </button>
        </>}
      </div>
    );
  }

  if (topic.status !== 'ready' || !fluency) {
    return (
      <div className="topic topic-soon" aria-disabled>
        <div className="topic-head">
          {ped}
          <span className="topic-name">{topic.title}</span>
        </div>
        <span className="soon-tag">🔒 即将上线</span>
      </div>
    );
  }

  return <FluencyTrackCard track={fluency} title={topic.title} prog={prog} onPlay={onPlay} onRace={onRace} />;
}

export function FluencyTrackCard({ track, title, prog, onPlay, onRace }: {
  track: Track;
  title?: string;
  prog?: Prog;
  onPlay: (trackId: string) => void;
  onRace: (trackId: string) => void;
}) {
  const trackId = track.trackId;
  const levels = track.levels.map((l) => l.level);
  const completed = prog?.completed ?? [];
  const allDone = completed.length === levels.length;

  return (
    <div className="topic topic-ready">
      <button className="topic-main" onClick={() => onPlay(trackId)}>
        <div className="topic-head">
            <span className="ped ped-fluency">口算</span>
            <span className="topic-name">{title ?? track.name}</span>
          {allDone && <span className="done-tag">✓ 全通关</span>}
        </div>
        <RocketChart levels={levels} completed={completed} current={prog?.current} compact />
        <span className="topic-meta">已过 {completed.length}/{levels.length} 关</span>
      </button>
      <button className="race-btn small" onClick={() => onRace(trackId)}>
        🚀 竞速
      </button>
    </div>
  );
}
