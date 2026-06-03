// Content-pack loading, validation and DERIVED pool computation.
//
// The engine knows nothing about *what* it teaches — it only trusts the pack.
// Per SPEC §4: validation must run at load time (shape + every fact's answer
// must be computable from its prompt) and fail loudly, never silently.
// orbit/universe pools are DERIVED here from interleave_rules, never enumerated
// in the JSON.

import type { ContentPack, EngineConfig, Fact, Phase, Track } from './types';

export class ContentPackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentPackError';
  }
}

/** Parse a prompt like "6 × 7", "42 ÷ 6", "20 × 3" and compute its value, so
 *  we can cross-check the declared answer. Returns null if unparseable. */
export function computeFromPrompt(prompt: string): number | null {
  const m = prompt.match(/^\s*(\d+)\s*([×x*÷/+\-−])\s*(\d+)\s*$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[3]);
  const op = m[2];
  switch (op) {
    case '×':
    case 'x':
    case '*':
      return a * b;
    case '÷':
    case '/':
      if (b === 0) return null;
      if (a % b !== 0) return null; // drill facts must divide evenly
      return a / b;
    case '+':
      return a + b;
    case '-':
    case '−':
      if (a < b) return null; // grade-3 mental math stays non-negative
      return a - b;
    default:
      return null;
  }
}

function validateEngineConfig(cfg: EngineConfig): void {
  if (!cfg) throw new ContentPackError('engine_config missing');
  const need = [
    cfg.latency_gate_seconds,
    cfg.mastery?.take_off?.consecutive_correct_within_gate,
    cfg.mastery?.orbit?.window_attempts,
    cfg.mastery?.orbit?.max_errors,
    cfg.mastery?.universe?.window_attempts,
    cfg.mastery?.universe?.max_errors,
    cfg.interleave_rules?.recent_miss_weight,
  ];
  if (need.some((v) => typeof v !== 'number' || Number.isNaN(v))) {
    throw new ContentPackError('engine_config has missing/invalid numeric fields');
  }
}

/** Validate a pack. Throws ContentPackError on the first problem found. */
export function validatePack(pack: ContentPack): void {
  if (!pack || typeof pack !== 'object') throw new ContentPackError('pack is not an object');
  if (!Array.isArray(pack.tracks) || pack.tracks.length === 0) {
    throw new ContentPackError('pack.tracks must be a non-empty array');
  }
  validateEngineConfig(pack.engine_config);

  const seenFactIds = new Set<string>();
  for (const track of pack.tracks) {
    if (!track.trackId) throw new ContentPackError('a track is missing trackId');
    if (!Array.isArray(track.levels) || track.levels.length === 0) {
      throw new ContentPackError(`track ${track.trackId} has no levels`);
    }
    const seenLevels = new Set<string>();
    for (const level of track.levels) {
      if (!level.level) throw new ContentPackError(`track ${track.trackId} has a level without a name`);
      if (seenLevels.has(level.level)) {
        throw new ContentPackError(`track ${track.trackId} duplicate level ${level.level}`);
      }
      seenLevels.add(level.level);
      if (!Array.isArray(level.new_facts) || level.new_facts.length === 0) {
        throw new ContentPackError(`track ${track.trackId} level ${level.level} has no new_facts`);
      }
      for (const fact of level.new_facts) {
        validateFact(track, level.level, fact, seenFactIds);
      }
    }
  }
}

function validateFact(
  track: Track,
  level: string,
  fact: Fact,
  seenFactIds: Set<string>,
): void {
  const where = `${track.trackId}/${level}`;
  if (!fact.id) throw new ContentPackError(`${where}: fact missing id`);
  if (seenFactIds.has(fact.id)) {
    throw new ContentPackError(`${where}: duplicate fact id ${fact.id}`);
  }
  seenFactIds.add(fact.id);
  if (typeof fact.answer !== 'number' || Number.isNaN(fact.answer)) {
    throw new ContentPackError(`${where}: fact ${fact.id} answer is not a number`);
  }
  if (fact.learningType !== 'fact_recall' && fact.learningType !== 'pattern') {
    throw new ContentPackError(`${where}: fact ${fact.id} has invalid learningType`);
  }
  const computed = computeFromPrompt(fact.prompt);
  if (computed === null) {
    throw new ContentPackError(`${where}: fact ${fact.id} prompt "${fact.prompt}" is not computable`);
  }
  if (computed !== fact.answer) {
    throw new ContentPackError(
      `${where}: fact ${fact.id} answer ${fact.answer} != computed ${computed} from "${fact.prompt}"`,
    );
  }
}

