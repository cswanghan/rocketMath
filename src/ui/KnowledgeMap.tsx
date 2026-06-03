import { useEffect, useState } from 'react';
import { getTrack } from '../engine';
import { levelFromXp } from '../practice';
import { knowledgeMap, PEDAGOGY_LABEL, topicsOf, unitsByTerm } from '../map/map';
import type { Term, Topic } from '../map/types';
import type { StorageAdapter } from '../storage';
import { pack } from './pack';
import { RocketChart } from './RocketChart';

interface Props {
  adapter: StorageAdapter;
  studentId: string;
  onPlay: (trackId: string) => void;
  onRace: (trackId: string) => void;
  onPractice: (setId: string) => void;
  onParent: () => void;
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

const TERMS: { key: Term; label: string }[] = [
  { key: 'upper', label: '上册' },
  { key: 'lower', label: '下册' },
];

export function KnowledgeMap({ adapter, studentId, onPlay, onRace, onPractice, onParent }: Props) {
  const [progress, setProgress] = useState<Record<string, Prog>>({});
  const [pracProgress, setPracProgress] = useState<Record<string, PracProg>>({});
  const [xp, setXp] = useState(0);

  useEffect(() => {
    let alive = true;
    const readyTracks = knowledgeMap.topics
      .filter((t) => t.status === 'ready' && t.fluencyTrackId)
      .map((t) => t.fluencyTrackId!);
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
  }, [adapter, studentId]);

  const readyCount = knowledgeMap.topics.filter((t) => t.status === 'ready').length;
  const lvl = levelFromXp(xp);

  return (
    <div className="map">
      <button className="parent-entry" onClick={onParent} title="家长">
        👨‍👧 家长
      </button>
      <h1 className="title">🚀 三年级数学 · 知识地图</h1>
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
    </div>
  );
}

function TopicCard({
  topic,
  prog,
  prac,
  onPlay,
  onRace,
  onPractice,
}: {
  topic: Topic;
  prog?: Prog;
  prac?: PracProg;
  onPlay: (trackId: string) => void;
  onRace: (trackId: string) => void;
  onPractice: (setId: string) => void;
}) {
  const ped = <span className={`ped ped-${topic.pedagogy}`}>{PEDAGOGY_LABEL[topic.pedagogy]}</span>;

  // ready non-fluency topic -> Practice
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
            {prac?.completed ? `最好 ${prac.bestFirstTry}/${prac.total} 一次答对` : '开始练习 →'}
          </span>
        </button>
      </div>
    );
  }

  if (topic.status !== 'ready' || !topic.fluencyTrackId) {
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

  const trackId = topic.fluencyTrackId;
  const levels = getTrack(pack, trackId).levels.map((l) => l.level);
  const completed = prog?.completed ?? [];
  const allDone = completed.length === levels.length;

  return (
    <div className="topic topic-ready">
      <button className="topic-main" onClick={() => onPlay(trackId)}>
        <div className="topic-head">
          {ped}
          <span className="topic-name">{topic.title}</span>
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
