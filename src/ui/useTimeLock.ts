// React wrapper around the pure time-lock reducer. Ticks once a second,
// accumulating play time only while `active`, and persists to localStorage so
// the break survives a refresh.
import { useEffect, useState } from 'react';
import type { EngineConfig } from '../engine';
import { initialLockState, isLocked, remainingBreakMs, tickLock, type LockState } from './timelock';

const LS_KEY = 'rm.timelock';

function load(): LockState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as LockState;
  } catch {
    /* ignore */
  }
  return initialLockState;
}

function save(s: LockState): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function useTimeLock(active: boolean, engineConfig?: EngineConfig): { locked: boolean; remainingMs: number } {
  const cfg = engineConfig?.time_lock ?? { enabled: true, play_minutes: 15, break_minutes: 20 };
  const [state, setState] = useState<LockState>(load);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const iv = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      setState((prev) => {
        const next = tickLock(prev, active ? 1000 : 0, t, cfg);
        if (next !== prev) save(next);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(iv);
  }, [active, cfg]);

  return { locked: isLocked(state, now), remainingMs: remainingBreakMs(state, now) };
}
