// Core engine types. This file is the contract pinned down BEFORE the reducer
// (see SPEC.md §5). The engine is pure TypeScript: zero React, zero DOM, zero
// network/LLM. Nothing in src/engine/ may import a browser or fetch API.

export type Phase = 'take_off' | 'orbit' | 'universe';

export type LearningType = 'fact_recall' | 'pattern';

export interface Fact {
  id: string;
  prompt: string;
  answer: number;
  learningType: LearningType;
}

export interface FactStat {
  seen: number;
  correct: number;
  /** Timestamp (ctx.now()) of the most recent miss that has NOT yet been
   *  redeemed by a clean in-flow correct answer. Drives recent-miss weighting
   *  in fact selection; cleared when the fact is later answered correctly. */
  lastMissAt?: number;
}

/** Optional, engine-internal race sub-state. The SPEC §5 TrackState lists the
 *  core fields; race is layered on top because START_RACE / RACE_RESULT flow
 *  through the same reducer. Absent unless a race is in progress. */
export interface RaceState {
  endsAt: number;
  correct: number;
  answered: number;
  durationMs: number;
}

export interface TrackState {
  trackId: string;
  currentLevel: string; // 'A'..'R'
  phase: Phase;
  streak: number; // take_off: consecutive correct within the latency gate
  attempts: number; // orbit/universe: answers counted in the current window
  errors: number; // orbit/universe: misses counted in the current window
  pendingRetest: string | null; // factId awaiting an immediate re-test after a miss
  factStats: Record<string, FactStat>;
  completedLevels: string[]; // feeds the Rocket Chart
  race?: RaceState; // engine-internal; see RaceState
}

export type Event =
  | { type: 'ANSWER'; factId: string; value: number; elapsedMs: number }
  | { type: 'NEXT' } // request the next prompt
  | { type: 'START_RACE'; durationMs: number };

export type Action =
  | { kind: 'PROMPT'; fact: Fact }
  | { kind: 'CORRECTION'; fact: Fact } // re-teach: show + speak the answer
  | { kind: 'PHASE_COMPLETE'; phase: Phase }
  | { kind: 'LEVEL_COMPLETE'; level: string }
  | { kind: 'RACE_RESULT'; correctPerMin: number };

// ----- content pack ---------------------------------------------------------

export interface Level {
  level: string; // 'A'..
  new_facts: Fact[];
}

export interface Track {
  trackId: string;
  name: string;
  enabled: boolean;
  levels: Level[];
}

export interface EngineConfig {
  latency_gate_seconds: number;
  mastery: {
    take_off: { consecutive_correct_within_gate: number };
    orbit: { window_attempts: number; max_errors: number };
    universe: { window_attempts: number; max_errors: number };
  };
  correction_loop: {
    trigger_on: string[];
    immediate_reteach: boolean;
    immediate_retest: boolean;
  };
  interleave_rules: {
    take_off_pool: string;
    orbit_pool: string;
    universe_pool: string;
    recent_miss_weight: number;
  };
  milestone_races: {
    duration_seconds: number;
    positions_percent: number[];
  };
  individualized_goal: {
    probe_problem_count: number;
    latency_multiplier: number;
    min_gate_seconds: number;
    max_gate_seconds: number;
  };
}

export interface ContentPack {
  version: string;
  grade: number;
  subject: string;
  engine_config: EngineConfig;
  tracks: Track[];
  non_drill_topics: string[];
}

export interface EngineContext {
  pack: ContentPack;
  latencyGateMs: number; // individualized gate (ms)
  now: () => number;
  rng: () => number; // seedable, in [0, 1)
}
