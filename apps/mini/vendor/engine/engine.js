"use strict";
// The core reducer: step(state, event, ctx) -> { state, action }.
//
// Pure, deterministic, zero side effects. This is the foundation (SPEC §5, §8
// M1) — every state-machine rule below maps to a test in engine.test.ts.
//
// Flow contract (how the UI drives it):
//   - NEXT      -> PROMPT (next question for the current phase / pending retest)
//   - ANSWER    -> on a clean hit: PROMPT (next) | PHASE_COMPLETE | LEVEL_COMPLETE
//                  on a miss:      CORRECTION (re-teach + immediate retest)
//   - START_RACE-> PROMPT (first race question); subsequent ANSWERs tally until
//                  ctx.now() passes the race end, then RACE_RESULT.
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTrackState = initTrackState;
exports.step = step;
const contentPack_1 = require("./contentPack");
const select_1 = require("./select");
function initTrackState(trackId, startLevel = 'A') {
    return {
        trackId,
        currentLevel: startLevel,
        phase: 'take_off',
        streak: 0,
        attempts: 0,
        errors: 0,
        pendingRetest: null,
        factStats: {},
        completedLevels: [],
    };
}
function recordStat(stats, id, u) {
    var _a;
    const prev = (_a = stats[id]) !== null && _a !== void 0 ? _a : { seen: 0, correct: 0 };
    const next = {
        seen: prev.seen + 1,
        correct: prev.correct + (u.correct ? 1 : 0),
    };
    if (u.missAt !== undefined) {
        next.lastMissAt = u.missAt;
    }
    else if (!u.clearMiss && prev.lastMissAt !== undefined) {
        next.lastMissAt = prev.lastMissAt;
    }
    return Object.assign(Object.assign({}, stats), { [id]: next });
}
function isHit(fact, value, elapsedMs, gateMs) {
    // A hit requires both correctness AND being within the latency gate.
    // Wrong answer OR timeout (elapsedMs > gate) => miss.
    return value === fact.answer && elapsedMs <= gateMs;
}
// ----- public reducer -------------------------------------------------------
function step(state, event, ctx) {
    switch (event.type) {
        case 'START_RACE':
            return startRace(state, event.durationMs, ctx);
        case 'NEXT':
            return handleNext(state, ctx);
        case 'ANSWER':
            return handleAnswer(state, event, ctx);
    }
}
// ----- NEXT -----------------------------------------------------------------
function handleNext(state, ctx) {
    const track = (0, contentPack_1.getTrack)(ctx.pack, state.trackId);
    if (state.race) {
        if (ctx.now() >= state.race.endsAt)
            return finishRace(state);
        const pool = (0, contentPack_1.learnedPool)(track, state.currentLevel);
        return {
            state,
            action: { kind: 'PROMPT', fact: (0, select_1.pickFact)(pool, state, selCtx(ctx)) },
        };
    }
    if (state.pendingRetest) {
        const fact = (0, contentPack_1.factById)(track, state.pendingRetest);
        return { state, action: { kind: 'PROMPT', fact } };
    }
    const pool = (0, contentPack_1.poolForPhase)(track, state.currentLevel, state.phase);
    return { state, action: { kind: 'PROMPT', fact: (0, select_1.pickFact)(pool, state, selCtx(ctx)) } };
}
function selCtx(ctx) {
    return {
        rng: ctx.rng,
        recentMissWeight: ctx.pack.engine_config.interleave_rules.recent_miss_weight,
    };
}
// ----- ANSWER ---------------------------------------------------------------
function handleAnswer(state, event, ctx) {
    if (state.race)
        return handleRaceAnswer(state, event, ctx);
    const track = (0, contentPack_1.getTrack)(ctx.pack, state.trackId);
    const gate = ctx.latencyGateMs;
    // --- correction loop: an immediate retest is pending ---------------------
    if (state.pendingRetest) {
        const fact = (0, contentPack_1.factById)(track, state.pendingRetest);
        const hit = isHit(fact, event.value, event.elapsedMs, gate);
        if (hit) {
            // Redeemed. Does NOT count toward streak / attempts / errors.
            const factStats = recordStat(state.factStats, fact.id, { correct: true, clearMiss: true });
            const nextState = Object.assign(Object.assign({}, state), { factStats, pendingRetest: null });
            const pool = (0, contentPack_1.poolForPhase)(track, nextState.currentLevel, nextState.phase);
            return {
                state: nextState,
                action: { kind: 'PROMPT', fact: (0, select_1.pickFact)(pool, nextState, selCtx(ctx), fact.id) },
            };
        }
        // Still missed: re-teach again, keep the retest pending.
        const factStats = recordStat(state.factStats, fact.id, { correct: false, missAt: ctx.now() });
        return { state: Object.assign(Object.assign({}, state), { factStats }), action: { kind: 'CORRECTION', fact } };
    }
    // --- normal answer -------------------------------------------------------
    const fact = (0, contentPack_1.factById)(track, event.factId);
    const hit = isHit(fact, event.value, event.elapsedMs, gate);
    if (!hit)
        return registerMiss(state, fact, ctx);
    return registerHit(state, fact, track, ctx);
}
function registerMiss(state, fact, ctx) {
    const factStats = recordStat(state.factStats, fact.id, { correct: false, missAt: ctx.now() });
    const cfg = ctx.pack.engine_config.mastery;
    let next = Object.assign(Object.assign({}, state), { factStats, pendingRetest: fact.id });
    if (state.phase === 'take_off') {
        next.streak = 0; // consecutive-correct resets on a miss
    }
    else {
        // orbit / universe: the miss counts toward the window
        const max = cfg[state.phase].max_errors;
        let attempts = state.attempts + 1;
        let errors = state.errors + 1;
        if (errors > max) {
            // failed this window — restart the test
            attempts = 0;
            errors = 0;
        }
        next.attempts = attempts;
        next.errors = errors;
    }
    return { state: next, action: { kind: 'CORRECTION', fact } };
}
function registerHit(state, fact, track, ctx) {
    const factStats = recordStat(state.factStats, fact.id, { correct: true, clearMiss: true });
    const cfg = ctx.pack.engine_config.mastery;
    if (state.phase === 'take_off') {
        const streak = state.streak + 1;
        if (streak >= cfg.take_off.consecutive_correct_within_gate) {
            // Take-Off mastered -> advance to Orbit.
            const next = Object.assign(Object.assign({}, state), { factStats, phase: 'orbit', streak: 0, attempts: 0, errors: 0 });
            return { state: next, action: { kind: 'PHASE_COMPLETE', phase: 'take_off' } };
        }
        const next = Object.assign(Object.assign({}, state), { factStats, streak });
        return promptNext(next, fact.id, ctx);
    }
    // orbit / universe
    const phase = state.phase;
    const window = cfg[phase].window_attempts;
    const max = cfg[phase].max_errors;
    const attempts = state.attempts + 1;
    if (attempts >= window && state.errors <= max) {
        if (phase === 'orbit') {
            const next = Object.assign(Object.assign({}, state), { factStats, phase: 'universe', attempts: 0, errors: 0 });
            return { state: next, action: { kind: 'PHASE_COMPLETE', phase: 'orbit' } };
        }
        // universe mastered -> level complete
        return completeLevel(Object.assign(Object.assign({}, state), { factStats }), track, ctx);
    }
    const next = Object.assign(Object.assign({}, state), { factStats, attempts });
    return promptNext(next, fact.id, ctx);
}
function completeLevel(state, track, ctx) {
    const finished = state.currentLevel;
    const completedLevels = state.completedLevels.includes(finished)
        ? state.completedLevels
        : [...state.completedLevels, finished];
    const upcoming = (0, contentPack_1.nextLevel)(track, finished);
    let next;
    if (upcoming) {
        next = Object.assign(Object.assign({}, state), { completedLevels, currentLevel: upcoming, phase: 'take_off', streak: 0, attempts: 0, errors: 0 });
    }
    else {
        // last level done — stay put; the whole track is mastered.
        next = Object.assign(Object.assign({}, state), { completedLevels, attempts: 0, errors: 0 });
    }
    void ctx;
    return { state: next, action: { kind: 'LEVEL_COMPLETE', level: finished } };
}
function promptNext(state, excludeId, ctx) {
    const track = (0, contentPack_1.getTrack)(ctx.pack, state.trackId);
    const pool = (0, contentPack_1.poolForPhase)(track, state.currentLevel, state.phase);
    return {
        state,
        action: { kind: 'PROMPT', fact: (0, select_1.pickFact)(pool, state, selCtx(ctx), excludeId) },
    };
}
// ----- RACE -----------------------------------------------------------------
function startRace(state, durationMs, ctx) {
    const track = (0, contentPack_1.getTrack)(ctx.pack, state.trackId);
    const race = { endsAt: ctx.now() + durationMs, correct: 0, answered: 0, durationMs };
    const next = Object.assign(Object.assign({}, state), { race });
    const pool = (0, contentPack_1.learnedPool)(track, state.currentLevel);
    return { state: next, action: { kind: 'PROMPT', fact: (0, select_1.pickFact)(pool, next, selCtx(ctx)) } };
}
function handleRaceAnswer(state, event, ctx) {
    const race = state.race;
    if (ctx.now() >= race.endsAt)
        return finishRace(state);
    const track = (0, contentPack_1.getTrack)(ctx.pack, state.trackId);
    const fact = (0, contentPack_1.factById)(track, event.factId);
    const correct = event.value === fact.answer; // race scores correctness only
    const factStats = recordStat(state.factStats, fact.id, { correct });
    const nextRace = Object.assign(Object.assign({}, race), { answered: race.answered + 1, correct: race.correct + (correct ? 1 : 0) });
    const next = Object.assign(Object.assign({}, state), { factStats, race: nextRace });
    if (ctx.now() >= nextRace.endsAt)
        return finishRace(next);
    const pool = (0, contentPack_1.learnedPool)(track, next.currentLevel);
    return {
        state: next,
        action: { kind: 'PROMPT', fact: (0, select_1.pickFact)(pool, next, selCtx(ctx), fact.id) },
    };
}
function finishRace(state) {
    const race = state.race;
    const minutes = race.durationMs / 60000;
    const correctPerMin = minutes > 0 ? race.correct / minutes : 0;
    const { race: _drop } = state, rest = __rest(state, ["race"]);
    void _drop;
    return { state: rest, action: { kind: 'RACE_RESULT', correctPerMin } };
}
