// 语文识字 —— 对应 Web 端 public/chinese-characters.html。
// 三个模式: 学一学 (偏旁联想) / 闯一闯 (10 关小测) / 生字本 (家长录入 + 复习)。
//
// 数据 (RAD / CHARS / GROUPS / RAD_MAP) 由 scripts/build-mini-content.mjs 从
// 那个 HTML 里原样抠出来, 不手抄, 避免两端字库分叉。
//
// 相对 Web 端的取舍 (都是外部 CDN 库在小程序里不可用导致的):
//   · 笔顺动画: Web 用 hanzi-writer(CDN)。小程序不能远程加载脚本, 这里退回
//     田字格 + 大字静态展示 —— Web 端本来就有同款降级路径。
//   · 任意字的拼音/部首自动拆解: Web 用 cnchar(CDN)。这里内置 63 字有完整信息,
//     生字本里超出字库的字只存字形。P1 再考虑打一份常用字拼音表进分包。
//   · 语音输入: 依赖识别插件, 未接入 → 纯打字。

const DATA = require('../../content/chinese.js');
const notebook = require('../../utils/notebook.js');
const family = require('../../../../utils/family.js');
const track = require('../../../../utils/track.js');
const speech = require('../../../../utils/speech.js');

const RAD = DATA.RAD;
const CHARS = DATA.CHARS;
const GROUPS = DATA.GROUPS;

const STRUCT_NOTE = {
  左右: '左边 + 右边',
  上下: '上面 + 下面',
  半包围: '一边包着另一边',
  独体: '整个就是一个部件',
};
const STRUCT_ICON = { 左右: '◧', 上下: '⬒', 半包围: '◤', 独体: '●' };

const SCENES = ['写作文', '读课文', '课外阅读', '听写', '生活中', '其他'];
const CJK = /[一-鿿]/;
const QUIZ_TOTAL = 10;
const PRAISE = ['太棒了！🎉', '答对啦！⭐', '真厉害！👏', '完全正确！✨'];

const byChar = {};
CHARS.forEach((c) => (byChar[c.c] = c));
const PINYINS = [];
CHARS.forEach((c) => {
  if (PINYINS.indexOf(c.p) < 0) PINYINS.push(c.p);
});

function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

/** 从 arr 里随机取 n 个, 排除 not (用来造干扰项)。 */
function pick(arr, n, not) {
  return shuffle(arr.filter((x) => x !== not)).slice(0, n);
}

function themeWordOf(radKey) {
  return RAD[radKey].theme.split(' · ')[0];
}

/**
 * 条目 id。用时间戳, 但同一毫秒内连加两条会撞 —— 撞了列表 wx:key 会重复,
 * 删除也会一次删掉两条。撞上就往后顺延一毫秒。
 */
function uniqueId(list, ts) {
  const used = {};
  (list || []).forEach((e) => (used[e.id] = true));
  let id = ts;
  while (used[id]) id += 1;
  return id;
}

