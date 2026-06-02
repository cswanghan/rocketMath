// Forced-break screen (SPEC §7). Shown whenever the time lock is active; the
// child cannot return to practice until the break elapses.
interface Props {
  remainingMs: number;
}

function fmt(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function LockScreen({ remainingMs }: Props) {
  return (
    <div className="lock-screen">
      <div className="lock-emoji">🌙</div>
      <h2>休息一下</h2>
      <p className="subtitle">练得很棒！让眼睛和小手歇一歇,等下再来。</p>
      <div className="lock-timer">{fmt(remainingMs)}</div>
    </div>
  );
}
