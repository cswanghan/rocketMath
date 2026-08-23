"use strict";
// Content-pack loading, validation and DERIVED pool computation.
//
// The engine knows nothing about *what* it teaches — it only trusts the pack.
// Per SPEC §4: validation must run at load time (shape + every fact's answer
// must be computable from its prompt) and fail loudly, never silently.
// orbit/universe pools are DERIVED here from interleave_rules, never enumerated
// in the JSON.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentPackError = void 0;
exports.computeFromPrompt = computeFromPrompt;
exports.validatePack = validatePack;
exports.getTrack = getTrack;
exports.getEnabledTracks = getEnabledTracks;
exports.levelIndex = levelIndex;
exports.newFactsOf = newFactsOf;
exports.nextLevel = nextLevel;
exports.takeOffPool = takeOffPool;
exports.orbitPool = orbitPool;
exports.universePool = universePool;
exports.learnedPool = learnedPool;
exports.poolForPhase = poolForPhase;
exports.factById = factById;
exports.computeLatencyGateMs = computeLatencyGateMs;
class ContentPackError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ContentPackError';
    }
}
exports.ContentPackError = ContentPackError;
/** Parse a prompt like "6 × 7", "42 ÷ 6", "20 × 3" and compute its value, so
 *  we can cross-check the declared answer. Returns null if unparseable. */
function computeFromPrompt(prompt) {
    const m = prompt.match(/^\s*(\d+)\s*([×x*÷/+\-−])\s*(\d+)\s*$/);
    if (!m)
        return null;
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
            if (b === 0)
                return null;
            if (a % b !== 0)
                return null; // drill facts must divide evenly
            return a / b;
        case '+':
            return a + b;
        case '-':
        case '−':
            if (a < b)
                return null; // grade-3 mental math stays non-negative
            return a - b;
        default:
            return null;
    }
}
function validateEngineConfig(cfg) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    if (!cfg)
        throw new ContentPackError('engine_config missing');
    const need = [
        cfg.latency_gate_seconds,
        (_b = (_a = cfg.mastery) === null || _a === void 0 ? void 0 : _a.take_off) === null || _b === void 0 ? void 0 : _b.consecutive_correct_within_gate,
        (_d = (_c = cfg.mastery) === null || _c === void 0 ? void 0 : _c.orbit) === null || _d === void 0 ? void 0 : _d.window_attempts,
        (_f = (_e = cfg.mastery) === null || _e === void 0 ? void 0 : _e.orbit) === null || _f === void 0 ? void 0 : _f.max_errors,
        (_h = (_g = cfg.mastery) === null || _g === void 0 ? void 0 : _g.universe) === null || _h === void 0 ? void 0 : _h.window_attempts,
        (_k = (_j = cfg.mastery) === null || _j === void 0 ? void 0 : _j.universe) === null || _k === void 0 ? void 0 : _k.max_errors,
        (_l = cfg.interleave_rules) === null || _l === void 0 ? void 0 : _l.recent_miss_weight,
    ];
    if (need.some((v) => typeof v !== 'number' || Number.isNaN(v))) {
        throw new ContentPackError('engine_config has missing/invalid numeric fields');
    }
}
/** Validate a pack. Throws ContentPackError on the first problem found. */
function validatePack(pack) {
    if (!pack || typeof pack !== 'object')
        throw new ContentPackError('pack is not an object');
    if (!Array.isArray(pack.tracks) || pack.tracks.length === 0) {
        throw new ContentPackError('pack.tracks must be a non-empty array');
    }
    validateEngineConfig(pack.engine_config);
    const seenFactIds = new Set();
    for (const track of pack.tracks) {
        if (!track.trackId)
            throw new ContentPackError('a track is missing trackId');
        if (!Array.isArray(track.levels) || track.levels.length === 0) {
            throw new ContentPackError(`track ${track.trackId} has no levels`);
        }
        const seenLevels = new Set();
        for (const level of track.levels) {
            if (!level.level)
                throw new ContentPackError(`track ${track.trackId} has a level without a name`);
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
function validateFact(track, level, fact, seenFactIds) {
    const where = `${track.trackId}/${level}`;
    if (!fact.id)
        throw new ContentPackError(`${where}: fact missing id`);
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
    if (computed !== null && computed !== fact.answer) {
        throw new ContentPackError(`${where}: fact ${fact.id} answer ${fact.answer} != computed ${computed} from "${fact.prompt}"`);
    }
}
// ----- track / level helpers ------------------------------------------------
function getTrack(pack, trackId) {
    const t = pack.tracks.find((x) => x.trackId === trackId);
    if (!t)
        throw new ContentPackError(`unknown track ${trackId}`);
    return t;
}
function getEnabledTracks(pack) {
    return pack.tracks.filter((t) => t.enabled);
}
function levelIndex(track, level) {
    const idx = track.levels.findIndex((l) => l.level === level);
    if (idx < 0)
        throw new ContentPackError(`track ${track.trackId} has no level ${level}`);
    return idx;
}
function newFactsOf(track, level) {
    return track.levels[levelIndex(track, level)].new_facts;
}
/** The next level letter after `level`, or null if `level` is the last. */
function nextLevel(track, level) {
    const idx = levelIndex(track, level);
    return idx + 1 < track.levels.length ? track.levels[idx + 1].level : null;
}
// ----- DERIVED pools (SPEC §4) ----------------------------------------------
function dedupeFacts(facts) {
    const seen = new Set();
    const out = [];
    for (const f of facts) {
        if (!seen.has(f.id)) {
            seen.add(f.id);
            out.push(f);
        }
    }
    return out;
}
/** take_off pool = current level's new_facts only. */
function takeOffPool(track, level) {
    return newFactsOf(track, level);
}
/** orbit pool = current level new_facts ∪ previous level new_facts. */
function orbitPool(track, level) {
    const idx = levelIndex(track, level);
    const facts = [...newFactsOf(track, level)];
    if (idx > 0)
        facts.push(...track.levels[idx - 1].new_facts);
    return dedupeFacts(facts);
}
/** universe pool = union of new_facts from A..current level. */
function universePool(track, level) {
    const idx = levelIndex(track, level);
    const facts = [];
    for (let i = 0; i <= idx; i++)
        facts.push(...track.levels[i].new_facts);
    return dedupeFacts(facts);
}
/** Pool of every fact learned up to & including the current level — used by
 *  milestone races (SPEC §5). Same set as universePool for the active level. */
function learnedPool(track, level) {
    return universePool(track, level);
}
function poolForPhase(track, level, phase) {
    switch (phase) {
        case 'take_off':
            return takeOffPool(track, level);
        case 'orbit':
            return orbitPool(track, level);
        case 'universe':
            return universePool(track, level);
    }
}
function factById(track, factId) {
    for (const level of track.levels) {
        const f = level.new_facts.find((x) => x.id === factId);
        if (f)
            return f;
    }
    return undefined;
}
// ----- individualized latency gate (SPEC §5) --------------------------------
/** Compute the personalised latency gate (ms) from a tapping-speed probe:
 *  median response time × multiplier, clamped to [min, max]. */
function computeLatencyGateMs(probeTimesMs, cfg) {
    const g = cfg.individualized_goal;
    const minMs = g.min_gate_seconds * 1000;
    const maxMs = g.max_gate_seconds * 1000;
    if (probeTimesMs.length === 0) {
        return cfg.latency_gate_seconds * 1000;
    }
    const sorted = [...probeTimesMs].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    const gate = median * g.latency_multiplier;
    return Math.min(maxMs, Math.max(minMs, gate));
}