Page({
  data: {
    tab: 'learn', // learn | quiz | notebook
    speechOn: false,

    // ---- 学一学 ----
    groups: [],
    sel: '',
    detail: null,
    radSheet: null,

    // ---- 闯一闯 ----
    quizState: 'intro', // intro | play | result
    qIndex: 0,
    qTotal: QUIZ_TOTAL,
    qScore: 0,
    qPct: 0,
    q: null,
    qOpts: [],
    qFeedback: '',
    qFeedbackOk: false,
    qAnswered: false,
    qResult: null,

    // ---- 生字本 ----
    scenes: [],
    newScene: '写作文',
    filterScene: '全部',
    filters: [],
    wordInput: '',
    noteInput: '',
    noteList: [],
    noteCount: 0,
    syncText: '',
    review: null,
  },

  onLoad() {
    this.studentId = family.currentStudentId();
    this.note = notebook.load(this.studentId);
    this.setData({
      speechOn: speech.available(),
      scenes: SCENES.map((s) => ({ key: s, active: s === '写作文' })),
    });
    this.selectChar(CHARS[0].c, true);
    this.renderPicker();
    this.renderNote();

    notebook.pull(this.studentId, this.note).then((res) => {
      if (!res.synced) return;
      this.note = res.list;
      this.renderPicker();
      this.renderNote();
      this.setData({ syncText: '已同步云端生字本' });
    });
  },

  onUnload() {
    notebook.flush();
    speech.cancel();
  },

  onHide() {
    notebook.flush();
    speech.cancel();
  },

  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab: tab });
    track.track('chinese_tab', { tab: tab });
  },

  // ==== 学一学 ================================================================

  /** 字卡列表: 「我的生字本」置顶, 其后按偏旁分组。 */
  renderPicker() {
    const groups = [];
    const mine = [];
    (this.note || []).forEach((e) => {
      String((e && e.word) || '')
        .split('')
        .forEach((ch) => {
          if (CJK.test(ch) && mine.indexOf(ch) < 0) mine.push(ch);
        });
    });
    if (mine.length) {
      groups.push({
        key: 'mine',
        glyph: '本',
        color: '#c19a3e',
        title: '我的生字本',
        theme: '你加过的字 · 点字看拆解',
        radKey: '',
        chars: mine,
      });
    }
    GROUPS.forEach((g) => {
      const r = g.rad ? RAD[g.rad] : null;
      groups.push({
        key: g.key,
        glyph: r ? r.g : '木',
        color: r ? r.color : g.color,
        title: r ? r.name : g.title,
        theme: r ? r.theme : g.theme,
        radKey: g.rad || '',
        chars: g.rad
          ? CHARS.filter((c) => c.rad === g.rad && c.struct !== '独体').map((c) => c.c)
          : g.chars,
      });
    });
    this.setData({ groups: groups });
  },

  onPickChar(e) {
    this.selectChar(e.currentTarget.dataset.c);
  },

  /**
   * 选中一个字并渲染详情。WXML 里不能调函数, 所以这里把结构行/部件/偏旁提示
   * 全部算成扁平的视图模型。
   */
  selectChar(ch, silent) {
    const c = byChar[ch] || { c: ch, p: '', mean: '', struct: '', rad: null, parts: [], light: true };
    const detail = {
      char: c.c,
      pinyin: c.p || '',
      mean: c.mean ? '含义：' + c.mean : '',
      structTag: c.struct ? c.struct + '结构' : '',
      structIcon: STRUCT_ICON[c.struct] || '',
      structNote: STRUCT_NOTE[c.struct] ? '（' + STRUCT_NOTE[c.struct] + '）' : '',
      parts: [],
      soloNote: '',
      evolve: null,
      radHint: null,
      light: !!c.light,
    };

    if (c.struct === '独体') {
      detail.soloNote = `「${c.c}」是独体字，不能再拆开啦，它本身就是一块汉字的小积木。`;
      if (c.evolve) {
        const r = RAD[c.evolve];
        detail.evolve = { key: c.evolve, glyph: r.g, name: r.name, color: r.color };
      }
    } else if (c.parts && c.parts.length) {
      detail.parts = c.parts.map((pt) => ({
        glyph: pt.g,
        label: pt.l,
        radKey: pt.rad || '',
        color: pt.rad ? RAD[pt.rad].color : '',
      }));
      const radPart = c.parts.filter((p) => p.rad)[0];
      if (radPart) {
        const r = RAD[radPart.rad];
        detail.radHint = {
          key: radPart.rad,
          glyph: r.g,
          name: r.name,
          color: r.color,
          theme: themeWordOf(radPart.rad),
        };
      }
    } else if (c.rad && RAD[c.rad]) {
      const r = RAD[c.rad];
      detail.radHint = { key: c.rad, glyph: r.g, name: r.name, color: r.color, theme: themeWordOf(c.rad) };
    } else {
      detail.soloNote = '这个字先读一读、写一写，把它记住吧～';
    }

    this.setData({ sel: ch, detail: detail });
    if (!silent) {
      speech.speak(ch);
      track.track('char_view', { char: ch, source: byChar[ch] ? 'characters' : 'shengziben' });
    }
  },

  onSpeakChar() {
    if (this.data.sel) speech.speak(this.data.sel);
  },

  /** 偏旁「一家人」浮层。 */
  onOpenRad(e) {
    const key = e.currentTarget.dataset.rad;
    if (!key || !RAD[key]) return;
    const r = RAD[key];
    this.setData({
      radSheet: {
        glyph: r.g,
        name: r.name,
        theme: r.theme,
        themeWord: themeWordOf(key),
        story: r.story,
        color: r.color,
        family: CHARS.filter((c) => c.rad === key).map((c) => ({ c: c.c, p: c.p })),
      },
    });
    track.track('char_radical_open', { rad: key });
  },

  onCloseRad() {
    this.setData({ radSheet: null });
  },

  onPickFromRad(e) {
    this.selectChar(e.currentTarget.dataset.c);
    this.setData({ radSheet: null });
  },

  // ==== 闯一闯 ================================================================

  /** 10 关, 三种题型轮换。独体字没有「一家人/主题」题, 退化成拼音题。 */
  buildQuiz() {
    const pool = shuffle(CHARS);
    const types = ['pinyin', 'family', 'theme'];
    this.quiz = [];
    for (let i = 0; i < QUIZ_TOTAL; i += 1) {
      const c = pool[i % pool.length];
      let t = types[i % 3];
      if ((t === 'family' || t === 'theme') && (!c.rad || CHARS.filter((x) => x.rad === c.rad).length < 2)) {
        t = 'pinyin';
      }
      this.quiz.push(this.makeQ(t, c));
    }
  },

  makeQ(type, c) {
    if (type === 'pinyin') {
      return {
        type: type,
        char: c.c,
        big: c.c,
        small: false,
        prompt: '这个字读什么？',
        opts: shuffle([c.p].concat(pick(PINYINS, 3, c.p))),
        correct: c.p,
        render: 'pinyin',
      };
    }
    if (type === 'family') {
      const fam = CHARS.filter((x) => x.rad === c.rad && x.c !== c.c);
      const correct = shuffle(fam)[0].c;
      const others = CHARS.filter((x) => x.rad !== c.rad).map((x) => x.c);
      return {
        type: type,
        char: c.c,
        big: c.c,
        small: false,
        prompt: `「${c.c}」和下面哪个字是「一家人」（同一个偏旁）？`,
        opts: shuffle([correct].concat(pick(others, 3, correct))),
        correct: correct,
        render: 'char',
      };
    }
    const r = RAD[c.rad];
    const themeWord = themeWordOf(c.rad);
    const allThemes = [];
    Object.keys(RAD).forEach((k) => {
      const t = themeWordOf(k);
      if (allThemes.indexOf(t) < 0) allThemes.push(t);
    });
    return {
      type: type,
      char: c.c,
      big: r.g,
      small: true,
      prompt: `「${c.c}」的偏旁是「${r.g}」，它常常和什么有关？`,
      opts: shuffle([themeWord].concat(pick(allThemes, 3, themeWord))),
      correct: themeWord,
      render: 'text',
    };
  },

  onStartQuiz() {
    this.buildQuiz();
    this.qIdx = 0;
    this.qScore = 0;
    this.setData({ quizState: 'play', qScore: 0, qResult: null });
    this.showQuestion();
    track.track('char_quiz_start', {});
  },

  showQuestion() {
    const q = this.quiz[this.qIdx];
    this.setData({
      q: q,
      qOpts: q.opts.map((o) => ({ value: o, state: '' })),
      qIndex: this.qIdx + 1,
      qPct: ((this.qIdx + 1) / QUIZ_TOTAL) * 100,
      qFeedback: '',
      qFeedbackOk: false,
      qAnswered: false,
    });
  },

  onAnswer(e) {
    if (this.data.qAnswered) return;
    const q = this.quiz[this.qIdx];
    const val = e.currentTarget.dataset.v;
    const right = val === q.correct;
    if (right) this.qScore += 1;
    // 正确项永远标绿; 选错时额外把错的那个标红
    this.setData({
      qAnswered: true,
      qScore: this.qScore,
      qOpts: q.opts.map((o) => ({
        value: o,
        state: o === q.correct ? 'correct' : o === val ? 'wrong' : '',
      })),
      qFeedbackOk: right,
      qFeedback: right ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : '没关系，正确答案已经标出来啦 💪',
    });
    if (q.char) speech.speak(q.char);
    track.track('char_quiz_answer', { type: q.type, correct: right });
  },

  onNextQuestion() {
    if (this.qIdx < QUIZ_TOTAL - 1) {
      this.qIdx += 1;
      this.showQuestion();
      return;
    }
    const s = this.qScore;
    const stars = s >= 9 ? '⭐⭐⭐' : s >= 6 ? '⭐⭐' : s >= 3 ? '⭐' : '🌱';
    const msg =
      s >= 9
        ? '识字小达人！你太厉害啦！'
        : s >= 6
          ? '很不错哦，再练练就满分啦！'
          : s >= 3
            ? '有进步！多读多写就会越来越好~'
            : '没关系，慢慢来，回去再学一学吧！';
    this.setData({ quizState: 'result', qResult: { stars: stars, score: s, total: QUIZ_TOTAL, msg: msg } });
    track.track('char_quiz_result', { score: s, total: QUIZ_TOTAL });
  },

  // ==== 生字本 ================================================================

  /** 拆一个词/字。内置字库有的给完整信息, 没有的只留字形。 */
  decompose(text) {
    const chars = String(text || '')
      .split('')
      .filter((c) => CJK.test(c));
    if (!chars.length) return null;
    const out = chars.map((c) => {
      const d = byChar[c];
      if (!d) return { c: c, py: '', radical: '—', struct: '', radKey: null };
      const rk = d.rad || d.evolve || null;
      return {
        c: c,
        py: d.p,
        radical: rk ? RAD[rk].g : '独体',
        struct: d.struct === '独体' ? '独体字' : d.struct + '结构',
        radKey: rk,
      };
    });
    return {
      word: chars.join(''),
      py: out.map((d) => d.py).join(' ').trim(),
      chars: out,
    };
  },

  /** 生字本条目 → 视图模型 (拆解格子的颜色/部首徽章都提前算好)。 */
  renderNote() {
    const filter = this.data.filterScene;
    const list = (this.note || [])
      .filter((e) => filter === '全部' || e.scene === filter)
      .map((e) => ({
        id: e.id,
        word: e.word,
        py: e.py || '',
        scene: e.scene,
        note: e.note || '',
        reviews: e.reviews || 0,
        cells: (e.dec || []).map((d) => ({
          c: d.c,
          py: d.py || '',
          radical: d.radical || '',
          struct: d.struct || '',
          color: d.radKey && RAD[d.radKey] ? RAD[d.radKey].color : '',
        })),
      }));

    const counts = { 全部: (this.note || []).length };
    SCENES.forEach((s) => (counts[s] = 0));
    (this.note || []).forEach((e) => {
      if (counts[e.scene] != null) counts[e.scene] += 1;
    });
    const filters = ['全部'].concat(SCENES).map((s) => ({
      key: s,
      label: s + (counts[s] ? ' ' + counts[s] : ''),
      active: s === filter,
      show: s === '全部' || counts[s] > 0,
    }));

    this.setData({
      noteList: list,
      noteCount: (this.note || []).length,
      filters: filters.filter((f) => f.show),
    });
  },

  onWordInput(e) {
    this.data.wordInput = e.detail.value;
  },

  onNoteInput(e) {
    this.data.noteInput = e.detail.value;
  },

  onPickScene(e) {
    const s = e.currentTarget.dataset.s;
    this.setData({ newScene: s, scenes: SCENES.map((x) => ({ key: x, active: x === s })) });
  },

  onPickFilter(e) {
    this.setData({ filterScene: e.currentTarget.dataset.s });
    this.renderNote();
  },

  onAddEntry() {
    const dec = this.decompose(this.data.wordInput);
    if (!dec) {
      wx.showToast({ title: '请先输入一个汉字或词语', icon: 'none' });
      return;
    }
    const ts = Date.now();
    // 云端合并是按 word 去重的 (见 utils/notebook.js), 本地再存一条重复的
    // 迟早会被同步吃掉 —— 直接就地更新, 顺手把它顶到最前面。
    const dup = this.note.filter((e) => e.word === dec.word)[0];
    if (dup) this.note = this.note.filter((e) => e !== dup);
    this.note.unshift({
      id: dup ? dup.id : uniqueId(this.note, ts),
      word: dec.word,
      py: dec.py,
      dec: dec.chars,
      scene: this.data.newScene,
      note: String(this.data.noteInput || '').trim(),
      ts: ts,
      reviews: dup ? dup.reviews || 0 : 0,
    });
    this.saveNote();
    this.setData({ wordInput: '', noteInput: '', filterScene: '全部' });
    this.renderNote();
    this.renderPicker();
    speech.speak(dec.word);
    track.track('shengziben_add', { word: dec.word, scene: this.data.newScene });
    wx.showToast({ title: dup ? '已更新' : '已加入生字本', icon: 'success' });
  },

  onDelEntry(e) {
    const id = Number(e.currentTarget.dataset.id);
    const entry = (this.note || []).filter((x) => x.id === id)[0];
    wx.showModal({
      title: '删掉这个字？',
      content: entry ? `「${entry.word}」会从生字本移除。` : '',
      confirmText: '删除',
      confirmColor: '#f0564a',
      success: (r) => {
        if (!r.confirm) return;
        this.note = this.note.filter((x) => x.id !== id);
        this.saveNote();
        this.renderNote();
        this.renderPicker();
      },
    });
  },

  saveNote() {
    const ts = Date.now();
    notebook.save(this.studentId, this.note, ts);
    notebook.push(this.note, ts);
  },

  // ---- 复习 ------------------------------------------------------------------

  onStartReview() {
    const filter = this.data.filterScene;
    const set = (this.note || []).filter((e) => filter === '全部' || e.scene === filter);
    if (!set.length) {
      wx.showToast({ title: '先录入一些生字吧', icon: 'none' });
      return;
    }
    this.revQueue = shuffle(set.slice());
    this.revIdx = 0;
    this.revDone = 0;
    this.renderReview();
    track.track('shengziben_review_start', { count: this.revQueue.length, scene: filter });
  },

  renderReview() {
    if (this.revIdx >= this.revQueue.length) {
      this.setData({ review: { finished: true, total: this.revQueue.length } });
      return;
    }
    const e = this.revQueue[this.revIdx];
    this.setData({
      review: {
        finished: false,
        flipped: false,
        scopeLabel: this.data.filterScene === '全部' ? '全部' : '【' + this.data.filterScene + '】',
        position: this.revIdx + 1,
        total: this.revQueue.length,
        word: e.word,
        scene: e.scene,
        note: e.note || '',
        py: e.py || '',
        cells: [],
        story: '',
      },
    });
  },

  /** 翻面: 读音 + 拆解 + 偏旁小故事。 */
  onFlipReview() {
    if (!this.data.review || this.data.review.flipped) return;
    const e = this.revQueue[this.revIdx];
    const known = (e.dec || []).filter((d) => d.radKey && RAD[d.radKey])[0];
    speech.speak(e.word);
    this.setData({
      'review.flipped': true,
      'review.cells': (e.dec || []).map((d) => ({
        c: d.c,
        py: d.py || '',
        radical: d.radical || '',
        struct: d.struct || '',
        color: d.radKey && RAD[d.radKey] ? RAD[d.radKey].color : '',
      })),
      'review.story': known ? RAD[known.radKey].story : '',
    });
  },

  /** 记住了 → reviews+1 并前进; 没记住 → 排到队尾再练一次。 */
  onMarkReview(e) {
    const got = e.currentTarget.dataset.got === 'yes';
    const cur = this.revQueue[this.revIdx];
    track.track('shengziben_review_mark', { word: cur && cur.word, got: got });
    if (got) {
      const real = (this.note || []).filter((x) => x.id === cur.id)[0];
      if (real) real.reviews = (real.reviews || 0) + 1;
      this.revDone += 1;
      this.saveNote();
    } else {
      this.revQueue.push(cur);
    }
    this.revIdx += 1;
    this.renderReview();
  },

  onCloseReview() {
    speech.cancel();
    this.setData({ review: null });
    this.renderNote();
  },

  // ==== 通用 ==================================================================

  onOpenReading() {
    wx.navigateTo({ url: '/packages/lang/pages/reading/reading' });
  },

  onExit() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/portal/portal' }) });
  },

  noop() {},
});
