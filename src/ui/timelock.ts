// Time-lock guardrail (SPEC §7): after `play_minutes` of active play, force a
// `break_minutes` rest. Pure reducer + predicates here; the React wrapper and
// persistence live in useTimeLock. State persists across reloads so a child
// can't dodge the break by refreshing.
import type { EngineConfig } from '../engine';

export type TimeLockConfig = NonNullable<EngineConfig['time_lock']>;

export interface LockState {
  playedMs: number; // active play accumulated toward the current limit
  lockUntil: number | null; // epoch ms when the break ends, or null
}

export const initialLockState: LockState = { playedMs: 0, lockUntil: null };

export function isLocked(s: LockState, now: number): boolean {
  return s.lockUntil !== null && now < s.lockUntil;
}

/** Advance the lock by `deltaMs` of active play. Returns the next state. */
export function tickLock(
  s: LockState,
  deltaMs: number,
  now: number,
  cfg: TimeLockConfig | undefined,
): LockState {
  if (!cfg || !cfg.enabled) return s;

  if (s.lockUntil !== null) {
    // currently (or just finished) a break
    if (now >= s.lockUntil) return { playedMs: 0, lockUntil: null };
    return s;
  }

  const playedMs = s.playedMs + Math.max(0, deltaMs);
  if (playedMs >= cfg.play_minutes * 60000) {
    return { playedMs, lockUntil: now + cfg.break_minutes * 60000 };
  }
  return { playedMs, lockUntil: null };
}

/** Remaining break time in ms (0 if not locked). */
export function remainingBreakMs(s: LockState, now: number): number {
  if (!isLocked(s, now)) return 0;
  return Math.max(0, (s.lockUntil as number) - now);
}
