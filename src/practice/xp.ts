// Experience points & levels. Pure, deterministic — shared by the fluency and
// practice hooks. XP is awarded per correct answer (scaled by difficulty and a
// first-try bonus); cumulative XP maps to a level via a triangular curve.
import type { Difficulty } from './types';

const BASE_XP: Record<Difficulty, number> = {
  basic: 5,
  consolidate: 10,
  challenge: 20,
};

/** XP for a correct Practice answer. First-try doubles it. */
export function xpForCorrect(difficulty: Difficulty | undefined, firstTry: boolean): number {
  const base = BASE_XP[difficulty ?? 'consolidate'];
  return firstTry ? base * 2 : base;
}

/** XP for a correct fluency answer (timed drill — no difficulty tiers). */
export const FLUENCY_XP = 8;

/** Cumulative XP required to REACH level n (n >= 1). Triangular curve:
 *  L1=0, L2=100, L3=300, L4=600, L5=1000, ... (each level needs +100·(n-1)). */
export function xpToReachLevel(level: number): number {
  if (level <= 1) return 0;
  return (100 * (level - 1) * level) / 2;
}

export interface LevelInfo {
  level: number;
  /** XP accumulated within the current level. */
  intoLevel: number;
  /** XP span of the current level (intoLevel / span = progress). */
  span: number;
  /** XP remaining to the next level. */
  toNext: number;
}

export function levelFromXp(xp: number): LevelInfo {
  const x = Math.max(0, Math.floor(xp));
  let level = 1;
  while (xpToReachLevel(level + 1) <= x) level++;
  const start = xpToReachLevel(level);
  const end = xpToReachLevel(level + 1);
  return {
    level,
    intoLevel: x - start,
    span: end - start,
    toNext: end - x,
  };
}
