// Human-readable answer strings for the 错题本 (mistake book). Pure.
import type { Problem, Response } from './types';

export function responseText(problem: Problem, r: Response): string {
  if (r.kind === 'choice') {
    return problem.choices?.find((c) => c.id === r.choiceId)?.label ?? r.choiceId;
  }
  if (r.kind === 'value') return r.value;
  // fields
  if (problem.fields) {
    return problem.fields.map((f, i) => `${f.label} ${r.values[f.id || `f${i}`] ?? '?'}`).join(' , ');
  }
  return Object.values(r.values).join(' , ');
}

export function correctText(problem: Problem): string {
  if (problem.type === 'mc') return problem.choices?.find((c) => c.correct)?.label ?? '';
  if (problem.type === 'fill') return String(problem.answer ?? '');
  if (problem.type === 'steps') return (problem.fields ?? []).map((f) => `${f.label} ${f.answer}`).join(' , ');
  return '';
}
