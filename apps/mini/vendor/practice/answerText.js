"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.responseText = responseText;
exports.correctText = correctText;
function responseText(problem, r) {
    var _a, _b, _c;
    if (r.kind === 'choice') {
        return (_c = (_b = (_a = problem.choices) === null || _a === void 0 ? void 0 : _a.find((c) => c.id === r.choiceId)) === null || _b === void 0 ? void 0 : _b.label) !== null && _c !== void 0 ? _c : r.choiceId;
    }
    if (r.kind === 'value')
        return r.value;
    // fields
    if (problem.fields) {
        return problem.fields.map((f, i) => { var _a; return `${f.label} ${(_a = r.values[f.id || `f${i}`]) !== null && _a !== void 0 ? _a : '?'}`; }).join(' , ');
    }
    return Object.values(r.values).join(' , ');
}
function correctText(problem) {
    var _a, _b, _c, _d, _e;
    if (problem.type === 'mc')
        return (_c = (_b = (_a = problem.choices) === null || _a === void 0 ? void 0 : _a.find((c) => c.correct)) === null || _b === void 0 ? void 0 : _b.label) !== null && _c !== void 0 ? _c : '';
    if (problem.type === 'fill')
        return String((_d = problem.answer) !== null && _d !== void 0 ? _d : '');
    if (problem.type === 'steps')
        return ((_e = problem.fields) !== null && _e !== void 0 ? _e : []).map((f) => `${f.label} ${f.answer}`).join(' , ');
    return '';
}
