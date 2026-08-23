// 竞速 —— 对应 Web 端 src/ui/Race.tsx。
// 题池是"已学会的全部 fact", 计分 = 正确数/分钟。无语音、无纠错循环。
const content = require('../../../../utils/content.js');
const family = require('../../../../utils/family.js');
const { createDefaultAdapter } = require('../../../../utils/storage.js');
const { createGame } = require('../../../../utils/game.js');

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
    timeLabel: '',
    low: false,
    correctPerMin: 0,
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

    const mr = this.pack.engine_config.milestone_races;
    const speeds = (mr.speeds || [
      { id: 'standard', label: '标准', emoji: '🚀', seconds: mr.duration_seconds },
    ]).map((s) => Object.assign({}, s, { timeText: fmtSeconds(s.seconds) }));
    this.setData({ speeds: speeds });

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
    this.stopClock();
    if (this.game) this.game.destroy();
  },

  onHide() {
    // 切后台不暂停比赛是不公平的, 但暂停又会让"题/分钟"失真 ——
    // 折中: 停表并直接结算, 回来看到成绩即可。
    if (this.started && this.data.mode !== 'race_result') {
      this.stopClock();
      this.game.next();
    }
  },

  onGameChange(g) {
    const view = g.view;
    const patch = { ready: g.ready, mode: view.mode };
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
      this.startClock(this.chosenMs);
    }
  },

  onPickSpeed(e) {
    const ms = Number(e.currentTarget.dataset.seconds) * 1000;
    this.chosenMs = ms;
    this.setData({ picked: true, timeLabel: this.fmtClock(ms) });
    if (this.data.ready && !this.started) {
      this.started = true;
      this.game.startRace(ms);
      this.startClock(ms);
    }
  },

  // ---- 总倒计时 --------------------------------------------------------------

  startClock(ms) {
    const end = Date.now() + ms;
    this.clock = setInterval(() => {
      const left = end - Date.now();
      if (left <= 0) {
        this.stopClock();
        this.setData({ timeLabel: '0s', low: true });
        this.game.next(); // now() >= endsAt → 引擎给出 RACE_RESULT
        return;
      }
      const secs = Math.ceil(left / 1000);
      this.setData({ timeLabel: this.fmtClock(left), low: secs <= 10 });
    }, 200);
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

  onDigit(e) {
    if (this.data.mode !== 'prompt') return;
    this.setData({ input: (this.data.input + e.currentTarget.dataset.d).slice(0, 4) });
  },

  onBackspace() {
    this.setData({ input: this.data.input.slice(0, -1) });
  },

  onEnter() {
    if (this.data.mode !== 'prompt' || this.data.input === '') return;
    this.game.submit(Number(this.data.input));
    this.setData({ input: '' });
  },

  onExit() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/portal/portal' }) });
  },
});
