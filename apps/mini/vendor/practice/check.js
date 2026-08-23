"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAnswer = checkAnswer;
function numEq(expected, got) {
    const v = Number(String(got).trim());
    return Number.isFinite(v) && v === expected;
}
function valueEq(expected, got) {
    if (typeof expected === 'number')
        return numEq(expected, got);
    return String(expected).trim() === got.trim();
}
function checkAnswer(problem, response) {
    var _a;
    switch (problem.type) {
        case 'mc':
            return (response.kind === 'choice' &&
                !!((_a = problem.choices) === null || _a === void 0 ? void 0 : _a.some((c) => c.id === response.choiceId && c.correct)));
        case 'fill':
            return response.kind === 'value' && problem.answer !== undefined && valueEq(problem.answer, response.value);
        case 'steps': {
            if (response.kind !== 'fields' || !problem.fields)
                return false;
            return problem.fields.every((f, i) => {
                const got = response.values[f.id || `f${i}`];
                return got !== undefined && valueEq(f.answer, got);
            });
        }
    }
}
