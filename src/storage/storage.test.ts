import { describe, expect, it } from 'vitest';
import { initTrackState, type Action, type TrackState } from '../engine';
import { MemoryAdapter } from './memory';
import { classifyOutcome } from './outcome';

describe('MemoryAdapter round-trip (SPEC §6 / §9 refresh-restore contract)', () => {
  it('persists and restores a track-state snapshot by value', async () => {
    const a = new MemoryAdapter();
    const state: TrackState = {
      ...initTrackState('mult_facts'),
      currentLevel: 'C',
      phase: 'orbit',
      attempts: 7,
      completedLevels: ['A', 'B'],
      factStats: { mult_2x2: { seen: 3, correct: 2, lastMissAt: 123 } },
    };
    await a.putTrackState('local', 'mult_facts', state);
    const restored = await a.getTrackState('local', 'mult_facts');
    expect(restored).toEqual(state);
    // stored by value, not reference
    expect(restored).not.toBe(state);
  });

  it('returns null for an unknown track state', async () => {
    const a = new MemoryAdapter();
    expect(await a.getTrackState('local', 'nope')).toBeNull();
  });

  it('stores and reads a student', async () => {
    const a = new MemoryAdapter();
    await a.putStudent({ id: 'local', createdAt: 1, latencyGateMs: 2500 });
    expect((await a.getStudent('local'))?.latencyGateMs).toBe(2500);
    expect(await a.getStudent('ghost')).toBeNull();
  });

  it('appends events in order with ids', async () => {
    const a = new MemoryAdapter();
    for (let i = 0; i < 3; i++) {
      await a.appendEvent({
        studentId: 'local',
        trackId: 'mult_facts',
        ts: i,
        level: 'A',
        phase: 'take_off',
        factId: 'mult_2x2',
        value: 4,
        elapsedMs: 100,
        outcome: 'hit',
      });
    }
    const evs = a._allEvents();
    expect(evs.map((e) => e.id)).toEqual([1, 2, 3]);
    expect(evs.map((e) => e.ts)).toEqual([0, 1, 2]);
  });

  it('records, lists and marks mistakes corrected', async () => {
    const a = new MemoryAdapter();
    await a.appendMistake({
      studentId: 'local', source: 'practice', topicId: 'add_column', topicTitle: '三位数加法竖式',
      problemId: 'p1', prompt: '456 + 378', difficulty: 'consolidate', yourAnswer: '824', correctAnswer: '834',
      ts: 1, corrected: false,
    });
    await a.appendMistake({
      studentId: 'other', source: 'fluency', topicId: 'mult_facts', topicTitle: '乘法口诀',
      problemId: 'm', prompt: '6 × 7', yourAnswer: '42', correctAnswer: '42', ts: 2, corrected: false,
    });
    const mine = await a.listMistakes('local');
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ topicTitle: '三位数加法竖式', yourAnswer: '824', corrected: false });
    await a.markMistakeCorrected('local', mine[0].id!);
    expect((await a.listMistakes('local'))[0].corrected).toBe(true);
  });

  it('filters race results by student + track', async () => {
    const a = new MemoryAdapter();
    await a.putRaceResult({ studentId: 'local', trackId: 'mult_facts', level: 'A', correctPerMin: 30, durationMs: 60000, ts: 1 });
    await a.putRaceResult({ studentId: 'local', trackId: 'div_facts', level: 'A', correctPerMin: 10, durationMs: 60000, ts: 2 });
    const r = await a.listRaceResults('local', 'mult_facts');
    expect(r).toHaveLength(1);
    expect(r[0].correctPerMin).toBe(30);
    expect(r[0].id).toBe(1);
  });
});

describe('classifyOutcome', () => {
  const base = initTrackState('mult_facts');
  const prompt: Action = { kind: 'PROMPT', fact: { id: 'x', prompt: '2 × 2', answer: 4, learningType: 'fact_recall' } };
  const correction: Action = { kind: 'CORRECTION', fact: prompt.kind === 'PROMPT' ? prompt.fact : prompt as never };

  it('normal hit', () => {
    expect(classifyOutcome(base, prompt)).toBe('hit');
  });
  it('normal miss', () => {
    expect(classifyOutcome(base, correction)).toBe('miss');
  });
  it('retest pass', () => {
    expect(classifyOutcome({ ...base, pendingRetest: 'x' }, prompt)).toBe('retest_pass');
  });
  it('retest fail', () => {
    expect(classifyOutcome({ ...base, pendingRetest: 'x' }, correction)).toBe('retest_fail');
  });
  it('race answers are labelled race', () => {
    const racing = { ...base, race: { endsAt: 1, correct: 0, answered: 0, durationMs: 60000 } };
    expect(classifyOutcome(racing, prompt)).toBe('race');
  });
});
