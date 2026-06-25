// Practice engine types — the UNTIMED counterpart to the fluency engine.
// Used for procedure/formula/concept/logic/data topics where timing a child
// would harm learning (SPEC §2). Same discipline: pure, deterministic, zero
// network/LLM. Answers/distractors/hints/explanations all live in content.

export type ProblemType = 'mc' | 'fill' | 'steps';

// Difficulty tier — the "关卡" within a topic. Problems are served in this
// order: basic (基础知识) → consolidate (夯实基础) → challenge (拔高).
export type Difficulty = 'basic' | 'consolidate' | 'challenge';

export const DIFFICULTY_ORDER: Difficulty[] = ['basic', 'consolidate', 'challenge'];

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

export interface Source {
  edition: string; // 教材版本, e.g. 人教版
  grade: number;
  gradeLabel: string; // 七年级
  unit: string | null; // 教材单元
  topic: string | null; // 知识点
  label: string; // 人教版 · 七年级 · 有理数 · 有理数的概念
}

export interface Problem {
  id: string;
  type: ProblemType;
  prompt: string; // may be multi-line (竖式 layout); render with white-space: pre
  difficulty?: Difficulty; // defaults to 'consolidate'
  choices?: Choice[]; // mc
  answer?: number | string; // fill
  fields?: Field[]; // steps (e.g. 商 + 余数)
  hint?: string; // shown on a wrong try
  explanation?: string; // shown on correct / reveal
  source?: Source; // 题目来源标注 (教材出处+知识点), auto-derived from knowledge_map
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
