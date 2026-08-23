// 备考清单 —— 对应 Web 端 src/ui/PrepScreen.tsx。
// 把一场考试的 prepTopics 解析成"可点开去练"的知识点列表, 按年级分组, 每项标掌握度。
//
// 相对 Web 端的取舍:
//   · Web 把 Probe/Play/Practice/背单词 当子视图内嵌渲染; 小程序按页面跳转,
//     所以这里只决定"跳去哪一页", 回来时 onShow 重算掌握度 (Web 是 exitToList 回调)。
//   · 数学练习页在 math 分包、背单词在 lang 分包 —— 跨分包只能跳转不能 require,
//     所以这里不读它们的题集, 只读主包的知识地图 + 流畅度包来判定状态。

const DATA = require('../../content/exam_calendar.js');
const content = require('../../../../utils/content.js');
const family = require('../../../../utils/family.js');
const prep = require('../../../../utils/prep.js');
const track = require('../../../../utils/track.js');
const { createDefaultAdapter } = require('../../../../utils/storage.js');
const { MASTERY_LABEL, topicMastery } = require('../../../../vendor/ui/prepMastery.js');

const GRADE_LABELS = {
  3: '三年级',
  4: '四年级',
  5: '五年级',
  6: '六年级',
  7: '初一',
  8: '初二',
  9: '初三',
};
const gradeLabel = (g) => GRADE_LABELS[g] || `${g}年级`;

const ENGLISH_GROUP = '英语阅读·语法';

const MARK = {
  mastered: '✓',
  in_progress: '◐',
  not_started: '○',
  unavailable: '🔒',
};

