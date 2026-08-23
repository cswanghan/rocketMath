"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fmtSec = fmtSec;
exports.summarize = summarize;
exports.localSummaryText = localSummaryText;
exports.llmPayload = llmPayload;
const DIFF_LABEL = {
    basic: '基础',
    consolidate: '夯实',
    challenge: '拔高',
};
function fmtSec(ms) {
    return `${(ms / 1000).toFixed(1)} 秒`;
}
function summarize(mistakes) {
    var _a, _b;
    const active = mistakes.filter((m) => !m.corrected);
    const byTopic = new Map();
    for (const m of active) {
        let t = byTopic.get(m.topicTitle);
        if (!t) {
            t = { topicTitle: m.topicTitle, count: 0, wrong: 0, slow: 0, byDifficulty: {}, maxMs: 0, avgMs: 0, examples: [], _sumMs: 0, _nMs: 0 };
            byTopic.set(m.topicTitle, t);
        }
        t.count++;
        if (m.slow)
            t.slow++;
        else
            t.wrong++;
        const d = (_a = m.difficulty) !== null && _a !== void 0 ? _a : 'fluency';
        t.byDifficulty[d] = ((_b = t.byDifficulty[d]) !== null && _b !== void 0 ? _b : 0) + 1;
        if (typeof m.elapsedMs === 'number') {
            t._sumMs += m.elapsedMs;
            t._nMs++;
            if (m.elapsedMs > t.maxMs)
                t.maxMs = m.elapsedMs;
        }
        if (t.examples.length < 3) {
            t.examples.push({ prompt: m.prompt, yourAnswer: m.yourAnswer, correctAnswer: m.correctAnswer, elapsedMs: m.elapsedMs, slow: m.slow });
        }
    }
    const topics = [...byTopic.values()]
        .map((t) => (Object.assign(Object.assign({}, t), { avgMs: t._nMs ? Math.round(t._sumMs / t._nMs) : 0 })))
        .sort((a, b) => b.count - a.count);
    const slowest = active
        .filter((m) => typeof m.elapsedMs === 'number')
        .sort((a, b) => { var _a, _b; return ((_a = b.elapsedMs) !== null && _a !== void 0 ? _a : 0) - ((_b = a.elapsedMs) !== null && _b !== void 0 ? _b : 0); })
        .slice(0, 5)
        .map((m) => ({ topicTitle: m.topicTitle, prompt: m.prompt, elapsedMs: m.elapsedMs }));
    return {
        total: active.length,
        wrongTotal: active.filter((m) => !m.slow).length,
        slowTotal: active.filter((m) => m.slow).length,
        topics,
        slowest,
    };
}
/** Deterministic, offline parent summary — also the fallback when the LLM
 *  endpoint is unavailable. */
function localSummaryText(s) {
    if (s.total === 0)
        return '太棒了!目前没有需要关注的错题或耗时偏长的题。继续保持 👍';
    const lines = [];
    lines.push(`共有 ${s.total} 道需要关注:答错 ${s.wrongTotal} 道,答对但偏慢 ${s.slowTotal} 道。`);
    lines.push('');
    lines.push('📌 最需要加强的知识点:');
    for (const t of s.topics.slice(0, 3)) {
        const diffs = Object.entries(t.byDifficulty)
            .map(([d, n]) => { var _a; return `${(_a = DIFF_LABEL[d]) !== null && _a !== void 0 ? _a : d} ${n}`; })
            .join('、');
        const time = t.maxMs ? `,平均 ${fmtSec(t.avgMs)}、最长 ${fmtSec(t.maxMs)}` : '';
        lines.push(`• ${t.topicTitle}:错 ${t.wrong}、慢 ${t.slow}(${diffs}${time})`);
    }
    if (s.slowest.length) {
        lines.push('');
        lines.push('⏱ 耗时最长的题:');
        for (const x of s.slowest.slice(0, 3)) {
            lines.push(`• ${x.topicTitle}:${x.prompt.replace(/\n/g, ' ')} —— ${fmtSec(x.elapsedMs)}`);
        }
    }
    lines.push('');
    lines.push('💡 建议:答错的题先弄懂方法再用「基础关」巩固;耗时偏长说明还不够熟练,可针对性多练几遍提速。');
    return lines.join('\n');
}
/** Compact, privacy-light payload for the LLM (no PII; topic + time + samples). */
function llmPayload(s) {
    return {
        total: s.total,
        wrongTotal: s.wrongTotal,
        slowTotal: s.slowTotal,
        topics: s.topics.slice(0, 8).map((t) => ({
            topic: t.topicTitle,
            wrong: t.wrong,
            slow: t.slow,
            byDifficulty: t.byDifficulty,
            avgSeconds: t.avgMs ? +(t.avgMs / 1000).toFixed(1) : undefined,
            maxSeconds: t.maxMs ? +(t.maxMs / 1000).toFixed(1) : undefined,
            examples: t.examples.map((e) => ({
                prompt: e.prompt,
                yourAnswer: e.yourAnswer,
                correctAnswer: e.correctAnswer,
                seconds: e.elapsedMs ? +(e.elapsedMs / 1000).toFixed(1) : undefined,
                slow: e.slow,
            })),
        })),
        slowest: s.slowest.map((x) => ({ topic: x.topicTitle, prompt: x.prompt, seconds: +(x.elapsedMs / 1000).toFixed(1) })),
    };
}
