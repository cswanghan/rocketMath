"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyOutcome = classifyOutcome;
function classifyOutcome(prev, result) {
    if (prev.race)
        return 'race';
    const wasRetest = prev.pendingRetest !== null;
    const missed = result.kind === 'CORRECTION';
    if (wasRetest)
        return missed ? 'retest_fail' : 'retest_pass';
    return missed ? 'miss' : 'hit';
}
