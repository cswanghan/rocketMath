// Rocket Chart: the A–R progress strip. Completed levels are filled, the
// current level pulses. Purely presentational — fed level letters + progress.
interface Props {
  levels: string[];
  completed: string[];
  current?: string;
  compact?: boolean;
}

export function RocketChart({ levels, completed, current, compact }: Props) {
  const done = new Set(completed);
  return (
    <div className={`chart ${compact ? 'chart-compact' : ''}`}>
      {levels.map((lvl) => {
        const state = done.has(lvl) ? 'done' : lvl === current ? 'current' : 'todo';
        return (
          <div key={lvl} className={`cell cell-${state}`} title={`Level ${lvl}`}>
            {state === 'done' ? '★' : lvl}
          </div>
        );
      })}
    </div>
  );
}
