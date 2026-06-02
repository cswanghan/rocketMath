// The core reducer: step(state, event, ctx) -> { state, action }.
//
// Pure, deterministic, zero side effects. This is the foundation (SPEC §5, §8
// M1) — every state-machine rule below maps to a test in engine.test.ts.
//
// Flow contract (how the UI drives it):
//   - NEXT      -> PROMPT (next question for the current phase / pending retest)
//   - ANSWER    -> on a clean hit: PROMPT (next) | PHASE_COMPLETE | LEVEL_COMPLETE
//                  on a miss:      CORRECTION (re-teach + immediate retest)
//   - START_RACE-> PROMPT (first race question); subsequent ANSWERs tally until
//                  ctx.now() passes the race end, then RACE_RESULT.

import {
  factById,
  getTrack,
  learnedPool,
  nextLevel,
  poolForPhase,
} from './contentPack';
import { pickFact } from './select';
import type {
  Action,
  EngineContext,
  Event,
  Fact,
  FactStat,
  Phase,
  TrackState,
} from './types';

export interface StepResult {
  state: TrackState;
  action: Action;
}

export function initTrackState(trackId: string, startLevel = 'A'): TrackState {
  return {
    trackId,
    currentLevel: startLevel,
    phase: 'take_off',
    streak: 0,
    attempts: 0,
    errors: 0,
    pendingRetest: null,
    factStats: {},
    completedLevels: [],
  };
}

// ----- stat helpers (immutable) ---------------------------------------------

interface StatUpdate {
  correct: boolean;
  missAt?: number; // set lastMissAt to this
  clearMiss?: boolean; // drop lastMissAt (redeemed by a clean answer)
}

function recordStat(
  stats: Record<string, FactStat>,
  id: string,
  u: StatUpdate,
): Record<string, FactStat> {
  const prev = stats[id] ?? { seen: 0, correct: 0 };
  const next: FactStat = {
    seen: prev.seen + 1,
    correct: prev.correct + (u.correct ? 1 : 0),
  };
  if (u.missAt !== undefined) {
    next.lastMissAt = u.missAt;
  } else if (!u.clearMiss && prev.lastMissAt !== undefined) {
    next.lastMissAt = prev.lastMissAt;
  }
  return { ...stats, [id]: next };
}

function isHit(fact: Fact, value: number, elapsedMs: number, gateMs: number): boolean {
  // A hit requires both correctness AND being within the latency gate.
  // Wrong answer OR timeout (elapsedMs > gate) => miss.
  return value === fact.answer && elapsedMs <= gateMs;
}

// ----- public reducer -------------------------------------------------------

export function step(state: TrackState, event: Event, ctx: EngineContext): StepResult {
  switch (event.type) {
    case 'START_RACE':
      return startRace(state, event.durationMs, ctx);
    case 'NEXT':
      return handleNext(state, ctx);
    case 'ANSWER':
      return handleAnswer(state, event, ctx);
  }
}

// ----- NEXT -----------------------------------------------------------------

function handleNext(state: TrackState, ctx: EngineContext): StepResult {
  const track = getTrack(ctx.pack, state.trackId);

  if (state.race) {
    if (ctx.now() >= state.race.endsAt) return finishRace(state);
    const pool = learnedPool(track, state.currentLevel);
    return {
      state,
      action: { kind: 'PROMPT', fact: pickFact(pool, state, selCtx(ctx)) },
    };
  }

  if (state.pendingRetest) {
    const fact = factById(track, state.pendingRetest)!;
    return { state, action: { kind: 'PROMPT', fact } };
  }

  const pool = poolForPhase(track, state.currentLevel, state.phase);
  return { state, action: { kind: 'PROMPT', fact: pickFact(pool, state, selCtx(ctx)) } };
}

function selCtx(ctx: EngineContext) {
  return {
    rng: ctx.rng,
    recentMissWeight: ctx.pack.engine_config.interleave_rules.recent_miss_weight,
  };
}

// ----- ANSWER ---------------------------------------------------------------

function handleAnswer(
  state: TrackState,
  event: Extract<Event, { type: 'ANSWER' }>,
  ctx: EngineContext,
): StepResult {
  if (state.race) return handleRaceAnswer(state, event, ctx);

  const track = getTrack(ctx.pack, state.trackId);
  const gate = ctx.latencyGateMs;

  // --- correction loop: an immediate retest is pending ---------------------
  if (state.pendingRetest) {
    const fact = factById(track, state.pendingRetest)!;
    const hit = isHit(fact, event.value, event.elapsedMs, gate);
    if (hit) {
      // Redeemed. Does NOT count toward streak / attempts / errors.
      const factStats = recordStat(state.factStats, fact.id, { correct: true, clearMiss: true });
      const nextState: TrackState = { ...state, factStats, pendingRetest: null };
      const pool = poolForPhase(track, nextState.currentLevel, nextState.phase);
      return {
        state: nextState,
        action: { kind: 'PROMPT', fact: pickFact(pool, nextState, selCtx(ctx), fact.id) },
      };
    }
    // Still missed: re-teach again, keep the retest pending.
    const factStats = recordStat(state.factStats, fact.id, { correct: false, missAt: ctx.now() });
    return { state: { ...state, factStats }, action: { kind: 'CORRECTION', fact } };
  }

  // --- normal answer -------------------------------------------------------
  const fact = factById(track, event.factId)!;
  const hit = isHit(fact, event.value, event.elapsedMs, gate);

  if (!hit) return registerMiss(state, fact, ctx);
  return registerHit(state, fact, track, ctx);
}

