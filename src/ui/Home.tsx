import { useEffect, useState } from 'react';
import { getEnabledTracks } from '../engine';
import type { StorageAdapter } from '../storage';
import { pack } from './pack';
import { RocketChart } from './RocketChart';

interface Props {
  adapter: StorageAdapter;
  studentId: string;
  onStart: (trackId: string) => void;
}

interface Progress {
  completed: string[];
  current: string;
}

// Track list is driven entirely by getEnabledTracks(pack): flipping a track's
// `enabled` flag in the content pack adds/removes it here, no code change
// (SPEC §9 track-agnostic acceptance).
export function Home({ adapter, studentId, onStart }: Props) {
  const tracks = getEnabledTracks(pack);
  const [progress, setProgress] = useState<Record<string, Progress>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const entries = await Promise.all(
        tracks.map(async (t) => {
          const s = await adapter.getTrackState(studentId, t.trackId);
          return [t.trackId, { completed: s?.completedLevels ?? [], current: s?.currentLevel ?? 'A' }] as const;
        }),
      );
      if (alive) setProgress(Object.fromEntries(entries));
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, studentId]);

  return (
    <div className="home">
      <h1 className="title">🚀 计算流畅度训练</h1>
      <p className="subtitle">选择一个练习</p>
      <div className="track-list">
        {tracks.map((t) => {
          const levels = t.levels.map((l) => l.level);
          const p = progress[t.trackId];
          return (
            <button key={t.trackId} className="track-card" onClick={() => onStart(t.trackId)}>
              <span className="track-name">{t.name}</span>
              <span className="track-meta">
                {t.levels.length} 关 · Level A–{levels[levels.length - 1]}
                {p && p.completed.length > 0 ? ` · 已过 ${p.completed.length} 关` : ''}
              </span>
              <RocketChart levels={levels} completed={p?.completed ?? []} current={p?.current} compact />
            </button>
          );
        })}
        {tracks.length === 0 && <p className="empty">内容包里没有启用的练习。</p>}
      </div>
    </div>
  );
}
