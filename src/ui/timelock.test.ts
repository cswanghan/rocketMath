import { describe, expect, it } from 'vitest';
import {
  initialLockState,
  isLocked,
  remainingBreakMs,
  tickLock,
  type TimeLockConfig,
} from './timelock';

const cfg: TimeLockConfig = { enabled: true, play_minutes: 15, break_minutes: 20 };

describe('time lock', () => {
  it('accumulates play time without locking below the limit', () => {
    let s = initialLockState;
    s = tickLock(s, 10 * 60000, 1000, cfg); // 10 min
    expect(isLocked(s, 1000)).toBe(false);
    expect(s.playedMs).toBe(10 * 60000);
  });

  it('locks once play crosses play_minutes and sets a break window', () => {
    const now = 1_000_000;
    let s = tickLock(initialLockState, 14 * 60000, now, cfg);
    expect(isLocked(s, now)).toBe(false);
    s = tickLock(s, 2 * 60000, now, cfg); // crosses 15 min
    expect(isLocked(s, now)).toBe(true);
    expect(remainingBreakMs(s, now)).toBe(20 * 60000);
  });

  it('stays locked during the break and ignores further play ticks', () => {
    const now = 1_000_000;
    let s = tickLock(initialLockState, 16 * 60000, now, cfg);
    expect(isLocked(s, now)).toBe(true);
    const lockUntil = s.lockUntil;
    s = tickLock(s, 5 * 60000, now + 60000, cfg); // try to keep playing
    expect(s.lockUntil).toBe(lockUntil); // unchanged
    expect(isLocked(s, now + 5 * 60000)).toBe(true);
  });

  it('unlocks and resets after the break elapses', () => {
    const now = 1_000_000;
    let s = tickLock(initialLockState, 16 * 60000, now, cfg);
    const after = (s.lockUntil as number) + 1;
    s = tickLock(s, 0, after, cfg);
    expect(isLocked(s, after)).toBe(false);
    expect(s.playedMs).toBe(0);
  });

  it('is a no-op when disabled', () => {
    const off: TimeLockConfig = { ...cfg, enabled: false };
    const s = tickLock(initialLockState, 100 * 60000, 1, off);
    expect(s).toBe(initialLockState);
    expect(isLocked(s, 1)).toBe(false);
  });

  it('remainingBreakMs is 0 when not locked', () => {
    expect(remainingBreakMs(initialLockState, 1)).toBe(0);
  });
});
