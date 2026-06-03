import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../engine';
import { checkAnswer } from './check';
import { practiceInit, practiceStep } from './engine';
import type { Difficulty, PracticeContext, Problem, ProblemSet, Response } from './types';
import { FLUENCY_XP, levelFromXp, xpForCorrect, xpToReachLevel } from './xp';

const mc: Problem = {
  id: 'q1',
  type: 'mc',
  prompt: '哪个最大?',
  choices: [
    { id: 'a', label: '1/2', correct: false },
    { id: 'b', label: '1/3', correct: false },
    { id: 'c', label: '1', correct: true },
  ],
};
const fill: Problem = { id: 'q2', type: 'fill', prompt: '2 + 3', answer: 5, hint: '从个位加', explanation: '=5' };
const fillStr: Problem = { id: 'q3', type: 'fill', prompt: '一半写成分数', answer: '1/2' };
const steps: Problem = {
  id: 'q4',
  type: 'steps',
  prompt: '47 ÷ 5 = ( ) … ( )',
  fields: [
    { id: 'q', label: '商', answer: 9 },
    { id: 'r', label: '余数', answer: 2 },
  ],
};

function setOf(problems: Problem[], maxTries = 2): ProblemSet {
  return { id: 's', title: 't', pedagogy: 'procedure', maxTries, problems };
}
function ctxOf(set: ProblemSet): PracticeContext {
  return { set, rng: mulberry32(1), now: () => 1000 };
}

describe('checkAnswer', () => {
  it('mc: only the correct choice passes', () => {
    expect(checkAnswer(mc, { kind: 'choice', choiceId: 'c' })).toBe(true);
    expect(checkAnswer(mc, { kind: 'choice', choiceId: 'a' })).toBe(false);
  });
  it('fill numeric: tolerant of whitespace, strict on value', () => {
    expect(checkAnswer(fill, { kind: 'value', value: ' 5 ' })).toBe(true);
    expect(checkAnswer(fill, { kind: 'value', value: '6' })).toBe(false);
    expect(checkAnswer(fill, { kind: 'value', value: 'x' })).toBe(false);
  });
  it('fill string: trimmed exact match', () => {
    expect(checkAnswer(fillStr, { kind: 'value', value: '1/2' })).toBe(true);
    expect(checkAnswer(fillStr, { kind: 'value', value: '2/4' })).toBe(false);
  });
  it('steps: every field must match', () => {
    expect(checkAnswer(steps, { kind: 'fields', values: { q: '9', r: '2' } })).toBe(true);
    expect(checkAnswer(steps, { kind: 'fields', values: { q: '9', r: '3' } })).toBe(false);
    expect(checkAnswer(steps, { kind: 'fields', values: { q: '9' } })).toBe(false);
  });
  it('mismatched response kind fails closed', () => {
    expect(checkAnswer(fill, { kind: 'choice', choiceId: 'a' } as Response)).toBe(false);
    expect(checkAnswer(mc, { kind: 'value', value: 'c' } as Response)).toBe(false);
  });
});

