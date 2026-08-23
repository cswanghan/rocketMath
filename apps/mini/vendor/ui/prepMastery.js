"use strict";
// 备考清单的掌握度聚合：组合现有 adapter 接口，把一个 Topic 归约为四态。
// 存储层零改动——口算走 getTrackState、练习走 getPractice，与 KnowledgeMap 判定一致。
Object.defineProperty(exports, "__esModule", { value: true });
exports.MASTERY_LABEL = void 0;
exports.topicMastery = topicMastery;
const engine_1 = require("../engine");
exports.MASTERY_LABEL = {
    mastered: '已掌握',
    in_progress: '进行中',
    not_started: '未开始',
    unavailable: '内容建设中',
};
function fluencyLevelCount(pack, trackId) {
    try {
        return (0, engine_1.getTrack)(pack, trackId).levels.length;
    }
    catch (_a) {
        return 0;
    }
}
/** 单个 topic 的掌握状态。topic 来自其所在年级的 knowledgeMap，pack 为同年级口算包。 */
async function topicMastery(adapter, studentId, pack, topic) {
    var _a, _b;
    if (topic.status !== 'ready')
        return 'unavailable';
    if (topic.fluencyTrackId) {
        const total = fluencyLevelCount(pack, topic.fluencyTrackId);
        if (total === 0)
            return 'unavailable';
        const state = await adapter.getTrackState(studentId, topic.fluencyTrackId);
        const done = (_b = (_a = state === null || state === void 0 ? void 0 : state.completedLevels) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
        if (done >= total)
            return 'mastered';
        return done > 0 ? 'in_progress' : 'not_started';
    }
    if (topic.problemSetId) {
        const rec = await adapter.getPractice(studentId, topic.problemSetId);
        if (rec === null || rec === void 0 ? void 0 : rec.completed)
            return 'mastered';
        return rec && rec.bestFirstTry > 0 ? 'in_progress' : 'not_started';
    }
    return 'unavailable';
}
