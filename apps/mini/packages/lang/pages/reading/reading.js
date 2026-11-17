// 阅读识字 —— 对应 Web 端 public/chinese-reading.html。
// 粘一段课文进来, 按参考字表挑出练习字，也可选择原创分级短文, 点开逐字过。
//
// 相对 Web 端的取舍:
//   · 不对任意文章自动注音；原创短文的字卡使用按出现位置审校的词语读音。
//   · 没有笔顺动画/临摹: hanzi-writer 同理, 换成田字格静态大字。
//   · 「已掌握」只存本地: Web 端也是 localStorage, 没有后端表, 保持一致。

const DATA = require('../../content/chinese.js');
const family = require('../../../../utils/family.js');
const track = require('../../../../utils/track.js');
const speech = require('../../../../utils/speech.js');

const GRADE_CHARS = DATA.GRADE_CHARS;
const READING_LIBRARY = DATA.READING_LIBRARY || { passages: [] };
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
    library: [],
    passageTitle: '',
    readingQuestions: [],

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
    this.selectedPassage = null;
    this.readingAnswers = {};
    this.setData({ speechOn: speech.available(), grades: this.gradeVM(DEFAULT_GRADE), library: this.libraryVM(DEFAULT_GRADE) });
  },

  onUnload() {
    speech.cancel();
  },

  gradeVM(grade) {
    return GRADES.map((g) => ({ g: g, label: g + '年级', active: g === grade }));
  },

  onPickGrade(e) {
    const g = Number(e.currentTarget.dataset.g);
    this.setData({ grade: g, grades: this.gradeVM(g), library: this.libraryVM(g) });
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
    this.selectedPassage = null;
    this.readingAnswers = {};
    this.setData({ passageTitle: '', readingQuestions: [] });
    const len = v.replace(/\s/g, '').length;
    this.setData({ charCount: len, canStart: len > 0 });
  },

  onClearText() {
    this.article = '';
    this.selectedPassage = null;
    this.readingAnswers = {};
    this.setData({ passageTitle: '', readingQuestions: [] });
    this.setData({ text: '', charCount: 0, canStart: false });
  },

  libraryVM(grade) {
    return READING_LIBRARY.passages.filter((p) => p.grade === grade).map((p) => ({ id: p.id, title: p.title, count: p.questions.length }));
  },

  onChoosePassage(e) {
    const p = READING_LIBRARY.passages.find((entry) => entry.id === e.currentTarget.dataset.id);
    if (!p) return;
    this.selectedPassage = p;
    this.readingAnswers = {};
    this.article = p.text;
    this.setData({ text: p.text, charCount: p.text.replace(/\s/g, '').length, canStart: true });
    this.onStart();
  },

  renderReadingQuestions() {
    const p = this.selectedPassage;
    this.setData({
      passageTitle: p ? p.title : '',
      readingQuestions: p ? p.questions.map((q) => {
        const answer = this.readingAnswers[q.id];
        const correct = q.choices.find((c) => c.id === q.answer);
        return {
          id: q.id, prompt: q.prompt, answered: !!answer,
          choices: q.choices.map((c) => ({ id: c.id, label: c.label,
            state: answer ? (c.id === q.answer ? 'correct' : c.id === answer ? 'wrong' : '') : '' })),
          feedback: answer ? (answer === q.answer ? '答对了。' : '正确答案：' + correct.label + '。') + ' ' + q.explanation + ' 原文依据：“' + q.evidence + '”。' : '',
        };
      }) : [],
    });
  },

  onReadingAnswer(e) {
    const id = e.currentTarget.dataset.qid;
    const choice = e.currentTarget.dataset.choice;
    if (!this.selectedPassage || this.readingAnswers[id]) return;
    const q = this.selectedPassage.questions.find((item) => item.id === id);
    if (!q || !q.choices.some((c) => c.id === choice)) return;
    this.readingAnswers[id] = choice;
    this.renderReadingQuestions();
  },

  /** 目标字集合: 本年级参考表 or 一到本年级累计。 */
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
    if (this.selectedPassage && this.selectedPassage.text !== text) this.selectedPassage = null;
    this.renderReadingQuestions();
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
    const readings = this.selectedPassage && this.selectedPassage.text === text
      ? (this.selectedPassage.readings || []) : [];
    this.readingsByIndex = {};
    readings.forEach((r) => {
      if (text[r.index] === r.char) this.readingsByIndex[r.index] = r;
    });

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
        segments.push({ hit: true, s: ch, c: ch, index: i, mastered: !!this.mastered[ch] });
      } else {
        buf += ch;
      }
    }
    if (buf) segments.push({ hit: false, s: buf, c: '', mastered: false });

    this.found = order
      .map((c) => ({ char: c, count: counts[c], readings: readings.filter((r) => r.char === c) }))
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
        `全文 ${total} 字，含 ${this.found.length} 个${scopeLabel}参考字` +
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
      s.hit ? Object.assign({}, s, { mastered: !!this.mastered[s.c] }) : s,
    );
    this.renderReading(segments);
  },

  onOpenChar(e) {
    const ch = e.currentTarget.dataset.c;
    if (!ch) return;
    const info = this.found.filter((f) => f.char === ch)[0];
    if (!info) return;
    const occurrence = this.readingsByIndex[e.currentTarget.dataset.index];
    const readings = occurrence && occurrence.char === ch ? [occurrence] : (info.readings || []);
    const pinyin = [...new Set(readings.map((r) => r.pinyin))].join(' / ');
    const context = [...new Set(readings.map((r) => r.word + '：' + r.pinyin))].join('；');
    const speechText = readings.length ? [...new Set(readings.map((r) => r.word))].join('，') : ch;
    this.setData({
      detail: { char: ch, count: info.count, mastered: !!this.mastered[ch], pinyin, context, speechText },
    });
    speech.speak(speechText);
    track.track('char_view', { char: ch, source: 'reading' });
  },

  onSpeakDetail() {
    if (this.data.detail) speech.speak(this.data.detail.speechText);
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
