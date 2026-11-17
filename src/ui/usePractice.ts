// React binding for the untimed Practice engine. Mirrors useGame: latest
// { state, action } in a ref (StrictMode-safe), async-loads the set, and
// persists a PracticeRecord on completion (best first-try accuracy).
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { mulberry32 } from '../engine';
import {
  correctText,
  practiceInit,
  practiceStep,
  responseText,
  xpForCorrect,
  type Difficulty,
  type PracticeAction,
  type PracticeContext,
  type PracticeEvent,
  type Problem,
  type Response,
} from '../practice';
import type { StorageAdapter } from '../storage';
import type { PracticePack } from '../practice';
import { getSetFromPack } from './gradeLoader';
import { track } from '../track';
import { CHECKIN_XP, recordCheckIn } from './streak';

// Correct-but-slower-than-this practice answers are flagged for parent attention.
const SLOW_PRACTICE_MS = 20000;

export type PView =
  | { mode: 'present'; problem: Problem; tries: number }
  | { mode: 'wrong'; problem: Problem; tries: number }
  | { mode: 'retry'; problem: Problem; tries: number }
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
  retry: () => void;
}

function viewOf(action: PracticeAction, tries: number, choiceFeedbackOpen: boolean): PView {
  switch (action.kind) {
    case 'PRESENT':
      return { mode: 'present', problem: action.problem, tries };
    case 'WRONG':
      return { mode: choiceFeedbackOpen ? 'retry' : 'wrong', problem: action.problem, tries: action.tries };
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
  practicePack: PracticePack,
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
  const missedRef = useRef<Set<string>>(new Set()); // problem ids already logged as mistakes
  const choiceFeedbackRef = useRef(false); // MC retries require an explicit acknowledgement.
  const presentedAtRef = useRef(0); // when the current problem was shown

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const set = getSetFromPack(practicePack, setId);
      if (!set) return;
      const prev = await adapter.getPractice(studentId, setId);
      bestRef.current = prev?.bestFirstTry ?? 0;
      const ctx: PracticeContext = { set, rng: mulberry32(seed), now: () => Date.now() };
      const res = practiceStep(practiceInit(set, ctx.rng), { type: 'NEXT' }, ctx);
      if (cancelled) return;
      ctxRef.current = ctx;
      gameRef.current = res;
      choiceFeedbackRef.current = false;
      seqRef.current = 1;
      presentedAtRef.current = ctx.now();
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
      if (!ctx || !game || game.state.status === 'complete') return;
      // Read synchronous state rather than the last React render: rapid taps or
      // Enter+click must not award XP twice, consume retries, or skip a question.
      if (event.type === 'ANSWER') {
        if (choiceFeedbackRef.current || (game.action.kind !== 'PRESENT' && game.action.kind !== 'WRONG')) return;
        if (game.action.problem.type === 'mc' && (event.response.kind !== 'choice' ||
          !game.action.problem.choices?.some(c => event.response.kind === 'choice' && c.id === event.response.choiceId))) return;
      } else if (game.action.kind !== 'CORRECT' && game.action.kind !== 'REVEAL') return;
      const elapsedMs = ctx.now() - presentedAtRef.current; // valid for ANSWER events
      const res = practiceStep(game.state, event, ctx);
      gameRef.current = res;
      choiceFeedbackRef.current = res.action.kind === 'WRONG' && res.action.problem.type === 'mc';
      if (event.type === 'ANSWER') {
        const ci = recordCheckIn(studentId);
        if (ci.firstToday) void adapter.addXp(studentId, CHECKIN_XP);
      }
      if (res.action.kind === 'PRESENT') {
        seqRef.current += 1;
        presentedAtRef.current = ctx.now();
      }
      if (res.action.kind === 'CORRECT') {
        const p = res.action.problem;
        const xp = xpForCorrect(p.difficulty, res.action.firstTry);
        sessionXpRef.current += xp;
        void adapter.addXp(studentId, xp);
        // answered correctly on the first try but slowly -> flag for attention
        if (res.action.firstTry && elapsedMs > SLOW_PRACTICE_MS && !missedRef.current.has(p.id)) {
          missedRef.current.add(p.id);
          void adapter.appendMistake({
            studentId,
            source: 'practice',
            topicId: setId,
            topicTitle: ctx.set.title,
            problemId: p.id,
            prompt: p.prompt,
            difficulty: p.difficulty ?? 'consolidate',
            yourAnswer: correctText(p),
            correctAnswer: correctText(p),
            elapsedMs,
            slow: true,
            ts: ctx.now(),
            corrected: false,
          });
        }
      }
      // log the first wrong attempt of a problem to the 错题本
      if (
        (res.action.kind === 'WRONG' || res.action.kind === 'REVEAL') &&
        event.type === 'ANSWER' &&
        !missedRef.current.has(res.action.problem.id)
      ) {
        missedRef.current.add(res.action.problem.id);
        const p = res.action.problem;
        void adapter.appendMistake({
          studentId,
          source: 'practice',
          topicId: setId,
          topicTitle: ctx.set.title,
          problemId: p.id,
          prompt: p.prompt,
          difficulty: p.difficulty ?? 'consolidate',
          yourAnswer: responseText(p, event.response),
          correctAnswer: correctText(p),
          elapsedMs,
          ts: ctx.now(),
          corrected: false,
        });
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
        track('practice_complete', {
          setId,
          firstTryCorrect: res.action.firstTryCorrect,
          total: res.action.total,
        });
      }
      // 埋点: 每次作答(对/错/揭晓答案)
      if (event.type === 'ANSWER') {
        const k = res.action.kind;
        if (k === 'CORRECT' || k === 'WRONG' || k === 'REVEAL') {
          track('practice_answer', {
            setId,
            result: k.toLowerCase(),
            difficulty: res.action.problem.difficulty ?? 'consolidate',
            firstTry: k === 'CORRECT' ? res.action.firstTry : false,
            ms: elapsedMs,
          });
        }
      }
      force();
    },
    [adapter, studentId, setId],
  );

  const answer = useCallback((response: Response) => dispatch({ type: 'ANSWER', response }), [dispatch]);
  const next = useCallback(() => dispatch({ type: 'NEXT' }), [dispatch]);
  const retry = useCallback(() => {
    const game = gameRef.current;
    if (!choiceFeedbackRef.current || game?.action.kind !== 'WRONG' || game.action.problem.type !== 'mc') return;
    choiceFeedbackRef.current = false;
    force();
  }, []);

  const game = gameRef.current;
  const action = game?.action;
  const tier =
    action && 'problem' in action ? (action.problem.difficulty ?? 'consolidate') : null;
  return {
    ready,
    view: game ? viewOf(game.action, game.state.tries, choiceFeedbackRef.current) : { mode: 'loading' },
    total: ctxRef.current?.set.problems.length ?? 0,
    position: (game?.state.index ?? 0) + 1,
    seq: seqRef.current,
    tier,
    sessionXp: sessionXpRef.current,
    answer,
    next,
    retry,
  };
}
