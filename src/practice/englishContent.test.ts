import { describe, expect, it } from 'vitest';
import english from '../../content/english_practice_pack.json';
import { mulberry32 } from '../engine/rng';
import { checkAnswer, practiceInit, practiceStep } from './index';
import type { Difficulty, PracticePack, Problem } from './types';

const pack = english as PracticePack;
const all = pack.sets.flatMap(set => set.problems);
const byId = new Map(all.map(problem => [problem.id, problem]));
const tiers: Difficulty[] = ['basic', 'consolidate', 'challenge'];
const correct = (id: string) => byId.get(id)!.choices!.find(choice => choice.correct)!.label;

// Existing IDs are referenced by preparation checklists and learning records.
// Preserve all 38 questions while allowing correction of ambiguous wording.
const legacyIds = [
  ...['keg', 'ker', 'peg'].flatMap(prefix => [
    ...Array.from({ length: 3 }, (_, i) => `${prefix}_b${i}`),
    ...Array.from({ length: 4 }, (_, i) => `${prefix}_c${i}`),
    ...Array.from({ length: 3 }, (_, i) => `${prefix}_x${i}`),
  ]),
  ...Array.from({ length: 2 }, (_, i) => `per_b${i}`),
  ...Array.from({ length: 3 }, (_, i) => `per_c${i}`),
  ...Array.from({ length: 3 }, (_, i) => `per_x${i}`),
];

