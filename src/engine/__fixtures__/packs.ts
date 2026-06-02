// Synthetic content packs for engine tests. Kept tiny so mastery thresholds
// can be reached quickly and level-advance / last-level edges are reachable.
// Excluded from coverage (see vitest.config.ts).

import type { ContentPack, EngineConfig, Fact, Track } from '../types';

export function f(id: string, a: number, b: number): Fact {
  return { id, prompt: `${a} × ${b}`, answer: a * b, learningType: 'fact_recall' };
}

export function patternFact(id: string, a: number, b: number): Fact {
  return { id, prompt: `${a} × ${b}`, answer: a * b, learningType: 'pattern' };
}

export const baseEngineConfig: EngineConfig = {
  latency_gate_seconds: 3,
  mastery: {
    take_off: { consecutive_correct_within_gate: 12 },
    orbit: { window_attempts: 30, max_errors: 2 },
    universe: { window_attempts: 30, max_errors: 2 },
  },
  correction_loop: {
    trigger_on: ['wrong_answer', 'timeout'],
    immediate_reteach: true,
    immediate_retest: true,
  },
  interleave_rules: {
    take_off_pool: 'current_level.new_facts',
    orbit_pool: 'current ∪ previous',
    universe_pool: 'A..current',
    recent_miss_weight: 3,
  },
  milestone_races: { duration_seconds: 60, positions_percent: [50, 100] },
  individualized_goal: {
    probe_problem_count: 10,
    latency_multiplier: 2.5,
    min_gate_seconds: 2.0,
    max_gate_seconds: 6.0,
  },
};

export function makePack(tracks: Track[], cfg: EngineConfig = baseEngineConfig): ContentPack {
  return {
    version: 'test',
    grade: 3,
    subject: 'math_fluency',
    engine_config: cfg,
    tracks,
    non_drill_topics: [],
  };
}

/** Two-level track so we can drive A all the way to completion and into B,
 *  and also reach the last-level edge (B has no successor). */
export function twoLevelPack(): ContentPack {
  const A: Track['levels'][number] = {
    level: 'A',
    new_facts: [f('a1', 2, 2), f('a2', 2, 3), f('a3', 2, 4), f('a4', 2, 5)],
  };
  const B: Track['levels'][number] = {
    level: 'B',
    new_facts: [f('b1', 5, 2), f('b2', 5, 3), f('b3', 5, 4), f('b4', 5, 5)],
  };
  const track: Track = { trackId: 'mult_facts', name: 't', enabled: true, levels: [A, B] };
  return makePack([track]);
}

/** Track whose facts are `pattern` type, for correction-copy differentiation. */
export function patternPack(): ContentPack {
  const A: Track['levels'][number] = {
    level: 'A',
    new_facts: [patternFact('p1', 20, 3), patternFact('p2', 30, 4)],
  };
  const track: Track = { trackId: 'round', name: 'r', enabled: true, levels: [A] };
  return makePack([track]);
}