describe('practice loop', () => {
  it('init shuffles deterministically and starts before the first problem', () => {
    const set = setOf([fill, steps, mc]);
    const a = practiceInit(set, mulberry32(7));
    const b = practiceInit(set, mulberry32(7));
    expect(a.order).toEqual(b.order);
    expect(a.index).toBe(-1);
    expect(a.order.slice().sort()).toEqual([0, 1, 2]);
  });

  it('NEXT presents the first problem', () => {
    const set = setOf([fill]);
    const ctx = ctxOf(set);
    const res = practiceStep(practiceInit(set, ctx.rng), { type: 'NEXT' }, ctx);
    expect(res.action.kind).toBe('PRESENT');
  });

  it('a first-try correct answer counts toward firstTryCorrect', () => {
    const set = setOf([fill]);
    const ctx = ctxOf(set);
    let { state } = practiceStep(practiceInit(set, ctx.rng), { type: 'NEXT' }, ctx);
    const res = practiceStep(state, { type: 'ANSWER', response: { kind: 'value', value: '5' } }, ctx);
    expect(res.action).toMatchObject({ kind: 'CORRECT', firstTry: true });
    expect(res.state.firstTryCorrect).toBe(1);
  });

  it('wrong gives a hint and retry, then reveals after maxTries (not first try)', () => {
    const set = setOf([fill], 2);
    const ctx = ctxOf(set);
    let { state } = practiceStep(practiceInit(set, ctx.rng), { type: 'NEXT' }, ctx);
    let res = practiceStep(state, { type: 'ANSWER', response: { kind: 'value', value: '9' } }, ctx);
    expect(res.action.kind).toBe('WRONG');
    expect(res.state.tries).toBe(1);
    res = practiceStep(res.state, { type: 'ANSWER', response: { kind: 'value', value: '8' } }, ctx);
    expect(res.action.kind).toBe('REVEAL');
    // a later correct answer after a wrong try is NOT first-try
    res = practiceStep(res.state, { type: 'ANSWER', response: { kind: 'value', value: '5' } }, ctx);
    expect(res.action).toMatchObject({ kind: 'CORRECT', firstTry: false });
    expect(res.state.firstTryCorrect).toBe(0);
  });

  it('serves problems as tiers: basic -> consolidate -> challenge', () => {
    const mk = (id: string, d: Difficulty): Problem => ({ id, type: 'fill', prompt: 'x', answer: 1, difficulty: d });
    const set: ProblemSet = {
      id: 's',
      title: 't',
      pedagogy: 'concept',
      problems: [mk('c1', 'challenge'), mk('b1', 'basic'), mk('m1', 'consolidate'), mk('b2', 'basic'), mk('c2', 'challenge')],
    };
    const ctx: PracticeContext = { set, rng: mulberry32(3), now: () => 0 };
    let state = practiceInit(set, ctx.rng);
    const seen: Difficulty[] = [];
    let action;
    for (let i = 0; i < 5; i++) {
      ({ state, action } = practiceStep(state, { type: 'NEXT' }, ctx));
      if (action.kind === 'PRESENT') seen.push(action.problem.difficulty as Difficulty);
      ({ state, action } = practiceStep(state, { type: 'ANSWER', response: { kind: 'value', value: '1' } }, ctx));
    }
    // basics first, then consolidate, then challenges — order within a tier may vary
    expect(seen).toEqual(['basic', 'basic', 'consolidate', 'challenge', 'challenge']);
  });

  it('completing all problems emits SET_COMPLETE with the first-try tally', () => {
    const set = setOf([fill, steps]);
    const ctx = ctxOf(set);
    let state = practiceInit(set, ctx.rng);
    let action;
    // walk: NEXT -> answer correct -> NEXT -> answer correct -> NEXT -> complete
    ({ state, action } = practiceStep(state, { type: 'NEXT' }, ctx));
    for (let i = 0; i < 2; i++) {
      const problem = action.kind === 'PRESENT' ? action.problem : null;
      const resp: Response =
        problem?.type === 'fill'
          ? { kind: 'value', value: String(problem.answer) }
          : { kind: 'fields', values: { q: '9', r: '2' } };
      ({ state, action } = practiceStep(state, { type: 'ANSWER', response: resp }, ctx));
      ({ state, action } = practiceStep(state, { type: 'NEXT' }, ctx));
    }
    expect(action).toMatchObject({ kind: 'SET_COMPLETE', firstTryCorrect: 2, total: 2 });
    expect(state.status).toBe('complete');
  });
});

describe('xp & levels', () => {
  it('xp scales with difficulty and doubles on first try', () => {
    expect(xpForCorrect('basic', false)).toBe(5);
    expect(xpForCorrect('basic', true)).toBe(10);
    expect(xpForCorrect('consolidate', false)).toBe(10);
    expect(xpForCorrect('challenge', false)).toBe(20);
    expect(xpForCorrect('challenge', true)).toBe(40);
    expect(xpForCorrect(undefined, false)).toBe(10); // defaults to consolidate
    expect(FLUENCY_XP).toBe(8);
  });

  it('triangular level thresholds', () => {
    expect(xpToReachLevel(1)).toBe(0);
    expect(xpToReachLevel(2)).toBe(100);
    expect(xpToReachLevel(3)).toBe(300);
    expect(xpToReachLevel(4)).toBe(600);
    expect(xpToReachLevel(5)).toBe(1000);
  });

  it('levelFromXp maps xp to level + progress', () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, intoLevel: 0, span: 100, toNext: 100 });
    expect(levelFromXp(50)).toMatchObject({ level: 1, intoLevel: 50, toNext: 50 });
    expect(levelFromXp(100)).toMatchObject({ level: 2, intoLevel: 0, span: 200 });
    expect(levelFromXp(450)).toMatchObject({ level: 3, intoLevel: 150, span: 300, toNext: 150 });
    expect(levelFromXp(-10).level).toBe(1);
  });
});
