// 知识地图 —— 对应 Web 端 src/ui/KnowledgeMap.tsx。
//
// WXML 里不能调函数, 所以进度、关卡格子、按钮文案全部在 JS 里算好, 一次性 setData
// 成"可直接渲染的视图模型"。这也顺带避免了每次 onShow 重复遍历 47 个知识点。
const content = require('../../../../utils/content.js');
const family = require('../../../../utils/family.js');
const mapUtil = require('../../../../utils/map.js');
const track = require('../../../../utils/track.js');
const { createDefaultAdapter } = require('../../../../utils/storage.js');
const { getTrack } = require('../../../../vendor/engine');
const { levelFromXp } = require('../../../../vendor/practice');

const GRADE_LABELS = {
  3: '三年级',
  4: '四年级',
  5: '五年级',
  6: '六年级',
  7: '初一',
  8: '初二',
  9: '初三',
};

const TERMS = [
  { key: 'upper', label: '上册' },
  { key: 'lower', label: '下册' },
];

Page({
  data: {
    ready: false,
    grade: 0,
    title: '',
    subtitle: '',
    xp: 0,
    level: null,
    percent: 0,
    terms: [],
  },

  onLoad(query) {
    const grade = Number(query.grade) || content.getGrade() || 3;
    this.grade = grade;
    try {
      this.content = content.loadGrade(grade);
    } catch (e) {
      wx.showModal({
        title: '内容加载失败',
        content: (e && e.message) || '请重新选择年级',
        showCancel: false,
        success: () => wx.redirectTo({ url: '/pages/grade/grade' }),
      });
      return;
    }
    const km = this.content.knowledgeMap;
    const readyCount = km.topics.filter((t) => t.status === 'ready').length;
    wx.setNavigationBarTitle({ title: `${GRADE_LABELS[grade] || grade + '年级'}数学` });
    this.setData({
      grade: grade,
      title: `🚀 ${GRADE_LABELS[grade] || grade + '年级'}数学 · 知识地图`,
      subtitle: `${km.textbook} · ${km.topics.length} 个知识点 · 已上线 ${readyCount}`,
    });
    track.track('map_open', { grade: grade });
  },

  // 从 play/practice 返回时进度会变, 每次显示都重算
  onShow() {
    if (this.content) this.refresh();
  },

  refresh() {
    const km = this.content.knowledgeMap;
    const pack = this.content.pack;
    const adapter = createDefaultAdapter();
    const studentId = family.currentStudentId();

    const readyTopics = km.topics.filter((t) => t.status === 'ready');
    const trackIds = readyTopics.filter((t) => t.fluencyTrackId).map((t) => t.fluencyTrackId);
    const setIds = readyTopics.filter((t) => t.problemSetId).map((t) => t.problemSetId);

    Promise.all([
      Promise.all(trackIds.map((id) => adapter.getTrackState(studentId, id))),
      Promise.all(setIds.map((id) => adapter.getPractice(studentId, id))),
      adapter.getStudent(studentId),
    ]).then((res) => {
      const trackStates = {};
      trackIds.forEach((id, i) => {
        const s = res[0][i];
        trackStates[id] = {
          completed: (s && s.completedLevels) || [],
          current: (s && s.currentLevel) || 'A',
        };
      });
      const pracStates = {};
      setIds.forEach((id, i) => {
        const p = res[1][i];
        pracStates[id] = {
          completed: (p && p.completed) || false,
          bestFirstTry: (p && p.bestFirstTry) || 0,
          total: (p && p.total) || 0,
        };
      });
      const xp = (res[2] && res[2].xp) || 0;
      const lvl = levelFromXp(xp);
      // 没测过手速 → 第一次进口算前先热身 (与 Web 端 App.tsx 的 onPlay 同一判定)
      this.hasGate = !!(res[2] && res[2].latencyGateMs);

      const terms = TERMS.map((term) => ({
        key: term.key,
        label: term.label,
        units: mapUtil.unitsByTerm(km, term.key).map((unit) => ({
          id: unit.id,
          title: (unit.index > 0 ? `${unit.index}. ` : '') + unit.title,
          topics: mapUtil
            .topicsOf(km, unit)
            .map((t) => this.topicVM(t, pack, trackStates, pracStates)),
        })),
      }));

      this.setData({
        ready: true,
        xp: xp,
        level: lvl,
        percent: lvl.span ? Math.round((lvl.intoLevel / lvl.span) * 100) : 0,
        terms: terms,
      });
    });
  },

  /** 单个知识点 → 视图模型。三态: 练习 / 口算 / 未上线。 */
  topicVM(topic, pack, trackStates, pracStates) {
    const base = {
      id: topic.id,
      title: topic.title,
      pedagogy: topic.pedagogy,
      pedLabel: mapUtil.PEDAGOGY_LABEL[topic.pedagogy] || topic.pedagogy,
    };

    if (topic.status === 'ready' && topic.problemSetId) {
      const p = pracStates[topic.problemSetId] || { completed: false, bestFirstTry: 0, total: 0 };
      return Object.assign(base, {
        kind: 'practice',
        setId: topic.problemSetId,
        doneTag: p.completed ? '✓ 完成' : '',
        meta: p.completed ? `最好 ${p.bestFirstTry}/${p.total} 一次答对` : '开始练习 →',
        cells: [],
      });
    }

    if (topic.status !== 'ready' || !topic.fluencyTrackId) {
      return Object.assign(base, { kind: 'soon', cells: [] });
    }

    const trackId = topic.fluencyTrackId;
    const levels = getTrack(pack, trackId).levels.map((l) => l.level);
    const prog = trackStates[trackId] || { completed: [], current: 'A' };
    const cells = levels.map((lv) => ({
      level: lv,
      state: prog.completed.indexOf(lv) >= 0 ? 'done' : lv === prog.current ? 'current' : 'todo',
      text: prog.completed.indexOf(lv) >= 0 ? '★' : lv,
    }));
    return Object.assign(base, {
      kind: 'fluency',
      trackId: trackId,
      doneTag: prog.completed.length === levels.length ? '✓ 全通关' : '',
      meta: `已过 ${prog.completed.length}/${levels.length} 关`,
      cells: cells,
    });
  },

  // ---- 跳转 -----------------------------------------------------------------

  onTopic(e) {
    const d = e.currentTarget.dataset;
    if (d.kind === 'soon') {
      wx.showToast({ title: '这个知识点还在做，敬请期待', icon: 'none' });
      return;
    }
    if (d.kind === 'practice') {
      wx.navigateTo({
        url: `/packages/math/pages/practice/practice?grade=${this.grade}&setId=${d.setid}`,
      });
      return;
    }
    const page = this.hasGate ? 'play/play' : 'probe/probe';
    wx.navigateTo({
      url: `/packages/math/pages/${page}?grade=${this.grade}&trackId=${d.trackid}`,
    });
  },

  onRace(e) {
    const trackId = e.currentTarget.dataset.trackid;
    wx.navigateTo({
      url: `/packages/math/pages/race/race?grade=${this.grade}&trackId=${trackId}`,
    });
  },

  onChangeGrade() {
    wx.redirectTo({ url: '/pages/grade/grade' });
  },

  onBack() {
    wx.switchTab({ url: '/pages/portal/portal' });
  },
});
