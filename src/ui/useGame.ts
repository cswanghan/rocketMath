// React binding for the pure engine + persistence.
//
// - Holds the latest { state, action } in a ref so StrictMode's double-render
//   can't double-`step()` and corrupt the seedable RNG.
// - Restores the saved snapshot on mount (refresh-restore, SPEC §9) and, after
//   every step, persists the snapshot + appends to the append-only event log.
//
// The engine stays pure: this hook injects now()/rng() and measures elapsedMs.

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
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
import { classifyOutcome, type StorageAdapter } from '../storage';
import { pack } from './pack';

export type View =
  | { mode: 'prompt'; fact: Fact; isRetest: boolean }
  | { mode: 'correction'; fact: Fact }
  | { mode: 'phase_done'; phase: TrackState['phase'] }
  | { mode: 'level_done'; level: string }
  | { mode: 'race_result'; correctPerMin: number }
  | { mode: 'loading' };

export interface GameApi {
  ready: boolean;
  state: TrackState | null;
  view: View;
  latencyGateMs: number;
  promptSeq: number;
  submit: (value: number) => void;
  timeout: () => void;
  next: () => void;
  startRace: (durationMs: number) => void;
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
      return { mode: 'race_result', correctPerMin: action.correctPerMin };
  }
}

export function useGame(
  trackId: string,
  adapter: StorageAdapter,
  studentId: string,
  seed: number,
  gateMsOverride?: number,
): GameApi {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [ready, setReady] = useState(false);

  const ctxRef = useRef<EngineContext | null>(null);
  const gameRef = useRef<{ state: TrackState; action: Action } | null>(null);
  const startRef = useRef<number>(0);
  const promptSeqRef = useRef<number>(0);

  // async restore on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      getTrack(pack, trackId); // throws early on a bad trackId
      const student = await adapter.getStudent(studentId);
      const gate =
        gateMsOverride ?? student?.latencyGateMs ?? pack.engine_config.latency_gate_seconds * 1000;
      const ctx: EngineContext = {
        pack,
        latencyGateMs: gate,
        now: () => Date.now(),
        rng: mulberry32(seed),
      };
      const saved = await adapter.getTrackState(studentId, trackId);
      const res = step(saved ?? initTrackState(trackId), { type: 'NEXT' }, ctx);
      if (cancelled) return;
      ctxRef.current = ctx;
      gameRef.current = res;
      startRef.current = ctx.now();
      promptSeqRef.current = 1;
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [trackId, adapter, studentId, seed, gateMsOverride]);

  const dispatch = useCallback(
    (event: Event) => {
      const ctx = ctxRef.current;
      const game = gameRef.current;
      if (!ctx || !game) return;
      const prev = game.state;
      const res = step(prev, event, ctx);
      gameRef.current = res;
      if (res.action.kind === 'PROMPT') {
        startRef.current = ctx.now();
        promptSeqRef.current += 1;
      }

      // --- persist (fire-and-forget) ---
      void adapter.putTrackState(studentId, trackId, res.state);
      if (event.type === 'ANSWER') {
        void adapter.appendEvent({
          studentId,
          trackId,
          ts: ctx.now(),
          level: prev.currentLevel,
          phase: prev.phase,
          factId: event.factId,
          value: event.value,
          elapsedMs: event.elapsedMs,
          outcome: classifyOutcome(prev, res.action),
        });
      }
      if (res.action.kind === 'RACE_RESULT') {
        void adapter.putRaceResult({
          studentId,
          trackId,
          level: prev.currentLevel,
          correctPerMin: res.action.correctPerMin,
          durationMs: prev.race?.durationMs ?? 0,
          ts: ctx.now(),
        });
      }
      force();
    },
    [adapter, studentId, trackId],
  );

  const submit = useCallback(
    (value: number) => {
      const action = gameRef.current?.action;
      if (!action) return;
      const factId = action.kind === 'PROMPT' || action.kind === 'CORRECTION' ? action.fact.id : '';
      const elapsedMs = ctxRef.current!.now() - startRef.current;
      dispatch({ type: 'ANSWER', factId, value, elapsedMs });
    },
    [dispatch],
  );

  const timeout = useCallback(() => {
    const action = gameRef.current?.action;
    if (action?.kind !== 'PROMPT') return;
    dispatch({
      type: 'ANSWER',
      factId: action.fact.id,
      value: Number.NaN,
      elapsedMs: ctxRef.current!.latencyGateMs + 1,
    });
  }, [dispatch]);

  const next = useCallback(() => dispatch({ type: 'NEXT' }), [dispatch]);
  const startRace = useCallback((durationMs: number) => dispatch({ type: 'START_RACE', durationMs }), [dispatch]);

  const game = gameRef.current;
  return {
    ready,
    state: game?.state ?? null,
    view: game ? viewOf(game.action, game.state.pendingRetest) : { mode: 'loading' },
    latencyGateMs: ctxRef.current?.latencyGateMs ?? pack.engine_config.latency_gate_seconds * 1000,
    promptSeq: promptSeqRef.current,
    submit,
    timeout,
    next,
    startRace,
  };
}
