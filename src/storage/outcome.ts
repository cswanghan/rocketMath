// Pure helper to label an ANSWER for the append-only event log, derived from
// the state BEFORE the step and the resulting action. Kept out of the engine
// (the engine doesn't care about logging) but pure + tested.
import type { Action, TrackState } from '../engine';
import type { AnswerOutcome } from './types';

export function classifyOutcome(prev: TrackState, result: Action): AnswerOutcome {
  if (prev.race) return 'race';
  const wasRetest = prev.pendingRetest !== null;
  const missed = result.kind === 'CORRECTION';
  if (wasRetest) return missed ? 'retest_fail' : 'retest_pass';
  return missed ? 'miss' : 'hit';
}
