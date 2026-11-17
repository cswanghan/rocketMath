// @ts-ignore Node types are not installed in this repository (test-only import).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import chinese from '../../content/grade4_math_fluency_pack.json';
import english from '../../content/en/grade4_math_fluency_pack.json';
import legacy from './__fixtures__/grade4_legacy_facts.json';
import { getTrack, validatePack } from './contentPack';
import { initTrackState, step } from './engine';
import { mulberry32 } from './rng';
import type { ContentPack, EngineContext, Fact, TrackState } from './types';

const pack = chinese as ContentPack;

// Independent arithmetic oracle: recursive descent, not the Python generator's
// AST evaluator or computeFromPrompt (which skips mixed operations and 万).
function answerFromPrompt(prompt: string): number {
  const expression = prompt.split(' = ')[0].replaceAll('万', '').replaceAll('×', '*').replaceAll('÷', '/');
  const tokens = expression.match(/\d+|[()+\-*/]/g) ?? [];
  expect(tokens.join('')).toBe(expression.replace(/\s/g, ''));
  let index = 0;
  function atom(): number {
    if (tokens[index] === '(') {
      index++;
      const value = sum();
      expect(tokens[index++]).toBe(')');
      return value;
    }
    const value = Number(tokens[index++]);
    expect(Number.isInteger(value)).toBe(true);
    return value;
  }
  function product(): number {
    let value = atom();
    while (tokens[index] === '*' || tokens[index] === '/') {
      const op = tokens[index++], right = atom();
      if (op === '*') value *= right;
      else {
        expect(right).toBeGreaterThan(0);
        expect(value % right).toBe(0);
        value /= right;
      }
    }
    return value;
  }
  function sum(): number {
    let value = product();
    while (tokens[index] === '+' || tokens[index] === '-') {
      const op = tokens[index++], right = product();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  }
  const answer = sum();
  expect(index).toBe(tokens.length);
  return answer;
}

function frequencies(facts: Fact[]): number[] {
  const counts = new Map<number, number>();
  for (const fact of facts) counts.set(fact.answer, (counts.get(fact.answer) ?? 0) + 1);
  return [...counts.values()];
}

describe('grade 4 oral-math content regression', () => {
  it('has varied, unique questions and answers in every skill and level', () => {
    validatePack(pack);
    expect(pack.tracks.map(t => t.trackId)).toEqual([
      'mul_extended_oral', 'div_tens_oral', 'mixed_2step', 'large_num_oral',
    ]);
    for (const track of pack.tracks) {
      expect(track.levels.map(l => l.level)).toEqual(['A', 'B', 'C', 'D']);
      const facts = track.levels.flatMap(l => l.new_facts);
      expect(new Set(facts.map(f => f.prompt)).size).toBe(facts.length);
      for (const level of track.levels) {
        const counts = frequencies(level.new_facts);
        expect(level.new_facts.length).toBeGreaterThanOrEqual(16);
        expect(counts.length).toBeGreaterThanOrEqual(6);
        expect(Math.max(...counts) / level.new_facts.length).toBeLessThanOrEqual(0.25);
      }
    }
  });

  it('independently verifies every answer, including precedence, parentheses and 万 units', () => {
    for (const track of pack.tracks) {
      for (const fact of track.levels.flatMap(l => l.new_facts)) {
        expect(answerFromPrompt(fact.prompt), fact.id).toBe(fact.answer);
        expect(Number.isInteger(fact.answer)).toBe(true);
        expect(fact.answer).toBeGreaterThan(0);
      }
    }
    // Explicitly distinguish the two common errors an evaluator could mask.
    expect(answerFromPrompt('100 - 6 × 9')).toBe(46);
    expect(answerFromPrompt('(30 + 50) × 2')).toBe(160);
    expect(answerFromPrompt('12万 - 5万 = ( )万')).toBe(7);
  });

  it('keeps the teaching ranges for multiplication, exact tens division and large-number units', () => {
    for (const level of getTrack(pack, 'mul_extended_oral').levels) {
      for (const fact of level.new_facts) {
        const match = /^(\d+) × (\d+)$/.exec(fact.prompt)!;
        expect(match).not.toBeNull();
        const a = Number(match[1]), b = Number(match[2]);
        if (level.level === 'A' || level.level === 'C') {
          expect(a).toBeGreaterThanOrEqual(100); expect(a).toBeLessThan(1000);
          expect(a % (level.level === 'A' ? 100 : 10)).toBe(0);
          expect(b).toBeGreaterThanOrEqual(2); expect(b).toBeLessThanOrEqual(9);
        } else {
          expect(a).toBeGreaterThanOrEqual(10); expect(a).toBeLessThan(100);
          expect(b).toBeGreaterThanOrEqual(10); expect(b).toBeLessThan(100);
          expect(b % 10).toBe(0);
          if (level.level === 'B') expect(a % 10).toBe(0);
        }
      }
    }
    for (const level of getTrack(pack, 'div_tens_oral').levels) {
      for (const fact of level.new_facts) {
        const match = /^(\d+) ÷ (\d+)$/.exec(fact.prompt)!;
        expect(match).not.toBeNull();
        const dividend = Number(match[1]), divisor = Number(match[2]);
        expect(dividend % 10).toBe(0);
        expect(divisor % 10).toBe(0);
        expect(divisor).toBeGreaterThanOrEqual(level.level === 'D' ? 60 : 10);
        expect(divisor).toBeLessThanOrEqual(90);
        expect(dividend % divisor).toBe(0);
        expect(fact.answer).toBeGreaterThanOrEqual(2);
        expect(fact.answer).toBeLessThanOrEqual(9);
      }
    }
    for (const fact of getTrack(pack, 'large_num_oral').levels.flatMap(l => l.new_facts)) {
      expect(fact.prompt).toMatch(/^\d+万 (?:[+-] \d+万|[×÷] \d+) = \( \)万$/);
    }
  });

  it('preserves all 64 original fact IDs, levels, prompts and answers for saved progress', () => {
    expect(legacy.flatMap(l => l.facts)).toHaveLength(64);
    for (const oldLevel of legacy) {
      const level = getTrack(pack, oldLevel.trackId).levels.find(l => l.level === oldLevel.level)!;
      for (const [id, prompt, answer] of oldLevel.facts) {
        expect(level.new_facts.find(f => f.id === id)).toEqual({ id, prompt, answer, learningType: 'pattern' });
      }
    }
  });

  it('ships the same facts in the Chinese, English and mini-program bundles', () => {
    const localized = english as ContentPack;
    validatePack(localized);
    const facts = (p: ContentPack) => p.tracks.map(t => ({
      id: t.trackId, levels: t.levels.map(l => ({ level: l.level, facts: l.new_facts.map(f => [f.id, f.answer]) })),
    }));
    expect(facts(localized)).toEqual(facts(pack));
    for (const track of localized.tracks) {
      for (const fact of track.levels.flatMap(l => l.new_facts)) {
        expect(fact.prompt).not.toMatch(/[\u3400-\u9fff]/);
        expect(answerFromPrompt(fact.prompt.replaceAll(' ten-thousands', '').replaceAll(' ten thousand', ''))).toBe(fact.answer);
      }
    }
    const mini = readFileSync(new URL('../../apps/mini/content/grade4_fluency.js', import.meta.url), 'utf8');
    expect(JSON.parse(mini.slice(mini.indexOf('module.exports = ') + 'module.exports = '.length).trim().replace(/;$/, ''))).toEqual(pack);
  });

  it('produces varied answers through all 72 level-A division attempts across 100 deterministic seeds', () => {
    for (let seed = 0; seed < 100; seed++) {
      const ctx: EngineContext = { pack, latencyGateMs: 3000, now: () => 1000, rng: mulberry32(seed) };
      let result = step(initTrackState('div_tens_oral'), { type: 'NEXT' }, ctx);
      const facts: Fact[] = [];
      for (let attempt = 0; attempt < 72; attempt++) {
        if (result.action.kind !== 'PROMPT') throw new Error(`Unexpected action ${result.action.kind}`);
        const fact = result.action.fact;
        facts.push(fact);
        result = step(result.state, { type: 'ANSWER', factId: fact.id, value: fact.answer, elapsedMs: 100 }, ctx);
        if (result.action.kind === 'PHASE_COMPLETE') result = step(result.state, { type: 'NEXT' }, ctx);
      }
      expect(result.action).toEqual({ kind: 'LEVEL_COMPLETE', level: 'A' });
      expect(result.state.currentLevel).toBe('B');
      expect(frequencies(facts).length, `seed ${seed}`).toBeGreaterThanOrEqual(6);
      expect(Math.max(...frequencies(facts)), `seed ${seed}`).toBeLessThan(36);
    }
  });

  it('resumes an old saved correction without clearing progress or changing its answer', () => {
    const saved: TrackState = {
      ...initTrackState('div_tens_oral', 'D'), phase: 'orbit', attempts: 7, errors: 1,
      completedLevels: ['A', 'B', 'C'], pendingRetest: 'dto_630d90',
      factStats: { dto_630d90: { seen: 3, correct: 2, lastMissAt: 900 } },
    };
    const restored = JSON.parse(JSON.stringify(saved)) as TrackState;
    const ctx: EngineContext = { pack, latencyGateMs: 3000, now: () => 1000, rng: mulberry32(42) };
    const result = step(restored, { type: 'NEXT' }, ctx);
    expect(result.action).toMatchObject({ kind: 'PROMPT', fact: { id: 'dto_630d90', prompt: '630 ÷ 90', answer: 7 } });
    const next = step(result.state, { type: 'ANSWER', factId: 'dto_630d90', value: 7, elapsedMs: 100 }, ctx);
    expect(next.state.pendingRetest).toBeNull();
    expect(next.state.completedLevels).toEqual(['A', 'B', 'C']);
    expect(next.state.currentLevel).toBe('D');
    expect(next.state.phase).toBe('orbit');
    expect(next.state.attempts).toBe(7);
    expect(next.state.factStats.dto_630d90).toEqual({ seen: 4, correct: 3 });
  });
});
