// Deterministic answer checking. Pure — no engine state, no side effects.
import type { Problem, Response } from './types';

function numEq(expected: number, got: string): boolean {
  const v = Number(String(got).trim());
  return Number.isFinite(v) && v === expected;
}

function valueEq(expected: number | string, got: string): boolean {
  if (typeof expected === 'number') return numEq(expected, got);
  return String(expected).trim() === got.trim();
}

export function checkAnswer(problem: Problem, response: Response): boolean {
  switch (problem.type) {
    case 'mc':
      return (
        response.kind === 'choice' &&
        !!problem.choices?.some((c) => c.id === response.choiceId && c.correct)
      );
    case 'fill':
      return response.kind === 'value' && problem.answer !== undefined && valueEq(problem.answer, response.value);
    case 'steps': {
      if (response.kind !== 'fields' || !problem.fields) return false;
      return problem.fields.every((f) => {
        const got = response.values[f.id];
        return got !== undefined && valueEq(f.answer, got);
      });
    }
  }
}
