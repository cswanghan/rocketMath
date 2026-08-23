// 首次热身探针 —— 对应 Web 端 src/ui/Probe.tsx。
// 测的是"看到数字按下去"的手速, 不是算数。中位反应时 × 系数 = 这个孩子的答题时限。
const content = require('../../../../utils/content.js');
const family = require('../../../../utils/family.js');
const track = require('../../../../utils/track.js');
const { createDefaultAdapter } = require('../../../../utils/storage.js');
const { computeLatencyGateMs } = require('../../../../vendor/engine');

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** 与 Web 端同一条式子: 不用随机数, 热身不需要随机性, 但要避免连着出同一个数。 */
function targetAt(i) {
  return ((i * 7 + 3) % 9) + 1;
}

Page({
  data: {
    digits: DIGITS,
    trial: 0,
    total: 10,
    target: targetAt(0),
    done: false,
    gateSec: '',
  },

  onLoad(query) {
    const grade = Number(query.grade) || content.getGrade() || 3;
    let c;
    try {
      c = content.loadGrade(grade);
    } catch (e) {
      wx.showToast({ title: '内容加载失败', icon: 'none' });
      return;
    }
    // 带了 trackId = 从口算入口拐过来测手速的, 测完直接进那条 track
    this.grade = grade;
    this.trackId = query.trackId || '';
    this.cfg = c.pack.engine_config;
    this.times = [];
    this.startAt = Date.now();
    this.setData({ total: this.cfg.individualized_goal.probe_problem_count });
    track.track('probe_start', { grade: grade });
  },

  onTap(e) {
    if (this.data.done) return;
    if (Number(e.currentTarget.dataset.d) !== this.data.target) return; // 只记正确按键
    this.times.push(Date.now() - this.startAt);

    const next = this.data.trial + 1;
    if (next < this.data.total) {
      this.startAt = Date.now();
      this.setData({ trial: next, target: targetAt(next) });
      return;
    }

    const gate = computeLatencyGateMs(this.times, this.cfg);
    const studentId = family.currentStudentId();
    const adapter = createDefaultAdapter();
    adapter.getStudent(studentId).then((s) => {
      const student = s || { id: studentId, createdAt: Date.now() };
      adapter.putStudent(Object.assign({}, student, { latencyGateMs: gate })).then(() => {
        track.track('probe_done', { gateMs: gate });
        this.setData({ done: true, gateSec: (gate / 1000).toFixed(1) });
      });
    });
  },

  onFinish() {
    if (this.trackId) {
      // redirectTo: 热身页不该留在返回栈里, 从口算返回应该回到来的那个页面
      wx.redirectTo({
        url: `/packages/math/pages/play/play?grade=${this.grade}&trackId=${this.trackId}`,
      });
      return;
    }
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/portal/portal' }) });
  },
});
