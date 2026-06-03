// React binding for the untimed Practice engine. Mirrors useGame: latest
// { state, action } in a ref (StrictMode-safe), async-loads the set, and
// persists a PracticeRecord on completion (best first-try accuracy).
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { mulberry32 } from '../engine';
import {
  practiceInit,
  practiceStep,
  xpForCorrect,
  type Difficulty,
  type PracticeAction,
  type PracticeContext,
  type PracticeEvent,
  type Problem,
  type Response,
} from '../practice';
import type { StorageAdapter } from '../storage';
import { getSet } from './practicePack';

export type PView =
  | { mode: 'present'; problem: Problem; tries: number }
  | { mode: 'wrong'; problem: Problem; tries: number }
  | { mode: 'correct'; problem: Problem; firstTry: boolean }
  | { mode: 'reveal'; problem: Problem }
  | { mode: 'complete'; firstTryCorrect: number; total: number }
  | { mode: 'loading' };

export interface PracticeApi {
  ready: boolean;
  view: PView;
  total: number;
  position: number; // 1-based index of the current problem
  seq: number;
  tier: Difficulty | null; // current 关卡 (basic/consolidate/challenge)
  sessionXp: number; // XP earned this session
  answer: (response: Response) => void;
  next: () => void;
}

function viewOf(action: PracticeAction, tries: number): PView {
  switch (action.kind) {
    case 'PRESENT':
      return { mode: 'present', problem: action.problem, tries };
    case 'WRONG':
      return { mode: 'wrong', problem: action.problem, tries: action.tries };
    case 'CORRECT':
      return { mode: 'correct', problem: action.problem, firstTry: action.firstTry };
    case 'REVEAL':
      return { mode: 'reveal', problem: action.problem };
    case 'SET_COMPLETE':
      return { mode: 'complete', firstTryCorrect: action.firstTryCorrect, total: action.total };
  }
}

export function usePractice(
  setId: string,
  adapter: StorageAdapter,
  studentId: string,
  seed: number,
): PracticeApi {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [ready, setReady] = useState(false);
  const ctxRef = useRef<PracticeContext | null>(null);
  const gameRef = useRef<{ state: ReturnType<typeof practiceInit>; action: PracticeAction } | null>(null);
  const bestRef = useRef(0);
  const seqRef = useRef(0);
  const sessionXpRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const set = getSet(setId);
      if (!set) return;
      const prev = await adapter.getPractice(studentId, setId);
      bestRef.current = prev?.bestFirstTry ?? 0;
      const ctx: PracticeContext = { set, rng: mulberry32(seed), now: () => Date.now() };
      const res = practiceStep(practiceInit(set, ctx.rng), { type: 'NEXT' }, ctx);
      if (cancelled) return;
      ctxRef.current = ctx;
      gameRef.current = res;
      seqRef.current = 1;
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [setId, adapter, studentId, seed]);

  const dispatch = useCallback(
    (event: PracticeEvent) => {
      const ctx = ctxRef.current;
      const game = gameRef.current;
      if (!ctx || !game) return;
      const res = practiceStep(game.state, event, ctx);
      gameRef.current = res;
      if (res.action.kind === 'PRESENT') seqRef.current += 1;
      if (res.action.kind === 'CORRECT') {
        const xp = xpForCorrect(res.action.problem.difficulty, res.action.firstTry);
        sessionXpRef.current += xp;
        void adapter.addXp(studentId, xp);
      }
      if (res.action.kind === 'SET_COMPLETE') {
        const best = Math.max(bestRef.current, res.action.firstTryCorrect);
        bestRef.current = best;
        void adapter.putPractice({
          studentId,
          setId,
          completed: true,
          bestFirstTry: best,
          total: res.action.total,
          updatedAt: ctx.now(),
        });
      }
      force();
    },
    [adapter, studentId, setId],
  );

  const answer = useCallback((response: Response) => dispatch({ type: 'ANSWER', response }), [dispatch]);
  const next = useCallback(() => dispatch({ type: 'NEXT' }), [dispatch]);

  const game = gameRef.current;
  const action = game?.action;
  const tier =
    action && 'problem' in action ? (action.problem.difficulty ?? 'consolidate') : null;
  return {
    ready,
    view: game ? viewOf(game.action, game.state.tries) : { mode: 'loading' },
    total: ctxRef.current?.set.problems.length ?? 0,
    position: (game?.state.index ?? 0) + 1,
    seq: seqRef.current,
    tier,
    sessionXp: sessionXpRef.current,
    answer,
    next,
  };
}
