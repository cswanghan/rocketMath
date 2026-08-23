"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.practiceInit = practiceInit;
exports.practiceStep = practiceStep;
// Practice reducer: practiceStep(state, event, ctx) -> { state, action }.
// Untimed mastery loop: shuffle the set, present one problem at a time; a wrong
// answer gives a hint and lets you retry (no penalty); after maxTries the answer
// is revealed. The set completes once every problem has been worked through.
const check_1 = require("./check");
const types_1 = require("./types");
const DEFAULT_MAX_TRIES = 2;
function shuffleInPlace(a, rng) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
/** Serve problems as "关卡": basic → consolidate → challenge, shuffled within
 *  each tier so the difficulty ramps up across the topic. */
function tieredOrder(set, rng) {
    const order = [];
    for (const tier of types_1.DIFFICULTY_ORDER) {
        const idx = set.problems
            .map((p, i) => [p, i])
            .filter(([p]) => { var _a; return ((_a = p.difficulty) !== null && _a !== void 0 ? _a : 'consolidate') === tier; })
            .map(([, i]) => i);
        order.push(...shuffleInPlace(idx, rng));
    }
    return order;
}
function practiceInit(set, rng) {
    return {
        setId: set.id,
        order: tieredOrder(set, rng),
        index: -1,
        tries: 0,
        firstTryCorrect: 0,
        status: 'active',
    };
}
function practiceStep(state, event, ctx) {
    var _a;
    if (event.type === 'NEXT')
        return advance(state, ctx);
    // ANSWER — must have a presented problem
    const problem = ctx.set.problems[state.order[state.index]];
    const correct = (0, check_1.checkAnswer)(problem, event.response);
    if (correct) {
        const firstTry = state.tries === 0;
        return {
            state: Object.assign(Object.assign({}, state), { firstTryCorrect: state.firstTryCorrect + (firstTry ? 1 : 0) }),
            action: { kind: 'CORRECT', problem, firstTry },
        };
    }
    const tries = state.tries + 1;
    const maxTries = (_a = ctx.set.maxTries) !== null && _a !== void 0 ? _a : DEFAULT_MAX_TRIES;
    if (tries >= maxTries) {
        return { state: Object.assign(Object.assign({}, state), { tries }), action: { kind: 'REVEAL', problem } };
    }
    return { state: Object.assign(Object.assign({}, state), { tries }), action: { kind: 'WRONG', problem, tries } };
}
function advance(state, ctx) {
    const nextIndex = state.index + 1;
    if (nextIndex >= state.order.length) {
        return {
            state: Object.assign(Object.assign({}, state), { status: 'complete' }),
            action: { kind: 'SET_COMPLETE', firstTryCorrect: state.firstTryCorrect, total: state.order.length },
        };
    }
    return {
        state: Object.assign(Object.assign({}, state), { index: nextIndex, tries: 0 }),
        action: { kind: 'PRESENT', problem: ctx.set.problems[state.order[nextIndex]] },
    };
}
