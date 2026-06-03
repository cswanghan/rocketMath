// Practice engine types — the UNTIMED counterpart to the fluency engine.
// Used for procedure/formula/concept/logic/data topics where timing a child
// would harm learning (SPEC §2). Same discipline: pure, deterministic, zero
// network/LLM. Answers/distractors/hints/explanations all live in content.

export type ProblemType = 'mc' | 'fill' | 'steps';

export interface Choice {
  id: string;
  label: string;
  correct: boolean;
}

export interface Field {
  id: string;
  label: string;
  answer: number | string;
}

export interface Problem {
  id: string;
  type: ProblemType;
  prompt: string; // may be multi-line (竖式 layout); render with white-space: pre
  choices?: Choice[]; // mc
  answer?: number | string; // fill
  fields?: Field[]; // steps (e.g. 商 + 余数)
  hint?: string; // shown on a wrong try
  explanation?: string; // shown on correct / reveal
}

export interface ProblemSet {
  id: string;
  title: string;
  pedagogy: string;
  maxTries?: number; // wrong tries before the answer is revealed (default 2)
  problems: Problem[];
}

export type Response =
  | { kind: 'choice'; choiceId: string }
  | { kind: 'value'; value: string }
  | { kind: 'fields'; values: Record<string, string> };

export interface PracticeState {
  setId: string;
  order: number[]; // shuffled problem indices
  index: number; // -1 before the first PRESENT
  tries: number; // wrong tries on the current problem
  firstTryCorrect: number;
  status: 'active' | 'complete';
}

export type PracticeEvent = { type: 'NEXT' } | { type: 'ANSWER'; response: Response };

export type PracticeAction =
  | { kind: 'PRESENT'; problem: Problem }
  | { kind: 'CORRECT'; problem: Problem; firstTry: boolean }
  | { kind: 'WRONG'; problem: Problem; tries: number }
  | { kind: 'REVEAL'; problem: Problem } // answer shown after maxTries
  | { kind: 'SET_COMPLETE'; firstTryCorrect: number; total: number };

export interface PracticeContext {
  set: ProblemSet;
  rng: () => number; // seedable
  now: () => number;
}

export interface PracticePack {
  version: string;
  sets: ProblemSet[];
}
