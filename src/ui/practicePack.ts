import packJson from '../../content/grade3_practice_pack.json';
import type { PracticePack, ProblemSet } from '../practice';

export const practicePack = packJson as unknown as PracticePack;

export function getSet(id: string): ProblemSet | undefined {
  return practicePack.sets.find((s) => s.id === id);
}
