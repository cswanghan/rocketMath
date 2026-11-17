"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialLockState = void 0;
exports.isLocked = isLocked;
exports.tickLock = tickLock;
exports.remainingBreakMs = remainingBreakMs;
exports.initialLockState = { playedMs: 0, lockUntil: null };
function isLocked(s, now) {
    return s.lockUntil !== null && now < s.lockUntil;
}
/** Advance the lock by `deltaMs` of active play. Returns the next state. */
function tickLock(s, deltaMs, now, cfg) {
    if (!cfg || !cfg.enabled)
        return s;
    if (s.lockUntil !== null) {
        // currently (or just finished) a break
        if (now >= s.lockUntil)
            return { playedMs: 0, lockUntil: null };
        return s;
    }
    const playedMs = s.playedMs + Math.max(0, deltaMs);
    if (playedMs >= cfg.play_minutes * 60000) {
        return { playedMs, lockUntil: now + cfg.break_minutes * 60000 };
    }
    return { playedMs, lockUntil: null };
}
/** Remaining break time in ms (0 if not locked). */
function remainingBreakMs(s, now) {
    if (!isLocked(s, now))
        return 0;
    return Math.max(0, s.lockUntil - now);
}