function registerMiss(state: TrackState, fact: Fact, ctx: EngineContext): StepResult {
  const factStats = recordStat(state.factStats, fact.id, { correct: false, missAt: ctx.now() });
  const cfg = ctx.pack.engine_config.mastery;

  let next: TrackState = { ...state, factStats, pendingRetest: fact.id };

  if (state.phase === 'take_off') {
    next.streak = 0; // consecutive-correct resets on a miss
  } else {
    // orbit / universe: the miss counts toward the window
    const max = cfg[state.phase].max_errors;
    let attempts = state.attempts + 1;
    let errors = state.errors + 1;
    if (errors > max) {
      // failed this window — restart the test
      attempts = 0;
      errors = 0;
    }
    next.attempts = attempts;
    next.errors = errors;
  }
  return { state: next, action: { kind: 'CORRECTION', fact } };
}

function registerHit(
  state: TrackState,
  fact: Fact,
  track: ReturnType<typeof getTrack>,
  ctx: EngineContext,
): StepResult {
  const factStats = recordStat(state.factStats, fact.id, { correct: true, clearMiss: true });
  const cfg = ctx.pack.engine_config.mastery;

  if (state.phase === 'take_off') {
    const streak = state.streak + 1;
    if (streak >= cfg.take_off.consecutive_correct_within_gate) {
      // Take-Off mastered -> advance to Orbit.
      const next: TrackState = {
        ...state,
        factStats,
        phase: 'orbit',
        streak: 0,
        attempts: 0,
        errors: 0,
      };
      return { state: next, action: { kind: 'PHASE_COMPLETE', phase: 'take_off' } };
    }
    const next: TrackState = { ...state, factStats, streak };
    return promptNext(next, fact.id, ctx);
  }

  // orbit / universe
  const phase = state.phase as Exclude<Phase, 'take_off'>;
  const window = cfg[phase].window_attempts;
  const max = cfg[phase].max_errors;
  const attempts = state.attempts + 1;

  if (attempts >= window && state.errors <= max) {
    if (phase === 'orbit') {
      const next: TrackState = {
        ...state,
        factStats,
        phase: 'universe',
        attempts: 0,
        errors: 0,
      };
      return { state: next, action: { kind: 'PHASE_COMPLETE', phase: 'orbit' } };
    }
    // universe mastered -> level complete
    return completeLevel({ ...state, factStats }, track, ctx);
  }

  const next: TrackState = { ...state, factStats, attempts };
  return promptNext(next, fact.id, ctx);
}

function completeLevel(
  state: TrackState,
  track: ReturnType<typeof getTrack>,
  ctx: EngineContext,
): StepResult {
  const finished = state.currentLevel;
  const completedLevels = state.completedLevels.includes(finished)
    ? state.completedLevels
    : [...state.completedLevels, finished];
  const upcoming = nextLevel(track, finished);

  let next: TrackState;
  if (upcoming) {
    next = {
      ...state,
      completedLevels,
      currentLevel: upcoming,
      phase: 'take_off',
      streak: 0,
      attempts: 0,
      errors: 0,
    };
  } else {
    // last level done — stay put; the whole track is mastered.
    next = { ...state, completedLevels, attempts: 0, errors: 0 };
  }
  void ctx;
  return { state: next, action: { kind: 'LEVEL_COMPLETE', level: finished } };
}

function promptNext(state: TrackState, excludeId: string, ctx: EngineContext): StepResult {
  const track = getTrack(ctx.pack, state.trackId);
  const pool = poolForPhase(track, state.currentLevel, state.phase);
  return {
    state,
    action: { kind: 'PROMPT', fact: pickFact(pool, state, selCtx(ctx), excludeId) },
  };
}

// ----- RACE -----------------------------------------------------------------

function startRace(state: TrackState, durationMs: number, ctx: EngineContext): StepResult {
  const track = getTrack(ctx.pack, state.trackId);
  const race = { endsAt: ctx.now() + durationMs, correct: 0, answered: 0, durationMs };
  const next: TrackState = { ...state, race };
  const pool = learnedPool(track, state.currentLevel);
  return { state: next, action: { kind: 'PROMPT', fact: pickFact(pool, next, selCtx(ctx)) } };
}

function handleRaceAnswer(
  state: TrackState,
  event: Extract<Event, { type: 'ANSWER' }>,
  ctx: EngineContext,
): StepResult {
  const race = state.race!;
  if (ctx.now() >= race.endsAt) return finishRace(state);

  const track = getTrack(ctx.pack, state.trackId);
  const fact = factById(track, event.factId)!;
  const correct = event.value === fact.answer; // race scores correctness only
  const factStats = recordStat(state.factStats, fact.id, { correct });
  const nextRace = {
    ...race,
    answered: race.answered + 1,
    correct: race.correct + (correct ? 1 : 0),
  };
  const next: TrackState = { ...state, factStats, race: nextRace };

  if (ctx.now() >= nextRace.endsAt) return finishRace(next);
  const pool = learnedPool(track, next.currentLevel);
  return {
    state: next,
    action: { kind: 'PROMPT', fact: pickFact(pool, next, selCtx(ctx), fact.id) },
  };
}

function finishRace(state: TrackState): StepResult {
  const race = state.race!;
  const minutes = race.durationMs / 60000;
  const correctPerMin = minutes > 0 ? race.correct / minutes : 0;
  const { race: _drop, ...rest } = state;
  void _drop;
  return { state: rest, action: { kind: 'RACE_RESULT', correctPerMin } };
}
