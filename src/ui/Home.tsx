import { getEnabledTracks } from '../engine';
import { pack } from './pack';

interface Props {
  onStart: (trackId: string) => void;
}

// Track list is driven entirely by getEnabledTracks(pack): flipping a track's
// `enabled` flag in the content pack adds/removes it here, no code change
// (SPEC §9 track-agnostic acceptance). Rocket Chart lands in M4.
export function Home({ onStart }: Props) {
  const tracks = getEnabledTracks(pack);
  return (
    <div className="home">
      <h1 className="title">🚀 计算流畅度训练</h1>
      <p className="subtitle">选择一个练习</p>
      <div className="track-list">
        {tracks.map((t) => (
          <button key={t.trackId} className="track-card" onClick={() => onStart(t.trackId)}>
            <span className="track-name">{t.name}</span>
            <span className="track-meta">{t.levels.length} 关 · Level A–{t.levels[t.levels.length - 1].level}</span>
          </button>
        ))}
        {tracks.length === 0 && <p className="empty">内容包里没有启用的练习。</p>}
      </div>
    </div>
  );
}
