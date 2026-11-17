// 竞速 —— 对应 Web 端 src/ui/Race.tsx。
// 题池是"已学会的全部 fact", 计分 = 正确数/分钟。无语音、无纠错循环。
const content = require('../../../../utils/content.js');
const family = require('../../../../utils/family.js');
const { createDefaultAdapter } = require('../../../../utils/storage.js');
const { createGame } = require('../../../../utils/game.js');
const { getTrack } = require('../../../../vendor/engine');
const integerInput = require('../../../../utils/integerInput.js');
const { createAutoAnswer } = require('../../../../utils/autoAnswer.js');

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

function fmtSeconds(s) {
  return s % 60 === 0 ? `${s / 60} 分钟` : `${s} 秒`;
}

Page({
  data: {
    digits: DIGITS,
    speeds: [],
    picked: false,
    ready: false,
    mode: 'loading',
    prompt: '',
    input: '',
    signed: false,
    timeLabel: '',
    low: false,
    correctPerMin: 0,
  },

  onLoad(query) {
    this.visible = true;
    this.inputValue = '';
    this.autoAnswer = createAutoAnswer({
      isCurrent: answer => this.visible && this.started && this.game &&
        this.game.view.mode === 'prompt' && this.game.promptSeq === answer.promptSeq,
      submit: answer => this.game.submit(answer.value, answer),
    });
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

    const mr = this.pack.engine_config.milestone_races;
    const speeds = (mr.speeds || [
      { id: 'standard', label: '标准', emoji: '🚀', seconds: mr.duration_seconds },
    ]).map((s) => Object.assign({}, s, { timeText: fmtSeconds(s.seconds) }));
    this.setData({ speeds: speeds, signed: integerInput.allowsSign(getTrack(this.pack, trackId)) });

    this.game = createGame({
      trackId: trackId,
      pack: this.pack,
      adapter: createDefaultAdapter(),
      studentId: family.currentStudentId(),
      seed: Date.now() >>> 0, // 竞速每次重开都换序, 防止背题序
      onChange: (g) => this.onGameChange(g),
    });
  },

  onUnload() {
    this.visible = false; this.autoAnswer.cancel();
    this.stopClock();
    if (this.game) this.game.destroy();
  },

  onHide() {
    this.visible = false;
    this.autoAnswer.cancel(); this.stopClock();
    this.inputValue = ''; this.setData({ input: '' });
  },

  onShow() {
    this.visible = true;
    // The race continues against its absolute deadline while hidden.
    if (this.started && this.game && this.game.view.mode !== 'race_result') this.startClock();
  },

  onGameChange(g) {
    this.autoAnswer.cancel(); this.inputValue = '';
    const view = g.view;
    const patch = { ready: g.ready, mode: view.mode, input: '' };
    if (view.mode === 'prompt') {
      patch.prompt = view.fact.prompt;
    } else if (view.mode === 'race_result') {
      patch.correctPerMin = Math.round(view.correctPerMin);
      this.stopClock();
    }
    this.setData(patch);

    // 引擎就绪 + 已选速度 → 开赛 (两者顺序不确定, 谁后到谁触发)
    if (g.ready && this.chosenMs && !this.started) {
      this.started = true;
      this.game.startRace(this.chosenMs);
      this.startClock();
    }
  },

  onPickSpeed(e) {
    if (this.started) return;
    const ms = Number(e.currentTarget.dataset.seconds) * 1000;
    this.chosenMs = ms;
    this.setData({ picked: true, timeLabel: this.fmtClock(ms) });
    if (this.data.ready && !this.started) {
      this.started = true;
      this.game.startRace(ms);
      this.startClock();
    }
  },

  // ---- 总倒计时 --------------------------------------------------------------

  startClock() {
    this.stopClock();
    const race = this.game && this.game.state && this.game.state.race;
    if (!race || !this.visible || this.game.view.mode === 'race_result') return;
    const end = race.endsAt;
    const tick = () => {
      if (!this.visible || this.game.view.mode === 'race_result') return;
      const left = end - Date.now();
      if (left <= 0) { this.finishRace(end); return; }
      this.setData({ timeLabel: this.fmtClock(left), low: Math.ceil(left / 1000) <= 10 });
    };
    tick();
    if (this.game.view.mode !== 'race_result') this.clock = setInterval(tick, 200);
  },

  finishRace(end) {
    if (this.settling || !this.game || this.game.view.mode === 'race_result') return;
    this.settling = true;
    this.stopClock();
    this.autoAnswer.flush(end - 1);
    this.setData({ timeLabel: '0s', low: true });
    this.game.next();
  },

  stopClock() {
    if (this.clock) {
      clearInterval(this.clock);
      this.clock = null;
    }
  },

  fmtClock(ms) {
    const secs = Math.ceil(ms / 1000);
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' + s : s}`;
  },

  // ---- 键盘 ------------------------------------------------------------------

  editInput(change) {
    if (!this.visible || !this.started || !this.game || this.game.view.mode !== 'prompt') return;
    const end = this.game.state.race && this.game.state.race.endsAt;
    if (end === undefined) return;
    if (Date.now() >= end) { this.finishRace(end); return; }
    const next = change(this.inputValue);
    if (next === this.inputValue) return;
    this.inputValue = next;
    this.setData({ input: this.inputValue });
    this.autoAnswer.edit(this.inputValue, this.game.promptSeq);
  },

  onDigit(e) { this.editInput(input => integerInput.appendDigit(input, e.currentTarget.dataset.d)); },
  onToggleSign() { if (this.data.signed) this.editInput(integerInput.toggleSign); },
  onBackspace() { this.editInput(input => input.slice(0, -1)); },
  onEnter() { this.autoAnswer.flush(); },

  onExit() {
    this.visible = false; this.autoAnswer.cancel(); this.stopClock();
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/portal/portal' }) });
  },
});
