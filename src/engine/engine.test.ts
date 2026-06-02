import { beforeEach, describe, expect, it } from 'vitest';
import { factById, getTrack } from './contentPack';
import { initTrackState, step, type StepResult } from './engine';
import { mulberry32 } from './rng';
import type { Action, EngineContext, Fact, TrackState } from './types';
import { patternPack, twoLevelPack } from './__fixtures__/packs';

const GATE = 3000;

function makeCtx(overrides: Partial<EngineContext> = {}): EngineContext {
  const pack = twoLevelPack();
  return {
    pack,
    latencyGateMs: GATE,
    now: () => 1000,
    rng: mulberry32(42),
    ...overrides,
  };
}

/** Answer the currently-prompted fact correctly (within the gate). */
function answerCorrect(state: TrackState, fact: Fact, ctx: EngineContext, elapsedMs = 10): StepResult {
  return step(state, { type: 'ANSWER', factId: fact.id, value: fact.answer, elapsedMs }, ctx);
}

function promptFact(action: Action): Fact {
  if (action.kind !== 'PROMPT') throw new Error(`expected PROMPT, got ${action.kind}`);
  return action.fact;
}

/** Drive `n` consecutive CORRECT answers, following PROMPT chaining. Stops
 *  early and returns the first non-PROMPT action (PHASE_COMPLETE etc.). */
function driveCorrect(
  start: StepResult,
  n: number,
  ctx: EngineContext,
): StepResult {
  let res = start;
  for (let i = 0; i < n; i++) {
    const fact = promptFact(res.action);
    res = answerCorrect(res.state, fact, ctx);
    if (res.action.kind !== 'PROMPT' && i < n - 1) return res; // terminal early
  }
  return res;
}

describe('NEXT / prompting', () => {
  it('NEXT yields a PROMPT from the take_off pool (current level only)', () => {
    const ctx = makeCtx();
    const s = initTrackState('mult_facts');
    const res = step(s, { type: 'NEXT' }, ctx);
    expect(res.action.kind).toBe('PROMPT');
    const fact = promptFact(res.action);
    expect(['a1', 'a2', 'a3', 'a4']).toContain(fact.id);
  });
});

describe('Take-Off mastery gate', () => {
  it('12 consecutive correct within the gate completes take_off and enters orbit', () => {
    const ctx = makeCtx();
    let res = step(initTrackState('mult_facts'), { type: 'NEXT' }, ctx);
    res = driveCorrect(res, 12, ctx);
    expect(res.action).toEqual({ kind: 'PHASE_COMPLETE', phase: 'take_off' });
    expect(res.state.phase).toBe('orbit');
    expect(res.state.streak).toBe(0);
  });

  it('a miss resets the take_off streak to zero', () => {
    const ctx = makeCtx();
    let res = step(initTrackState('mult_facts'), { type: 'NEXT' }, ctx);
    // 5 correct
    res = driveCorrect(res, 5, ctx);
    expect(res.state.streak).toBe(5);
    // one wrong answer on the prompted fact
    const fact = promptFact(res.action);
    res = step(res.state, { type: 'ANSWER', factId: fact.id, value: fact.answer + 1, elapsedMs: 10 }, ctx);
    expect(res.action.kind).toBe('CORRECTION');
    expect(res.state.streak).toBe(0);
    expect(res.state.pendingRetest).toBe(fact.id);
  });

  it('a timeout (elapsed > gate) is treated as a miss even if the value is correct', () => {
    const ctx = makeCtx();
    let res = step(initTrackState('mult_facts'), { type: 'NEXT' }, ctx);
    res = driveCorrect(res, 3, ctx);
    const fact = promptFact(res.action);
    res = step(res.state, { type: 'ANSWER', factId: fact.id, value: fact.answer, elapsedMs: GATE + 1 }, ctx);
    expect(res.action.kind).toBe('CORRECTION');
    expect(res.state.streak).toBe(0);
    expect(res.state.factStats[fact.id].lastMissAt).toBe(1000);
  });
});