describe('English practice bank', () => {
  it('keeps the four reachable set IDs and all legacy learning-record IDs', () => {
    expect(pack.sets.map(set => set.id)).toEqual([
      'ket_grammar', 'ket_reading', 'pet_grammar', 'pet_reading',
    ]);
    expect(legacyIds).toHaveLength(38);
    for (const id of legacyIds) {
      expect(byId.has(id), id).toBe(true);
      // The correct option remains the same ID even when its position moves.
      expect(byId.get(id)!.choices!.find(choice => choice.correct)!.id, id).toBe('a');
    }
    expect(english.provenance).toContain('不是官方真题');
  });

  it('has distinct authored questions, useful feedback and one valid choice per problem', () => {
    expect(all.length).toBeGreaterThanOrEqual(128);
    expect(new Set(all.map(problem => problem.id)).size).toBe(all.length);
    expect(new Set(all.map(problem => problem.prompt.trim())).size).toBe(all.length);
    for (const problem of all) {
      expect(problem.type).toBe('mc');
      expect(problem.prompt.trim().length, problem.id).toBeGreaterThan(8);
      expect(problem.hint?.trim().length, problem.id).toBeGreaterThan(4);
      expect(problem.explanation?.trim().length, problem.id).toBeGreaterThan(1);
      const choices = problem.choices!;
      expect(choices, problem.id).toHaveLength(4);
      expect(new Set(choices.map(choice => choice.id)).size, problem.id).toBe(4);
      expect(new Set(choices.map(choice => choice.label.trim().toLowerCase())).size, problem.id).toBe(4);
      expect(choices.filter(choice => choice.correct), problem.id).toHaveLength(1);
      for (const choice of choices) {
        expect(checkAnswer(problem, { kind: 'choice', choiceId: choice.id }), problem.id).toBe(choice.correct);
      }
      expect(checkAnswer(problem, { kind: 'choice', choiceId: 'missing' })).toBe(false);
    }
  });

  it('prevents a fixed-position strategy from succeeding in any difficulty tier', () => {
    for (const set of pack.sets) {
      for (const difficulty of tiers) {
        const problems = set.problems.filter(problem => problem.difficulty === difficulty);
        expect(problems.length, `${set.id}/${difficulty}`).toBeGreaterThanOrEqual(8);
        const counts = [0, 0, 0, 0];
        for (const problem of problems) counts[problem.choices!.findIndex(choice => choice.correct)]++;
        expect(Math.max(...counts) - Math.min(...counts), `${set.id}/${difficulty}`).toBeLessThanOrEqual(1);
        expect(Math.max(...counts) / problems.length, `${set.id}/${difficulty}`).toBeLessThanOrEqual(0.25);
      }
    }
  });

  it('fixes existing grammar ambiguity and the strict over-£20 boundary', () => {
    const article = byId.get('keg_c1')!;
    expect(correct(article.id)).toBe('an');
    expect(article.choices!.map(choice => choice.label)).not.toContain('the');
    const reported = byId.get('peg_c1')!;
    expect(reported.prompt).toContain('when I was a child');
    expect(correct(reported.id)).toBe('lived');
    expect(reported.choices!.map(choice => choice.label)).not.toContain('live');
    expect(correct('per_x0')).toBe('订单超过 20 英镑');
    expect(byId.get('per_x0')!.explanation).toContain('恰好 20 英镑不满足');
  });

  it('independently checks money, age and timetable answers against the passage facts', () => {
    // Numeric expectations come from the facts in the passages, not answer IDs.
    expect(correct('ker_x5')).toBe(`不够，还差 ${35 + 8 - 40} 英镑`);
    expect(correct('ker_x8')).toBe(`${10 / 2} 英镑`); // Age 5 is not under 5.
    expect(correct('per_c4')).toBe(`${22 + (3 - 2) * 5} 英镑`);
    expect(correct('per_b3')).toBe(`${13 - 9} 小时`);
    const arrivalA = 9 * 60 + 10 + 25;
    const arrivalB = 9 * 60 + 20 + 10;
    expect(correct('per_c10')).toBe(`B 车早 ${arrivalA - arrivalB} 分钟`);
    expect(correct('per_x7')).toBe('星期三'); // Monday after cutoff → processed Tuesday → one working day.
    expect(correct('ker_x4')).toBe('8:40'); // Meeting time, not the 9:00 departure.
  });

  it('includes extended self-contained reading and evidence-based inference', () => {
    const extended = pack.sets.find(set => set.id === 'pet_reading')!.problems.filter(problem => {
      const passage = problem.prompt.split('\n问：')[0];
      return (passage.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? []).length >= 50;
    });
    expect(extended.length).toBeGreaterThanOrEqual(9);
    for (const problem of extended) expect(problem.prompt).toContain('\n问：');
    expect(correct('per_x4')).toBe('更愿意开口，即使会犯错');
    expect(correct('per_x8')).toBe('比较证据后说明信息来源');
    expect(correct('per_x10')).toBe('合作可能花更多时间，却能提高成果质量');
  });

  it.each(['ket_grammar', 'ket_reading', 'pet_grammar', 'pet_reading'])(
    '%s is fully playable through the existing engine across every tier', setId => {
      const set = pack.sets.find(value => value.id === setId)!;
      const rng = mulberry32(42);
      const ctx = { set, rng, now: () => 0 };
      let state = practiceInit(set, rng);
      const seen: Problem[] = [];
      for (let i = 0; i < set.problems.length; i++) {
        const presented = practiceStep(state, { type: 'NEXT' }, ctx);
        expect(presented.action.kind).toBe('PRESENT');
        if (presented.action.kind !== 'PRESENT') throw new Error('Expected a problem');
        const problem = presented.action.problem;
        seen.push(problem);
        const wrong = problem.choices!.find(choice => !choice.correct)!;
        const rejected = practiceStep(presented.state, { type: 'ANSWER', response: { kind: 'choice', choiceId: wrong.id } }, ctx);
        expect(rejected.action.kind).toBe('WRONG');
        const accepted = practiceStep(rejected.state, {
          type: 'ANSWER', response: { kind: 'choice', choiceId: problem.choices!.find(choice => choice.correct)!.id },
        }, ctx);
        expect(accepted.action.kind).toBe('CORRECT');
        state = accepted.state;
      }
      const completed = practiceStep(state, { type: 'NEXT' }, ctx);
      expect(completed.action).toEqual({ kind: 'SET_COMPLETE', firstTryCorrect: 0, total: set.problems.length });
      expect(new Set(seen.map(problem => problem.id)).size).toBe(set.problems.length);
      const difficultySequence = seen.map(problem => tiers.indexOf(problem.difficulty!));
      expect(difficultySequence).toEqual([...difficultySequence].sort((a, b) => a - b));
    },
  );
});
