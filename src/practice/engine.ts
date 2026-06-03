// Practice reducer: practiceStep(state, event, ctx) -> { state, action }.
// Untimed mastery loop: shuffle the set, present one problem at a time; a wrong
// answer gives a hint and lets you retry (no penalty); after maxTries the answer
// is revealed. The set completes once every problem has been worked through.
import { checkAnswer } from './check';
import {
  DIFFICULTY_ORDER,
  type PracticeAction,
  type PracticeContext,
  type PracticeEvent,
  type PracticeState,
  type ProblemSet,
} from './types';

export interface PracticeResult {
  state: PracticeState;
  action: PracticeAction;
}

const DEFAULT_MAX_TRIES = 2;

function shuffleInPlace<T>(a: T[], rng: () => number): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Serve problems as "关卡": basic → consolidate → challenge, shuffled within
 *  each tier so the difficulty ramps up across the topic. */
function tieredOrder(set: ProblemSet, rng: () => number): number[] {
  const order: number[] = [];
  for (const tier of DIFFICULTY_ORDER) {
    const idx = set.problems
      .map((p, i) => [p, i] as const)
      .filter(([p]) => (p.difficulty ?? 'consolidate') === tier)
      .map(([, i]) => i);
    order.push(...shuffleInPlace(idx, rng));
  }
  return order;
}

export function practiceInit(set: ProblemSet, rng: () => number): PracticeState {
  return {
    setId: set.id,
    order: tieredOrder(set, rng),
    index: -1,
    tries: 0,
    firstTryCorrect: 0,
    status: 'active',
  };
}

export function practiceStep(
  state: PracticeState,
  event: PracticeEvent,
  ctx: PracticeContext,
): PracticeResult {
  if (event.type === 'NEXT') return advance(state, ctx);

  // ANSWER — must have a presented problem
  const problem = ctx.set.problems[state.order[state.index]];
  const correct = checkAnswer(problem, event.response);
  if (correct) {
    const firstTry = state.tries === 0;
    return {
      state: { ...state, firstTryCorrect: state.firstTryCorrect + (firstTry ? 1 : 0) },
      action: { kind: 'CORRECT', problem, firstTry },
    };
  }

  const tries = state.tries + 1;
  const maxTries = ctx.set.maxTries ?? DEFAULT_MAX_TRIES;
  if (tries >= maxTries) {
    return { state: { ...state, tries }, action: { kind: 'REVEAL', problem } };
  }
  return { state: { ...state, tries }, action: { kind: 'WRONG', problem, tries } };
}

function advance(state: PracticeState, ctx: PracticeContext): PracticeResult {
  const nextIndex = state.index + 1;
  if (nextIndex >= state.order.length) {
    return {
      state: { ...state, status: 'complete' },
      action: { kind: 'SET_COMPLETE', firstTryCorrect: state.firstTryCorrect, total: state.order.length },
    };
  }
  return {
    state: { ...state, index: nextIndex, tries: 0 },
    action: { kind: 'PRESENT', problem: ctx.set.problems[state.order[nextIndex]] },
  };
}