describe('correction loop (re-teach + immediate retest)', () => {
  it('a miss emits CORRECTION, then NEXT re-prompts the SAME fact, and a passing retest is not counted', () => {
    const ctx = makeCtx();
    let res = step(initTrackState('mult_facts'), { type: 'NEXT' }, ctx);
    res = driveCorrect(res, 4, ctx);
    const streakBefore = res.state.streak; // 4
    const missed = promptFact(res.action);

    // wrong answer
    res = step(res.state, { type: 'ANSWER', factId: missed.id, value: -1, elapsedMs: 10 }, ctx);
    expect(res.action).toEqual({ kind: 'CORRECTION', fact: missed });
    expect(res.state.pendingRetest).toBe(missed.id);

    // NEXT re-prompts the same fact
    res = step(res.state, { type: 'NEXT' }, ctx);
    expect(promptFact(res.action).id).toBe(missed.id);

    // pass the retest -> redeemed, pendingRetest cleared, streak NOT advanced
    res = answerCorrect(res.state, missed, ctx);
    expect(res.action.kind).toBe('PROMPT');
    expect(res.state.pendingRetest).toBeNull();
    expect(res.state.streak).toBe(0); // streak stayed reset; retest does not count
    expect(streakBefore).toBe(4);
    // lastMissAt cleared after redemption
    expect(res.state.factStats[missed.id].lastMissAt).toBeUndefined();
  });

  it('a failed retest re-issues CORRECTION and keeps the retest pending', () => {
    const ctx = makeCtx();
    let res = step(initTrackState('mult_facts'), { type: 'NEXT' }, ctx);
    const fact = promptFact(res.action);
    res = step(res.state, { type: 'ANSWER', factId: fact.id, value: -1, elapsedMs: 10 }, ctx);
    expect(res.action.kind).toBe('CORRECTION');
    // fail the retest
    res = step(res.state, { type: 'ANSWER', factId: fact.id, value: -1, elapsedMs: 10 }, ctx);
    expect(res.action.kind).toBe('CORRECTION');
    expect(res.state.pendingRetest).toBe(fact.id);
  });

  it('pattern facts carry learningType through the CORRECTION action', () => {
    const ctx = makeCtx({ pack: patternPack() });
    let res = step(initTrackState('round'), { type: 'NEXT' }, ctx);
    const fact = promptFact(res.action);
    expect(fact.learningType).toBe('pattern');
    res = step(res.state, { type: 'ANSWER', factId: fact.id, value: -1, elapsedMs: 10 }, ctx);
    expect(res.action.kind).toBe('CORRECTION');
    if (res.action.kind === 'CORRECTION') expect(res.action.fact.learningType).toBe('pattern');
  });
});

describe('Orbit / Universe mastery gates', () => {
  // helper: get a state already in orbit at level A
  function intoOrbit(ctx: EngineContext): StepResult {
    let res = step(initTrackState('mult_facts'), { type: 'NEXT' }, ctx);
    res = driveCorrect(res, 12, ctx); // -> PHASE_COMPLETE take_off, phase orbit
    return step(res.state, { type: 'NEXT' }, ctx); // first orbit prompt
  }

  it('30 attempts with ≤2 errors completes orbit and enters universe', () => {
    const ctx = makeCtx();
    let res = intoOrbit(ctx);
    res = driveCorrect(res, 30, ctx);
    expect(res.action).toEqual({ kind: 'PHASE_COMPLETE', phase: 'orbit' });
    expect(res.state.phase).toBe('universe');
    expect(res.state.attempts).toBe(0);
  });

  it('a 3rd error within the window restarts the orbit test (attempts & errors reset)', () => {
    const ctx = makeCtx();
    let res = intoOrbit(ctx);
    // 2 misses are tolerated; the orbit pool at A has 4 facts so misses are
    // remediated via retest. We force 3 misses (each followed by a passing
    // retest) and check the window resets on the 3rd.
    function missThenFix(r: StepResult): StepResult {
      const fact = promptFact(r.action);
      let x = step(r.state, { type: 'ANSWER', factId: fact.id, value: -1, elapsedMs: 10 }, ctx);
      // pass the retest (not counted)
      x = step(x.state, { type: 'NEXT' }, ctx);
      const same = promptFact(x.action);
      return answerCorrect(x.state, same, ctx);
    }
    res = missThenFix(res); // attempts 1, errors 1
    expect(res.state.errors).toBe(1);
    expect(res.state.attempts).toBe(1);
    res = missThenFix(res); // attempts 2, errors 2
    expect(res.state.errors).toBe(2);
    res = missThenFix(res); // 3rd error -> reset
    expect(res.state.errors).toBe(0);
    expect(res.state.attempts).toBe(0);
  });
});

