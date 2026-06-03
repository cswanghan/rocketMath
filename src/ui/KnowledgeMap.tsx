import { useEffect, useState } from 'react';
import { getTrack } from '../engine';
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
}

interface Prog {
  completed: string[];
  current: string;
}

const TERMS: { key: Term; label: string }[] = [
  { key: 'upper', label: '上册' },
  { key: 'lower', label: '下册' },
];

export function KnowledgeMap({ adapter, studentId, onPlay, onRace }: Props) {
  const [progress, setProgress] = useState<Record<string, Prog>>({});

  useEffect(() => {
    let alive = true;
    const readyTracks = knowledgeMap.topics
      .filter((t) => t.status === 'ready' && t.fluencyTrackId)
      .map((t) => t.fluencyTrackId!);
    (async () => {
      const entries = await Promise.all(
        readyTracks.map(async (trackId) => {
          const s = await adapter.getTrackState(studentId, trackId);
          return [trackId, { completed: s?.completedLevels ?? [], current: s?.currentLevel ?? 'A' }] as const;
        }),
      );
      if (alive) setProgress(Object.fromEntries(entries));
    })();
    return () => {
      alive = false;
    };
  }, [adapter, studentId]);

  const readyCount = knowledgeMap.topics.filter((t) => t.status === 'ready').length;

  return (
    <div className="map">
      <h1 className="title">🚀 三年级数学 · 知识地图</h1>
      <p className="subtitle">
        {knowledgeMap.textbook} · {knowledgeMap.topics.length} 个知识点 · 已上线 {readyCount}
      </p>

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
                    onPlay={onPlay}
                    onRace={onRace}
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
  onPlay,
  onRace,
}: {
  topic: Topic;
  prog?: Prog;
  onPlay: (trackId: string) => void;
  onRace: (trackId: string) => void;
}) {
  const ped = <span className={`ped ped-${topic.pedagogy}`}>{PEDAGOGY_LABEL[topic.pedagogy]}</span>;

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
