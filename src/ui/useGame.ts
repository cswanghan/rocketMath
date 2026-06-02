// React binding for the pure engine. Holds the latest { state, action } in a
// ref (so React StrictMode's double-render can't double-`step()` and corrupt
// the seedable RNG), and exposes typed dispatch + a derived "view".
//
// The engine stays pure: this hook injects now()/rng() and measures elapsedMs
// per prompt. The latency gate here is the configured default (3s); the
// individualized probe lands in M5.

import { useCallback, useReducer, useRef } from 'react';
import {
  getTrack,
  initTrackState,
  mulberry32,
  step,
  type Action,
  type EngineContext,
  type Event,
  type Fact,
  type TrackState,
} from '../engine';
import { pack } from './pack';

export type View =
  | { mode: 'prompt'; fact: Fact; isRetest: boolean }
  | { mode: 'correction'; fact: Fact }
  | { mode: 'phase_done'; phase: TrackState['phase'] }
  | { mode: 'level_done'; level: string }
  | { mode: 'idle' };

export interface GameApi {
  state: TrackState;
  view: View;
  latencyGateMs: number;
  /** Monotonic id bumped on every new prompt — use to key the countdown ring
   *  so it restarts even when the same fact is re-prompted (retest). */
  promptSeq: number;
  /** Submit an answer for the current prompt. elapsedMs is measured here. */
  submit: (value: number) => void;
  /** Fire a timeout miss for the current prompt (ring ran out). */
  timeout: () => void;
  /** Advance past a correction / celebration to the next prompt. */
  next: () => void;
}

function viewOf(action: Action, pendingRetest: string | null): View {
  switch (action.kind) {
    case 'PROMPT':
      return { mode: 'prompt', fact: action.fact, isRetest: pendingRetest === action.fact.id };
    case 'CORRECTION':
      return { mode: 'correction', fact: action.fact };
    case 'PHASE_COMPLETE':
      return { mode: 'phase_done', phase: action.phase };
    case 'LEVEL_COMPLETE':
      return { mode: 'level_done', level: action.level };
    case 'RACE_RESULT':
      return { mode: 'idle' }; // races arrive in M5
  }
}

export function useGame(trackId: string, seed: number): GameApi {
  const [, force] = useReducer((x: number) => x + 1, 0);

  // ctx + game live in refs: stable across renders, never double-applied.
  const ctxRef = useRef<EngineContext | null>(null);
  const gameRef = useRef<{ state: TrackState; action: Action } | null>(null);
  const startRef = useRef<number>(0);
  const promptSeqRef = useRef<number>(0);

  if (ctxRef.current === null) {
    const latencyGateMs = pack.engine_config.latency_gate_seconds * 1000;
    ctxRef.current = {
      pack,
      latencyGateMs,
      now: () => Date.now(),
      rng: mulberry32(seed),
    };
    // sanity: throws early if trackId is wrong
    getTrack(pack, trackId);
    const init = step(initTrackState(trackId), { type: 'NEXT' }, ctxRef.current);
    gameRef.current = init;
    startRef.current = ctxRef.current.now();
    if (init.action.kind === 'PROMPT') promptSeqRef.current = 1;
  }

  const dispatch = useCallback((event: Event) => {
    const ctx = ctxRef.current!;
    const cur = gameRef.current!.state;
    const res = step(cur, event, ctx);
    gameRef.current = res;
    if (res.action.kind === 'PROMPT') {
      startRef.current = ctx.now();
      promptSeqRef.current += 1;
    }
    force();
  }, []);

  const submit = useCallback(
    (value: number) => {
      const game = gameRef.current!;
      const action = game.action;
      const factId =
        action.kind === 'PROMPT' || action.kind === 'CORRECTION' ? action.fact.id : '';
      const elapsedMs = ctxRef.current!.now() - startRef.current;
      dispatch({ type: 'ANSWER', factId, value, elapsedMs });
    },
    [dispatch],
  );

  const timeout = useCallback(() => {
    const action = gameRef.current!.action;
    if (action.kind !== 'PROMPT') return;
    const ctx = ctxRef.current!;
    // value that can never match; elapsed past the gate => miss
    dispatch({ type: 'ANSWER', factId: action.fact.id, value: Number.NaN, elapsedMs: ctx.latencyGateMs + 1 });
  }, [dispatch]);

  const next = useCallback(() => dispatch({ type: 'NEXT' }), [dispatch]);

  const game = gameRef.current!;
  return {
    state: game.state,
    view: viewOf(game.action, game.state.pendingRetest),
    latencyGateMs: ctxRef.current!.latencyGateMs,
    promptSeq: promptSeqRef.current,
    submit,
    timeout,
    next,
  };
}
