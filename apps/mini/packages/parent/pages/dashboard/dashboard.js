// 家长区 —— Web 端 src/ui/ParentGate.tsx + src/ui/ParentDashboard.tsx 合成一页。
//
// 小程序里没必要为一道 PIN 门单开一页: 未解锁时渲染门, 解锁后渲染错题本,
// 返回栈里只有一层, 家长按左上角返回就直接回「我的」。
//
// PIN 明文存本地, 只挡孩子误入 (见 utils/pin.js), 不是隐私边界。

const pin = require('../../../../utils/pin.js');
const api = require('../../../../utils/api.js');
const family = require('../../../../utils/family.js');
const { createDefaultAdapter } = require('../../../../utils/storage.js');
const { levelFromXp } = require('../../../../vendor/practice');
const { fmtSec, llmPayload, localSummaryText, summarize } = require('../../../../vendor/ui/summary.js');

const DIFF = {
  basic: { label: '基础', cls: 'pill-mint' },
  consolidate: { label: '夯实', cls: 'pill-blue' },
  challenge: { label: '拔高', cls: 'pill-peach' },
};

Page({
  data: {
    // 门
    unlocked: false,
    mode: 'enter', // 'set' 首次设置 | 'enter' 验证
    pinVal: '',
    confirmVal: '',
    gateError: '',

    // 面板
    ready: false,
    xp: 0,
    level: null,
    activeCount: 0,
    wrongTotal: 0,
    slowTotal: 0,
    groups: [],
    summaryText: '',
    summarySource: '',
    loading: false,
  },

  onLoad() {
    this.studentId = family.currentStudentId();
    this.adapter = createDefaultAdapter();
    this.summaryData = null;
    this.setData({ mode: pin.hasPin() ? 'enter' : 'set' });
  },

  // ---- PIN 门 ---------------------------------------------------------------

  onPinInput(e) {
    this.setData({ pinVal: e.detail.value.replace(/[^\d]/g, '').slice(0, 4), gateError: '' });
  },

  onConfirmInput(e) {
    this.setData({ confirmVal: e.detail.value.replace(/[^\d]/g, '').slice(0, 4) });
  },

  onSubmitPin() {
    const d = this.data;
    if (d.mode === 'set') {
      if (d.pinVal.length !== 4) {
        this.setData({ gateError: '请输入 4 位数字' });
        return;
      }
      if (d.pinVal !== d.confirmVal) {
        this.setData({ gateError: '两次输入不一致' });
        return;
      }
      pin.setPin(d.pinVal);
      this.unlock();
      return;
    }
    if (pin.checkPin(d.pinVal)) {
      this.unlock();
    } else {
      this.setData({ gateError: '密码错误', pinVal: '' });
    }
  },

  unlock() {
    this.setData({ unlocked: true, pinVal: '', confirmVal: '', gateError: '' });
    this.reload();
  },

  // ---- 数据 -----------------------------------------------------------------

  reload() {
    return Promise.all([
      this.adapter.listMistakes(this.studentId),
      this.adapter.getStudent(this.studentId),
    ]).then((res) => {
      const mistakes = res[0] || [];
      const xp = (res[1] && res[1].xp) || 0;
      // summarize 自己会过滤已订正的, 传全量
      this.summaryData = summarize(mistakes);
      this.setData({
        ready: true,
        xp: xp,
        level: levelFromXp(xp),
        activeCount: this.summaryData.total,
        wrongTotal: this.summaryData.wrongTotal,
        slowTotal: this.summaryData.slowTotal,
        groups: this.buildGroups(mistakes.filter((m) => !m.corrected)),
      });
    });
  },

  /** 按知识点分组, 错得多的排前面 (与 Web 端同一排序)。 */
  buildGroups(active) {
    const order = [];
    const byTopic = {};
    active.forEach((m) => {
      const t = m.topicTitle || '未分类';
      if (!byTopic[t]) {
        byTopic[t] = [];
        order.push(t);
      }
      byTopic[t].push(m);
    });
    return order
      .map((t) => ({ topic: t, count: byTopic[t].length, items: byTopic[t].map(mistakeVM) }))
      .sort((a, b) => b.count - a.count);
  },

  // ---- 一键总结 -------------------------------------------------------------

  onSummarize() {
    if (this.data.loading || !this.data.activeCount) return;
    this.setData({ loading: true, summarySource: '' });
    const data = this.summaryData;
    // 断网/后端不可用一律退回本地分析 —— 家长永远能看到点东西
    api
      .request({ path: '/api/summarize', method: 'POST', data: llmPayload(data), timeout: 30000 })
      .then((j) => {
        if (!j || !j.summary) throw new Error('empty');
        this.setData({ summaryText: j.summary, summarySource: 'AI' });
      })
      .catch(() => {
        this.setData({ summaryText: localSummaryText(data), summarySource: '本地' });
      })
      .then(() => this.setData({ loading: false }));
  },

  // ---- 订正 / 数据管理 -------------------------------------------------------

  onCorrect(e) {
    const id = e.currentTarget.dataset.id;
    if (id == null) return;
    this.adapter.markMistakeCorrected(this.studentId, id).then(() => this.reload());
  },

  onResetProgress() {
    wx.showModal({
      title: '重置完成度和经验',
      content: '关卡进度、已过关、等级/经验都会清零，错题本保留。此操作不可撤销。',
      confirmText: '确认重置',
      confirmColor: '#f0564a',
      success: (r) => {
        if (!r.confirm) return;
        this.adapter.resetProgress(this.studentId).then(() => {
          this.setData({ summaryText: '', summarySource: '' });
          this.reload();
        });
      },
    });
  },

  onClearMistakes() {
    wx.showModal({
      title: '清空错题本',
      content: '所有错题记录会被删除，此操作不可撤销。',
      confirmText: '确认清空',
      confirmColor: '#f0564a',
      success: (r) => {
        if (!r.confirm) return;
        this.adapter.clearMistakes(this.studentId).then(() => {
          this.setData({ summaryText: '', summarySource: '' });
          this.reload();
        });
      },
    });
  },

  onExit() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/mine' }) });
  },
});

/** 一条错题 → 视图模型。WXML 不能调函数, 徽章/时间都得在这里算好。 */
function mistakeVM(m) {
  const diff = m.difficulty ? DIFF[m.difficulty] : null;
  return {
    id: m.id,
    slow: !!m.slow,
    badge: m.slow ? '⏱ 偏慢' : '答错',
    badgeCls: m.slow ? 'pill-peach' : 'pill-bad',
    diffLabel: diff ? diff.label : m.difficulty || '',
    diffCls: diff ? diff.cls : 'pill-gray',
    timeText: typeof m.elapsedMs === 'number' ? `⏱ ${fmtSec(m.elapsedMs)}` : '',
    prompt: m.prompt,
    yourAnswer: m.yourAnswer,
    correctAnswer: m.correctAnswer,
  };
}
