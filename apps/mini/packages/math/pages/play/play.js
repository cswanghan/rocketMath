// 口算答题 —— 对应 Web 端 src/ui/Play.tsx。
//
// 与 Web 的两处必要差异:
//   1. 倒计时: 小程序没有 SVG, 环形进度改成一条横向倒计时条 (CSS transition,
//      不走 JS 逐帧, 省电也不掉帧)。语义一样: 条走完 = 超时未答。
//   2. 键盘: 没有物理键盘, 只保留自绘数字键盘。
const content = require('../../../../utils/content.js');
const family = require('../../../../utils/family.js');
const speech = require('../../../../utils/speech.js');
const { createDefaultAdapter } = require('../../../../utils/storage.js');
const { createGame } = require('../../../../utils/game.js');
const { getTrack } = require('../../../../vendor/engine');

const PHASE_LABEL = {
  take_off: '起飞 Take-Off',
  orbit: '环绕 Orbit',
  universe: '宇宙 Universe',
};

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

Page({
  data: {
    ready: false,
    trackName: '',
    input: '',
    muted: false,
    digits: DIGITS,
    // 引擎视图
    mode: 'loading',
    prompt: '',
    answer: '',
    isRetest: false,
    isPattern: false,
    phaseLabel: '',
    phaseDoneLabel: '',
    levelDone: '',
    progText: '',
    sessionXp: 0,
    cells: [],
    // 倒计时条
    gateMs: 6000,
    barReset: true,
    // 免费体验
    trialBlocked: false,
  },

  onLoad(query) {
    const grade = Number(query.grade) || content.getGrade() || 3;
    const trackId = query.trackId;
    let c;
    try {
      c = content.loadGrade(grade);
    } catch (e) {
      wx.showToast({ title: '内容加载失败', icon: 'none' });
      return;
    }
    this.pack = c.pack;
    this.trackId = trackId;
    const t = getTrack(this.pack, trackId);
    this.levels = t.levels.map((l) => l.level);
    this.mastery = this.pack.engine_config.mastery;
    wx.setNavigationBarTitle({ title: t.name });
    this.setData({ trackName: t.name, muted: speech.isMuted() });

    this.game = createGame({
      trackId: trackId,
      pack: this.pack,
      adapter: createDefaultAdapter(),
      studentId: family.currentStudentId(),
      // 种子固定到"今天 + track", 同一天重进顺序一致, 换天换序
      seed: this.seedOf(trackId),
      onChange: (g) => this.onGameChange(g),
      onTrialBlocked: () => this.setData({ trialBlocked: true }),
    });
  },

  onUnload() {
    this.clearTimer();
    speech.cancel();
    if (this.game) this.game.destroy();
  },

  onHide() {
    // 切后台时停表, 免得回来就判超时
    this.clearTimer();
  },

  seedOf(trackId) {
    const d = new Date();
    const day = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    let h = day;
    for (let i = 0; i < trackId.length; i++) h = (h * 31 + trackId.charCodeAt(i)) >>> 0;
    return h;
  },

  // ---- 引擎回调 --------------------------------------------------------------

  onGameChange(g) {
    const view = g.view;
    const s = g.state;
    const patch = {
      ready: g.ready,
      mode: view.mode,
      sessionXp: g.sessionXp,
      gateMs: g.latencyGateMs,
    };

    if (s) {
      patch.phaseLabel = PHASE_LABEL[s.phase] || s.phase;
      patch.progText =
        s.phase === 'take_off'
          ? `连对 ${s.streak}/${this.mastery.take_off.consecutive_correct_within_gate}`
          : `${s.attempts}/${this.mastery[s.phase].window_attempts} 题 · 错 ${s.errors}/${this.mastery[s.phase].max_errors}`;
      patch.cells = this.levels.map((lv) => ({
        level: lv,
        state:
          s.completedLevels.indexOf(lv) >= 0
            ? 'done'
            : lv === s.currentLevel
              ? 'current'
              : 'todo',
        text: s.completedLevels.indexOf(lv) >= 0 ? '★' : lv,
      }));
    }

    if (view.mode === 'prompt') {
      patch.prompt = view.fact.prompt;
      patch.isRetest = !!view.isRetest;
      patch.input = '';
    } else if (view.mode === 'correction') {
      patch.prompt = view.fact.prompt;
      patch.answer = view.fact.answer;
      patch.isPattern = view.fact.learningType === 'pattern';
    } else if (view.mode === 'phase_done') {
      patch.phaseDoneLabel = PHASE_LABEL[view.phase] || view.phase;
    } else if (view.mode === 'level_done') {
      patch.levelDone = view.level;
    }

    this.setData(patch, () => {
      if (view.mode === 'prompt') this.startCountdown(g.latencyGateMs);
      else this.clearTimer();
    });

    if (view.mode === 'correction' && this.lastSpoken !== view.fact.id) {
      this.lastSpoken = view.fact.id;
      speech.speak(speech.sayFact(view.fact.prompt, view.fact.answer));
    }
  },

  // ---- 倒计时 ----------------------------------------------------------------
  // 条子本身用 CSS transition 走; JS 只留一个 setTimeout 判超时, 两者同一个时长。

  startCountdown(gateMs) {
    this.clearTimer();
    this.setData({ barReset: true }, () => {
      // 下一帧再放开 transition, 否则浏览器会把"重置到 100%"和"走到 0%"合并掉
      this.rafTimer = setTimeout(() => this.setData({ barReset: false }), 30);
    });
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.game) this.game.timeout();
    }, gateMs);
  },

  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.rafTimer) {
      clearTimeout(this.rafTimer);
      this.rafTimer = null;
    }
  },

  // ---- 数字键盘 --------------------------------------------------------------

  onDigit(e) {
    if (this.data.mode !== 'prompt') return;
    const d = e.currentTarget.dataset.d;
    this.setData({ input: (this.data.input + d).slice(0, 4) });
  },

  onBackspace() {
    this.setData({ input: this.data.input.slice(0, -1) });
  },

  onEnter() {
    if (this.data.mode !== 'prompt' || this.data.input === '') return;
    this.clearTimer();
    this.lastSpoken = ''; // 允许下一次纠错重新朗读
    this.game.submit(Number(this.data.input));
  },

  onNext() {
    this.game.next();
  },

  onToggleMute() {
    const next = !this.data.muted;
    speech.setMuted(next);
    this.setData({ muted: next });
  },

  onExit() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/portal/portal' }) });
  },

  onLoginFromTrial() {
    wx.switchTab({ url: '/pages/mine/mine' });
  },

  noop() {},
});