Page({
  data: {
    ready: false,
    notFound: false,
    name: '',
    format: '',
    groups: [],
    masteredCount: 0,
    total: 0,
    pct: 0,
    vocab: null, // { label, level } —— KET/PET 才有
    empty: false,
  },

  onLoad(query) {
    this.studentId = family.currentStudentId();
    this.adapter = createDefaultAdapter();
    this.seriesId = query.seriesId || '';

    const series = DATA.series.filter((s) => s.id === this.seriesId)[0];
    if (!series) {
      this.setData({ ready: true, notFound: true });
      return;
    }
    this.series = series;
    track.track('prep_open', { seriesId: this.seriesId });

    // 从首页「继续备考」进来时目标可能还没落过盘, 这里补一次 (幂等)
    prep.savePrepTargetWithName(this.studentId, series.id, series.name);
    wx.setNavigationBarTitle({ title: `备考 · ${series.name}` });

    this.items = this.buildItems(series);
    this.setData({
      name: series.name,
      format: series.format,
      vocab: series.vocabLink
        ? { label: `${series.name} 高频词汇`, level: series.vocabLink.level }
        : null,
      empty: this.items.length === 0 && !series.vocabLink,
      ready: true,
    });
    this.refresh();
  },

  // 从练习页返回时进度变了, 每次显示都重算
  onShow() {
    if (this.items) this.refresh();
  },

  /** prepTopics → 可渲染的知识点条目。年级内容缺失/知识点不存在的直接跳过。 */
  buildItems(series) {
    const items = [];
    (series.prepTopics || []).forEach((pt) => {
      if (pt.pack === 'english') {
        items.push({
          kind: 'english',
          key: 'en:' + pt.topicId,
          group: ENGLISH_GROUP,
          label: pt.label,
          status: 'ready',
          setId: pt.topicId,
        });
        return;
      }
      let c;
      try {
        c = content.loadGrade(pt.grade);
      } catch (e) {
        return; // 该年级内容还没上线
      }
      const topic = c.knowledgeMap.topics.filter((t) => t.id === pt.topicId)[0];
      if (!topic) return;
      items.push({
        kind: 'math',
        key: `${pt.grade}:${pt.topicId}`,
        group: gradeLabel(pt.grade),
        label: pt.label || topic.title,
        status: topic.status,
        grade: pt.grade,
        pack: c.pack,
        topic: topic,
      });
    });
    return items;
  },

  /** 单个条目的掌握度。数学复用 vendor 里那份判定, 英语只看练习记录。 */
  itemMastery(it) {
    if (it.kind === 'english') {
      return this.adapter.getPractice(this.studentId, it.setId).then((rec) => {
        if (rec && rec.completed) return 'mastered';
        return rec && rec.bestFirstTry > 0 ? 'in_progress' : 'not_started';
      });
    }
    return topicMastery(this.adapter, this.studentId, it.pack, it.topic);
  },

  refresh() {
    const items = this.items;
    if (!items.length) return;
    Promise.all(
      items.map((it) => this.itemMastery(it)).concat([this.adapter.getStudent(this.studentId)]),
    ).then((res) => {
      const student = res[res.length - 1];
      // 没测过手速 → 进口算前先热身 (与 Web 端 PrepScreen 的 openTopic 同一判定)
      this.hasGate = !!(student && student.latencyGateMs);

      const states = {};
      items.forEach((it, i) => (states[it.key] = res[i]));
      this.states = states;

      // 分组顺序: 数学按年级升序, 英语阅读·语法置后
      const order = [];
      items
        .filter((it) => it.kind === 'math')
        .map((it) => it.grade)
        .sort((a, b) => a - b)
        .forEach((g) => {
          const label = gradeLabel(g);
          if (order.indexOf(label) < 0) order.push(label);
        });
      if (items.filter((it) => it.kind === 'english').length) order.push(ENGLISH_GROUP);

      const groups = order.map((g) => ({
        key: g,
        title: g,
        rows: items.filter((it) => it.group === g).map((it) => this.rowVM(it, states[it.key])),
      }));

      const mastered = items.filter((it) => states[it.key] === 'mastered').length;
      prep.updatePrepProgress(this.studentId, mastered, items.length);
      this.setData({
        groups: groups,
        masteredCount: mastered,
        total: items.length,
        pct: items.length ? Math.round((mastered / items.length) * 100) : 0,
      });
    });
  },

  rowVM(it, state) {
    const s = state || 'not_started';
    const ready = it.status === 'ready' && s !== 'unavailable';
    let meta = MASTERY_LABEL[s];
    if (ready) meta += s === 'mastered' ? ' · 再练一次 →' : ' · 去练习 →';
    return { key: it.key, label: it.label, mark: MARK[s], state: s, meta: meta, ready: ready };
  },

  onOpen(e) {
    const key = e.currentTarget.dataset.key;
    const it = this.items.filter((x) => x.key === key)[0];
    if (!it) return;
    const state = (this.states && this.states[key]) || 'not_started';
    if (it.status !== 'ready' || state === 'unavailable') {
      wx.showToast({ title: '这个知识点还在做，敬请期待', icon: 'none' });
      return;
    }

    if (it.kind === 'english') {
      track.track('prep_open_topic', { seriesId: this.seriesId, kind: 'english', setId: it.setId });
      wx.navigateTo({
        url: `/packages/math/pages/practice/practice?pack=english&setId=${it.setId}`,
      });
      return;
    }
    if (it.topic.problemSetId) {
      track.track('prep_open_topic', {
        seriesId: this.seriesId,
        grade: it.grade,
        topicId: it.topic.id,
        kind: 'practice',
      });
      wx.navigateTo({
        url: `/packages/math/pages/practice/practice?grade=${it.grade}&setId=${it.topic.problemSetId}`,
      });
      return;
    }
    if (it.topic.fluencyTrackId) {
      track.track('prep_open_topic', {
        seriesId: this.seriesId,
        grade: it.grade,
        topicId: it.topic.id,
        kind: 'play',
      });
      const page = this.hasGate ? 'play/play' : 'probe/probe';
      wx.navigateTo({
        url: `/packages/math/pages/${page}?grade=${it.grade}&trackId=${it.topic.fluencyTrackId}`,
      });
    }
  },

  onVocab() {
    const v = this.data.vocab;
    if (!v) return;
    track.track('prep_open_vocab', { seriesId: this.seriesId, level: v.level });
    wx.navigateTo({
      url: `/packages/lang/pages/vocab/vocab?level=${prep.vocabLevelParam(v.level)}`,
    });
  },

  onExit() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/portal/portal' }) });
  },
});
