// 阅读识字 —— 对应 Web 端 public/chinese-reading.html。
// 粘一段课文进来, 按年级字表把「该会的字」挑出来标亮, 点开逐字过。
//
// 相对 Web 端的取舍:
//   · 没有拼音注音: Web 用 cnchar(CDN) 给任意字注音, 小程序加载不了远程脚本,
//     内置 63 字的拼音表覆盖不了整篇课文, 与其给一半不如不给。P1 可以打一份
//     常用字拼音表进分包再补上。
//   · 没有笔顺动画/临摹: hanzi-writer 同理, 换成田字格静态大字。
//   · 「已掌握」只存本地: Web 端也是 localStorage, 没有后端表, 保持一致。

const DATA = require('../../content/chinese.js');
const family = require('../../../../utils/family.js');
const track = require('../../../../utils/track.js');
const speech = require('../../../../utils/speech.js');

const GRADE_CHARS = DATA.GRADE_CHARS;
const GRADES = [1, 2, 3, 4, 5, 6];
const DEFAULT_GRADE = 3;
// 正文上限。超过这个长度逐字渲染会明显掉帧, 而一篇小学课文远到不了
const MAX_TEXT = 4000;

const masteredKey = (studentId) => `rm.reading_mastered.${studentId}`;

function loadMastered(studentId) {
  try {
    const arr = wx.getStorageSync(masteredKey(studentId));
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

Page({
  data: {
    view: 'input', // input | reading
    grades: [],
    grade: DEFAULT_GRADE,
    scope: 'current', // current | cumulative
    text: '',
    charCount: 0,
    canStart: false,
    speechOn: false,

    // 阅读视图
    statsText: '',
    segments: [],
    chips: [],
    detail: null,
  },

  onLoad() {
    this.studentId = family.currentStudentId();
    this.mastered = {};
    loadMastered(this.studentId).forEach((c) => (this.mastered[c] = true));
    this.found = [];
    this.article = '';
    this.setData({ speechOn: speech.available(), grades: this.gradeVM(DEFAULT_GRADE) });
  },

  onUnload() {
    speech.cancel();
  },

  gradeVM(grade) {
    return GRADES.map((g) => ({ g: g, label: g + '年级', active: g === grade }));
  },

  onPickGrade(e) {
    const g = Number(e.currentTarget.dataset.g);
    this.setData({ grade: g, grades: this.gradeVM(g) });
    if (this.data.view === 'reading') this.analyze();
  },

  onPickScope(e) {
    const s = e.currentTarget.dataset.scope;
    this.setData({ scope: s });
    if (this.data.view === 'reading') this.analyze();
  },

  onTextInput(e) {
    const v = e.detail.value;
    this.article = v;
    const len = v.replace(/\s/g, '').length;
    this.setData({ charCount: len, canStart: len > 0 });
  },

  onClearText() {
    this.article = '';
    this.setData({ text: '', charCount: 0, canStart: false });
  },

  /** 目标字集合: 本年级 or 一到本年级累计。 */
  targetSet() {
    let chars = '';
    if (this.data.scope === 'current') {
      chars = GRADE_CHARS[this.data.grade] || '';
    } else {
      for (let g = 1; g <= this.data.grade; g += 1) chars += GRADE_CHARS[g] || '';
    }
    const set = {};
    chars.split('').forEach((c) => (set[c] = true));
    return set;
  },

  onStart() {
    const text = String(this.article || '').trim();
    if (!text) return;
    if (text.length > MAX_TEXT) {
      wx.showToast({ title: `太长啦，请控制在 ${MAX_TEXT} 字以内`, icon: 'none' });
      return;
    }
    this.analyze();
    this.setData({ view: 'reading' });
    track.track('reading_generate', {
      grade: this.data.grade,
      scope: this.data.scope,
      textLen: text.length,
      found: this.found.length,
    });
  },

  /**
   * 扫一遍正文: 统计命中字的次数, 并把正文切成「命中字 / 连续普通文本」两种片段。
   * 切片是为了 WXML 能逐字绑点击 —— 一个字一个节点太碎, 普通文本合并成整段。
   */
  analyze() {
    const target = this.targetSet();
    const text = String(this.article || '').trim();
    const counts = {};
    const order = [];
    const segments = [];
    let buf = '';

    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (target[ch]) {
        if (buf) {
          segments.push({ hit: false, s: buf, c: '', mastered: false });
          buf = '';
        }
        if (!counts[ch]) {
          counts[ch] = 0;
          order.push(ch);
        }
        counts[ch] += 1;
        segments.push({ hit: true, s: ch, c: ch, mastered: !!this.mastered[ch] });
      } else {
        buf += ch;
      }
    }
    if (buf) segments.push({ hit: false, s: buf, c: '', mastered: false });

    this.found = order
      .map((c) => ({ char: c, count: counts[c] }))
      .sort((a, b) => b.count - a.count);

    this.renderReading(segments);
  },

  renderReading(segments) {
    const total = String(this.article || '').replace(/\s/g, '').length;
    const masteredCount = this.found.filter((f) => this.mastered[f.char]).length;
    const scopeLabel = this.data.scope === 'current' ? `${this.data.grade}年级` : `1-${this.data.grade}年级`;
    this.setData({
      segments: segments || this.data.segments,
      statsText:
        `全文 ${total} 字，含 ${this.found.length} 个${scopeLabel}生字` +
        (masteredCount ? `，已掌握 ${masteredCount} 个` : ''),
      chips: this.found.map((f) => ({
        char: f.char,
        count: f.count,
        mastered: !!this.mastered[f.char],
      })),
    });
  },

  /** 只刷新掌握态, 不重扫正文。 */
  refreshMasteredFlags() {
    const segments = this.data.segments.map((s) =>
      s.hit ? { hit: true, s: s.s, c: s.c, mastered: !!this.mastered[s.c] } : s,
    );
    this.renderReading(segments);
  },

  onOpenChar(e) {
    const ch = e.currentTarget.dataset.c;
    if (!ch) return;
    const info = this.found.filter((f) => f.char === ch)[0];
    if (!info) return;
    this.setData({
      detail: { char: ch, count: info.count, mastered: !!this.mastered[ch] },
    });
    speech.speak(ch);
    track.track('char_view', { char: ch, source: 'reading' });
  },

  onSpeakDetail() {
    if (this.data.detail) speech.speak(this.data.detail.char);
  },

  onToggleMastered() {
    const d = this.data.detail;
    if (!d) return;
    const next = !this.mastered[d.char];
    if (next) this.mastered[d.char] = true;
    else delete this.mastered[d.char];
    try {
      wx.setStorageSync(masteredKey(this.studentId), Object.keys(this.mastered));
    } catch (err) {
      console.warn('[阅读识字] 掌握状态写入失败', err && err.errMsg);
    }
    track.track('char_master', { char: d.char, source: 'reading', mastered: next });
    this.setData({ 'detail.mastered': next });
    this.refreshMasteredFlags();
  },

  onCloseDetail() {
    speech.cancel();
    this.setData({ detail: null });
  },

  /** 阅读态先退回录入态, 录入态才真的退出页面。 */
  onBack() {
    if (this.data.view === 'reading') {
      speech.cancel();
      this.setData({ view: 'input', detail: null, text: this.article });
      return;
    }
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/portal/portal' }) });
  },

  noop() {},
});