describe('level advancement', () => {
  it('completing universe advances to the next level and records completion', () => {
    const ctx = makeCtx();
    let res = step(initTrackState('mult_facts'), { type: 'NEXT' }, ctx);
    res = driveCorrect(res, 12, ctx); // take_off done
    res = step(res.state, { type: 'NEXT' }, ctx);
    res = driveCorrect(res, 30, ctx); // orbit done
    res = step(res.state, { type: 'NEXT' }, ctx);
    res = driveCorrect(res, 30, ctx); // universe done -> LEVEL_COMPLETE
    expect(res.action).toEqual({ kind: 'LEVEL_COMPLETE', level: 'A' });
    expect(res.state.currentLevel).toBe('B');
    expect(res.state.phase).toBe('take_off');
    expect(res.state.completedLevels).toEqual(['A']);
  });

  it('orbit pool at level B includes both A and B facts', () => {
    const ctx = makeCtx();
    // fast-forward to level B
    let res = step(initTrackState('mult_facts'), { type: 'NEXT' }, ctx);
    res = driveCorrect(res, 12, ctx);
    res = step(res.state, { type: 'NEXT' }, ctx);
    res = driveCorrect(res, 30, ctx);
    res = step(res.state, { type: 'NEXT' }, ctx);
    res = driveCorrect(res, 30, ctx); // now at B / take_off
    // finish B take_off, enter B orbit
    res = step(res.state, { type: 'NEXT' }, ctx);
    res = driveCorrect(res, 12, ctx);
    res = step(res.state, { type: 'NEXT' }, ctx);
    // gather a sample of prompted ids across many NEXTs
    const seen = new Set<string>();
    let cur = res;
    for (let i = 0; i < 40; i++) {
      seen.add(promptFact(cur.action).id);
      const fact = promptFact(cur.action);
      cur = answerCorrect(cur.state, fact, ctx);
      if (cur.action.kind !== 'PROMPT') break;
    }
    // should have drawn from both A (a*) and B (b*) facts
    expect([...seen].some((id) => id.startsWith('a'))).toBe(true);
    expect([...seen].some((id) => id.startsWith('b'))).toBe(true);
  });

  it('the last level has no successor: LEVEL_COMPLETE but currentLevel stays', () => {
    const ctx = makeCtx();
    // drive level A fully
    let res = step(initTrackState('mult_facts', 'B'), { type: 'NEXT' }, ctx);
    res = driveCorrect(res, 12, ctx);
    res = step(res.state, { type: 'NEXT' }, ctx);
    res = driveCorrect(res, 30, ctx);
    res = step(res.state, { type: 'NEXT' }, ctx);
    res = driveCorrect(res, 30, ctx);
    expect(res.action).toEqual({ kind: 'LEVEL_COMPLETE', level: 'B' });
    expect(res.state.currentLevel).toBe('B'); // stays — no next level
    expect(res.state.completedLevels).toEqual(['B']);

    // re-mastering the last level's universe does not duplicate the entry
    res = step(res.state, { type: 'NEXT' }, ctx);
    res = driveCorrect(res, 30, ctx);
    expect(res.action).toEqual({ kind: 'LEVEL_COMPLETE', level: 'B' });
    expect(res.state.completedLevels).toEqual(['B']);
  });
});

