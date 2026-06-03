// Persistence data model (SPEC §6). Single-user/single-device MVP uses one
// implicit student id ('local'), but the schema already keys everything by
// studentId so a real multi-user backend can drop in behind StorageAdapter.

import type { Phase, TrackState } from '../engine';

export interface Student {
  id: string;
  name?: string;
  createdAt: number;
  /** Individualised latency gate (ms) from the baseline probe (M5). */
  latencyGateMs?: number;
  /** Cumulative experience points across all activities. */
  xp?: number;
}

export interface RaceResult {
  id?: number;
  studentId: string;
  trackId: string;
  level: string;
  correctPerMin: number;
  durationMs: number;
  ts: number;
}

/** One row per answer — append-only. This log is deliberate (SPEC §6): it
 *  enables replay, stats, and future backtesting of pacing parameters. */
export type AnswerOutcome = 'hit' | 'miss' | 'retest_pass' | 'retest_fail' | 'race';

export interface GameEvent {
  id?: number;
  studentId: string;
  trackId: string;
  ts: number;
  level: string;
  phase: Phase;
  factId: string;
  value: number;
  elapsedMs: number;
  outcome: AnswerOutcome;
}

/** One wrong answer, for the parent-facing 错题本 (mistake book). */
export interface MistakeRecord {
  id?: number;
  studentId: string;
  source: 'practice' | 'fluency';
  topicId: string; // setId or trackId
  topicTitle: string;
  problemId: string; // problem id or fact id
  prompt: string;
  difficulty?: string; // practice only
  yourAnswer: string;
  correctAnswer: string;
  elapsedMs?: number; // time spent on this problem
  slow?: boolean; // answered correctly but slowly (flagged for attention)
  ts: number;
  corrected: boolean;
}

/** Progress on a Practice problem set (untimed topics). */
export interface PracticeRecord {
  studentId: string;
  setId: string;
  completed: boolean;
  bestFirstTry: number; // best first-try-correct count achieved
  total: number;
  updatedAt: number;
}

/** The storage seam. Swapping IndexedDB for a real backend = new adapter only,
 *  no engine/UI change (SPEC §3). All methods are async. */
export interface StorageAdapter {
  getStudent(id: string): Promise<Student | null>;
  putStudent(student: Student): Promise<void>;
  /** Atomically add to a student's XP; returns the new total. */
  addXp(studentId: string, amount: number): Promise<number>;

  getTrackState(studentId: string, trackId: string): Promise<TrackState | null>;
  putTrackState(studentId: string, trackId: string, state: TrackState): Promise<void>;

  appendEvent(event: GameEvent): Promise<void>;

  putRaceResult(result: RaceResult): Promise<void>;
  listRaceResults(studentId: string, trackId: string): Promise<RaceResult[]>;

  getPractice(studentId: string, setId: string): Promise<PracticeRecord | null>;
  putPractice(record: PracticeRecord): Promise<void>;

  appendMistake(mistake: MistakeRecord): Promise<void>;
  listMistakes(studentId: string): Promise<MistakeRecord[]>;
  markMistakeCorrected(studentId: string, id: number): Promise<void>;

  /** Clear all completion progress (track + practice states) and reset XP to 0. */
  resetProgress(studentId: string): Promise<void>;
  /** Delete the 错题本 for a student. */
  clearMistakes(studentId: string): Promise<void>;
}
