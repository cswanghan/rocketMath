"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLUENCY_XP = void 0;
exports.xpForCorrect = xpForCorrect;
exports.xpToReachLevel = xpToReachLevel;
exports.levelFromXp = levelFromXp;
const BASE_XP = {
    basic: 5,
    consolidate: 10,
    challenge: 20,
};
/** XP for a correct Practice answer. First-try doubles it. */
function xpForCorrect(difficulty, firstTry) {
    const base = BASE_XP[difficulty !== null && difficulty !== void 0 ? difficulty : 'consolidate'];
    return firstTry ? base * 2 : base;
}
/** XP for a correct fluency answer (timed drill — no difficulty tiers). */
exports.FLUENCY_XP = 8;
/** Cumulative XP required to REACH level n (n >= 1). Triangular curve:
 *  L1=0, L2=100, L3=300, L4=600, L5=1000, ... (each level needs +100·(n-1)). */
function xpToReachLevel(level) {
    if (level <= 1)
        return 0;
    return (100 * (level - 1) * level) / 2;
}
function levelFromXp(xp) {
    const x = Math.max(0, Math.floor(xp));
    let level = 1;
    while (xpToReachLevel(level + 1) <= x)
        level++;
    const start = xpToReachLevel(level);
    const end = xpToReachLevel(level + 1);
    return {
        level,
        intoLevel: x - start,
        span: end - start,
        toNext: end - x,
    };
}
