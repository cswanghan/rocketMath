// Fact selection. MVP strategy (SPEC §5): shuffle within the current pool, but
// give recently-missed facts a higher weight. A hook is left here so a future
// FSRS/SM-2 adaptive scheduler can replace `pickFact` without touching the
// reducer — DO NOT implement spaced-repetition scoring in the MVP.

import type { Fact, FactStat, TrackState } from './types';

export interface SelectContext {
  rng: () => number;
  recentMissWeight: number;
}

function weightOf(stat: FactStat | undefined, recentMissWeight: number): number {
  // Base weight 1; recently-missed (un-redeemed) facts get boosted so they
  // resurface sooner. lastMissAt is cleared on a clean in-flow correct answer.
  let w = 1;
  if (stat?.lastMissAt !== undefined) w += recentMissWeight;
  return w;
}

/** Pick a fact from `pool` using recent-miss-weighted random selection.
 *  When the pool has more than one fact, `excludeId` (usually the fact just
 *  answered) is avoided to prevent back-to-back repeats. */
export function pickFact(
  pool: Fact[],
  state: TrackState,
  ctx: SelectContext,
  excludeId?: string,
): Fact {
  if (pool.length === 0) throw new Error('pickFact: empty pool');
  if (pool.length === 1) return pool[0];

  const candidates =
    excludeId !== undefined ? pool.filter((f) => f.id !== excludeId) : pool;
  const usable = candidates.length > 0 ? candidates : pool;

  const weights = usable.map((f) => weightOf(state.factStats[f.id], ctx.recentMissWeight));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = ctx.rng() * total;
  for (let i = 0; i < usable.length; i++) {
    r -= weights[i];
    if (r < 0) return usable[i];
  }
  return usable[usable.length - 1]; // float-rounding fallback
}