describe('milestone race', () => {
  it('START_RACE prompts from the learned pool and ANSWERs tally correct/min', () => {
    let t = 0;
    const ctx = makeCtx({ now: () => t });
    // learn level A take_off a bit so learnedPool is non-empty (it always is)
    let res = step(initTrackState('mult_facts'), { type: 'START_RACE', durationMs: 60000 }, ctx);
    expect(res.action.kind).toBe('PROMPT');
    expect(res.state.race).toBeDefined();

    // answer 5 correct, 1 wrong, all before time runs out
    for (let i = 0; i < 5; i++) {
      const fact = promptFact(res.action);
      t += 1000;
      res = answerCorrect(res.state, fact, ctx);
    }
    const wrong = promptFact(res.action);
    t += 1000;
    res = step(res.state, { type: 'ANSWER', factId: wrong.id, value: -1, elapsedMs: 500 }, ctx);

    // now push time past the end and request next -> RACE_RESULT
    t = 60001;
    res = step(res.state, { type: 'NEXT' }, ctx);
    expect(res.action.kind).toBe('RACE_RESULT');
    if (res.action.kind === 'RACE_RESULT') {
      // 5 correct over a 60s race = 5 correct/min
      expect(res.action.correctPerMin).toBeCloseTo(5, 5);
    }
    expect(res.state.race).toBeUndefined();
  });

  it('NEXT during an active race (time remaining) yields another race PROMPT', () => {
    let t = 0;
    const ctx = makeCtx({ now: () => t });
    let res = step(initTrackState('mult_facts'), { type: 'START_RACE', durationMs: 60000 }, ctx);
    t = 5000; // still within the race
    res = step(res.state, { type: 'NEXT' }, ctx);
    expect(res.action.kind).toBe('PROMPT');
    expect(res.state.race).toBeDefined();
  });

  it('an ANSWER arriving after the race end finalizes with RACE_RESULT', () => {
    let t = 0;
    const ctx = makeCtx({ now: () => t });
    let res = step(initTrackState('mult_facts'), { type: 'START_RACE', durationMs: 60000 }, ctx);
    const fact = promptFact(res.action);
    t = 60001;
    res = step(res.state, { type: 'ANSWER', factId: fact.id, value: fact.answer, elapsedMs: 10 }, ctx);
    expect(res.action.kind).toBe('RACE_RESULT');
  });

  it('race correctPerMin scales with a 30s race', () => {
    let t = 0;
    const ctx = makeCtx({ now: () => t });
    let res = step(initTrackState('mult_facts'), { type: 'START_RACE', durationMs: 30000 }, ctx);
    for (let i = 0; i < 3; i++) {
      const fact = promptFact(res.action);
      t += 1000;
      res = answerCorrect(res.state, fact, ctx);
    }
    t = 30001;
    res = step(res.state, { type: 'NEXT' }, ctx);
    if (res.action.kind === 'RACE_RESULT') {
      // 3 correct over 30s -> 6 correct/min
      expect(res.action.correctPerMin).toBeCloseTo(6, 5);
    } else {
      throw new Error('expected RACE_RESULT');
    }
  });
});

describe('determinism', () => {
  it('same seed + same events produce identical prompts', () => {
    const run = () => {
      const ctx = makeCtx({ rng: mulberry32(7) });
      let res = step(initTrackState('mult_facts'), { type: 'NEXT' }, ctx);
      const ids: string[] = [];
      for (let i = 0; i < 8; i++) {
        const fact = promptFact(res.action);
        ids.push(fact.id);
        res = answerCorrect(res.state, fact, ctx);
      }
      return ids;
    };
    expect(run()).toEqual(run());
  });

  it('factStats accumulate seen/correct counts', () => {
    const ctx = makeCtx();
    const track = getTrack(ctx.pack, 'mult_facts');
    let res = step(initTrackState('mult_facts'), { type: 'NEXT' }, ctx);
    res = driveCorrect(res, 6, ctx);
    const total = Object.values(res.state.factStats).reduce((a, s) => a + s.seen, 0);
    expect(total).toBe(6);
    const correct = Object.values(res.state.factStats).reduce((a, s) => a + s.correct, 0);
    expect(correct).toBe(6);
    expect(factById(track, 'a1')).toBeDefined();
  });
});