// ----- track / level helpers ------------------------------------------------

export function getTrack(pack: ContentPack, trackId: string): Track {
  const t = pack.tracks.find((x) => x.trackId === trackId);
  if (!t) throw new ContentPackError(`unknown track ${trackId}`);
  return t;
}

export function getEnabledTracks(pack: ContentPack): Track[] {
  return pack.tracks.filter((t) => t.enabled);
}

export function levelIndex(track: Track, level: string): number {
  const idx = track.levels.findIndex((l) => l.level === level);
  if (idx < 0) throw new ContentPackError(`track ${track.trackId} has no level ${level}`);
  return idx;
}

export function newFactsOf(track: Track, level: string): Fact[] {
  return track.levels[levelIndex(track, level)].new_facts;
}

/** The next level letter after `level`, or null if `level` is the last. */
export function nextLevel(track: Track, level: string): string | null {
  const idx = levelIndex(track, level);
  return idx + 1 < track.levels.length ? track.levels[idx + 1].level : null;
}

// ----- DERIVED pools (SPEC §4) ----------------------------------------------

function dedupeFacts(facts: Fact[]): Fact[] {
  const seen = new Set<string>();
  const out: Fact[] = [];
  for (const f of facts) {
    if (!seen.has(f.id)) {
      seen.add(f.id);
      out.push(f);
    }
  }
  return out;
}

/** take_off pool = current level's new_facts only. */
export function takeOffPool(track: Track, level: string): Fact[] {
  return newFactsOf(track, level);
}

/** orbit pool = current level new_facts ∪ previous level new_facts. */
export function orbitPool(track: Track, level: string): Fact[] {
  const idx = levelIndex(track, level);
  const facts = [...newFactsOf(track, level)];
  if (idx > 0) facts.push(...track.levels[idx - 1].new_facts);
  return dedupeFacts(facts);
}

/** universe pool = union of new_facts from A..current level. */
export function universePool(track: Track, level: string): Fact[] {
  const idx = levelIndex(track, level);
  const facts: Fact[] = [];
  for (let i = 0; i <= idx; i++) facts.push(...track.levels[i].new_facts);
  return dedupeFacts(facts);
}

/** Pool of every fact learned up to & including the current level — used by
 *  milestone races (SPEC §5). Same set as universePool for the active level. */
export function learnedPool(track: Track, level: string): Fact[] {
  return universePool(track, level);
}

export function poolForPhase(track: Track, level: string, phase: Phase): Fact[] {
  switch (phase) {
    case 'take_off':
      return takeOffPool(track, level);
    case 'orbit':
      return orbitPool(track, level);
    case 'universe':
      return universePool(track, level);
  }
}

export function factById(track: Track, factId: string): Fact | undefined {
  for (const level of track.levels) {
    const f = level.new_facts.find((x) => x.id === factId);
    if (f) return f;
  }
  return undefined;
}

// ----- individualized latency gate (SPEC §5) --------------------------------

/** Compute the personalised latency gate (ms) from a tapping-speed probe:
 *  median response time × multiplier, clamped to [min, max]. */
export function computeLatencyGateMs(probeTimesMs: number[], cfg: EngineConfig): number {
  const g = cfg.individualized_goal;
  const minMs = g.min_gate_seconds * 1000;
  const maxMs = g.max_gate_seconds * 1000;
  if (probeTimesMs.length === 0) {
    return cfg.latency_gate_seconds * 1000;
  }
  const sorted = [...probeTimesMs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const gate = median * g.latency_multiplier;
  return Math.min(maxMs, Math.max(minMs, gate));
}
