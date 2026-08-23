// 英语背单词 —— 对应 Web 端 public/vocab.html + vocab-app.js。
//
// Web 端这块是一个独立 HTML, 首页用 iframe 嵌进去 (src/ui/EnglishVocab.tsx)。
// 小程序的 web-view 要求域名已备案, 星芽当前域名备不了, 所以这里是原生重写:
// 词库由 scripts/build-mini-content.mjs 从 public/vocab-data.js 直接生成,
// 交互逻辑 (四种模式 / 队列排序 / 掌握判定 / 云同步) 逐条对齐 vocab-app.js。
//
// 相对 Web 端的取舍:
//   · 去掉 audioOnly (纯听模式) —— 依赖稳定 TTS, 小程序侧要插件, 不适合做默认路径
//   · dictation 只在同声传译插件可用时出现 —— 没声音的听写是坏功能, 不如不给
//   · 主题从 pill 行换成 picker —— 12 个主题在手机上横排太挤

const LIB = require('../../content/vocab.js');
const store = require('../../utils/vocabStore.js');
const family = require('../../../../utils/family.js');
const track = require('../../../../utils/track.js');
const trial = require('../../../../utils/trial.js');
const speech = require('../../../../utils/speech.js');
const { createDefaultAdapter } = require('../../../../utils/storage.js');
const { CHECKIN_XP, recordCheckIn } = require('../../../../utils/streak.js');

const FOCUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'daily', label: '今日' },
  { key: 'wrong', label: '错词' },
  { key: 'favorites', label: '收藏' },
];

const MODE_TABS = [
  { key: 'flashcard', label: '卡片' },
  { key: 'spelling', label: '拼写' },
  { key: 'dictation', label: '听写', needsSpeech: true },
  { key: 'cloze', label: '填空' },
];

const PROMPT_LABEL = {
  flashcard: 'Flashcard',
  spelling: 'Spell It',
  dictation: 'Dictation',
  cloze: 'Cloze',
};

const DAILY_TARGET_OPTIONS = [10, 20, 30, 50];
const DEFAULT_DAILY_TARGET = 20;
// 连对 2 次算掌握 —— 与 Web 端同一阈值
const MASTER_STREAK = 2;

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

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizeAnswer(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function maskWord(word) {
  if (word.length <= 4) return word.charAt(0) + new Array(Math.max(0, word.length - 1) + 1).join('_');
  return word.charAt(0) + new Array(word.length - 2 + 1).join('_') + word.charAt(word.length - 1);
}

function makeCloze(example, word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return example.replace(new RegExp(escaped, 'i'), '______');
}

const LEVEL_SHORT = {};
LIB.levels.forEach((l) => (LEVEL_SHORT[l.id] = l.shortLabel));
const TOPIC_LABEL = {};
LIB.topics.forEach((t) => (TOPIC_LABEL[t.id] = t.label));

Page({
  data: {
    ready: false,
    // 过滤器
    levelTabs: [],
    topicNames: [],
    topicIndex: 0,
    topicLabel: '全部主题',
    focusTabs: [],
    modeTabs: [],
    defLangTabs: [],
    onlyUnmastered: false,
    randomOrder: false,
    dailyTarget: DEFAULT_DAILY_TARGET,
    targetOptions: DAILY_TARGET_OPTIONS,
    showSettings: false,
    // 顶部统计
    masteredCount: 0,
    poolCount: 0,
    pct: 0,
    syncText: '',
    // 舞台
    stageState: 'card', // card | empty | done
    card: null,
    reveal: false,
    answer: '',
    feedback: null,
    position: 0,
    total: 0,
    speechOn: false,
    trialBlocked: false,
  },

  onLoad(query) {
    this.studentId = family.currentStudentId();
    this.adapter = createDefaultAdapter();
    this.speechOn = speech.available();

    // 词库 → 带 key 的条目 + key 索引 (合并云端进度时要按 key 找回词条)
    this.words = LIB.words.map((w) => {
      const item = {
        word: w.word,
        meaning: w.meaning,
        example: w.example,
        level: w.level,
        topic: w.topic,
      };
      item.key = store.makeWordKey(item);
      return item;
    });
    this.wordByKey = {};
    this.words.forEach((w) => (this.wordByKey[w.key] = w));

    this.stats = store.loadProgress();
    this.applyPrefs(query);

    this.setData({
      speechOn: this.speechOn,
      modeTabs: MODE_TABS.filter((m) => !m.needsSpeech || this.speechOn).map((m) => ({
        key: m.key,
        label: m.label,
        active: m.key === this.mode,
      })),
      topicNames: ['全部主题'].concat(LIB.topics.map((t) => t.label)),
    });

    this.buildQueue();
    this.render();
    this.setData({ ready: true, trialBlocked: trial.trialExceeded('english') });

    track.track('vocab_open', { level: this.level, topic: this.topic, focus: this.focus, mode: this.mode });

    // 云端进度合并。失败也不挡: 本地进度已经渲染出来了
    store.pullAndMerge(this.stats, this.wordByKey).then((res) => {
      if (!res.synced) return;
      this.stats = res.stats;
      this.buildQueue();
      this.render();
      this.setData({ syncText: '已同步云端进度' });
    });
  },

  onUnload() {
    store.flushSync();
    speech.cancel();
  },

  onHide() {
    store.flushSync();
    speech.cancel();
  },

  // ---- 偏好 ------------------------------------------------------------------

  /** URL 参数 > 上次偏好 > 默认。level/topic 由首页「我要备考」深链带进来。 */
  applyPrefs(query) {
    const prefs = store.loadPrefs();
    const validLevel = {};
    LIB.levels.forEach((l) => (validLevel[l.id] = 1));
    const validTopic = {};
    LIB.topics.forEach((t) => (validTopic[t.id] = 1));
    const validMode = {};
    MODE_TABS.forEach((m) => {
      if (!m.needsSpeech || this.speechOn) validMode[m.key] = 1;
    });
    const validFocus = {};
    FOCUS_TABS.forEach((f) => (validFocus[f.key] = 1));

    const q = query || {};
    this.level = validLevel[q.level] ? q.level : validLevel[prefs.level] ? prefs.level : 'all';
    this.topic = validTopic[q.topic] ? q.topic : validTopic[prefs.topic] ? prefs.topic : 'all';
    this.mode = validMode[q.mode] ? q.mode : validMode[prefs.mode] ? prefs.mode : 'flashcard';
    this.focus = validFocus[q.focus] ? q.focus : validFocus[prefs.focus] ? prefs.focus : 'all';
    this.defLang = q.def === 'en' || prefs.defLang === 'en' ? 'en' : 'zh';
    this.onlyUnmastered = !!prefs.onlyUnmastered;
    this.randomOrder = !!prefs.randomOrder;
    this.dailyTarget =
      DAILY_TARGET_OPTIONS.indexOf(Number(prefs.dailyTarget)) >= 0 ? Number(prefs.dailyTarget) : DEFAULT_DAILY_TARGET;
  },

  savePrefs() {
    store.savePrefs({
      level: this.level,
      topic: this.topic,
      mode: this.mode,
      focus: this.focus,
      defLang: this.defLang,
      onlyUnmastered: this.onlyUnmastered,
      randomOrder: this.randomOrder,
      dailyTarget: this.dailyTarget,
    });
  },

  // ---- 进度 ------------------------------------------------------------------

  entryOf(item) {
    if (!this.stats[item.key]) this.stats[item.key] = store.normalizeEntry({}, item);
    return this.stats[item.key];
  },

  meaningOf(item) {
    if (this.defLang === 'en' && LIB.defs[item.word]) return LIB.defs[item.word];
    return item.meaning;
  },

  // ---- 队列 ------------------------------------------------------------------

  basePool() {
    return this.words.filter((item) => {
      const levelOk = this.level === 'all' || item.level === this.level;
      const topicOk = this.topic === 'all' || item.topic === this.topic;
      const masteryOk = !this.onlyUnmastered || !this.entryOf(item).mastered;
      return levelOk && topicOk && masteryOk;
    });
  },

  /** 今日推荐: 未掌握优先 → 错得多优先 → 见得少优先 → 按日期哈希打散。 */
  dailyWords(pool) {
    const today = todayStr();
    const sorted = pool.slice().sort((a, b) => {
      const sa = this.entryOf(a);
      const sb = this.entryOf(b);
      if (sa.mastered !== sb.mastered) return sa.mastered ? 1 : -1;
      if (sa.wrong !== sb.wrong) return sb.wrong - sa.wrong;
      if (sa.seen !== sb.seen) return sa.seen - sb.seen;
      if (sa.streak !== sb.streak) return sa.streak - sb.streak;
      const ha = hashString(today + ':' + a.key);
      const hb = hashString(today + ':' + b.key);
      if (ha !== hb) return ha - hb;
      return a.word < b.word ? -1 : a.word > b.word ? 1 : 0;
    });
    return sorted.slice(0, Math.min(this.dailyTarget, sorted.length));
  },

  filteredWords() {
    const pool = this.basePool();
    if (this.focus === 'wrong') return pool.filter((i) => this.entryOf(i).wrong > 0);
    if (this.focus === 'favorites') return pool.filter((i) => this.entryOf(i).favorite);
    if (this.focus === 'daily') return this.dailyWords(pool);
    return pool;
  },

  buildQueue() {
    const pool = this.filteredWords();
    const sorted = pool.slice().sort((a, b) => {
      const sa = this.entryOf(a);
      const sb = this.entryOf(b);
      if (sa.mastered !== sb.mastered) return sa.mastered ? 1 : -1;
      if (sa.streak !== sb.streak) return sa.streak - sb.streak;
      if (sa.seen !== sb.seen) return sa.seen - sb.seen;
      return a.word < b.word ? -1 : a.word > b.word ? 1 : 0;
    });
    this.queue = this.randomOrder ? shuffle(sorted) : sorted;
    this.index = 0;
    this.answer = '';
    this.revealed = false;
    this.feedback = null;
  },

  currentItem() {
    return this.queue[this.index] || null;
  },

  // ---- 渲染 ------------------------------------------------------------------
  //
  // WXML 里不能调函数, 所以卡片的每一行文案都在这里算好。

  render() {
    const pool = this.filteredWords();
    const mastered = pool.filter((i) => this.entryOf(i).mastered).length;

    const patch = {
      levelTabs: LIB.levels.map((l) => ({ key: l.id, label: l.shortLabel, active: l.id === this.level })),
      focusTabs: FOCUS_TABS.map((f) => ({
        key: f.key,
        label: f.key === 'daily' ? `今日 ${this.dailyTarget}` : f.label,
        active: f.key === this.focus,
      })),
      modeTabs: MODE_TABS.filter((m) => !m.needsSpeech || this.speechOn).map((m) => ({
        key: m.key,
        label: m.label,
        active: m.key === this.mode,
      })),
      defLangTabs: [
        { key: 'zh', label: '中文释义', active: this.defLang === 'zh' },
        { key: 'en', label: '英英释义', active: this.defLang === 'en' },
      ],
      topicIndex: this.topic === 'all' ? 0 : LIB.topics.map((t) => t.id).indexOf(this.topic) + 1,
      topicLabel: this.topic === 'all' ? '全部主题' : TOPIC_LABEL[this.topic],
      onlyUnmastered: this.onlyUnmastered,
      randomOrder: this.randomOrder,
      dailyTarget: this.dailyTarget,
      masteredCount: mastered,
      poolCount: pool.length,
      pct: pool.length ? Math.round((mastered / pool.length) * 100) : 0,
      total: this.queue.length,
      position: Math.min(this.index + 1, this.queue.length),
      answer: this.answer,
      reveal: this.revealed,
      feedback: this.feedback,
    };

    if (!pool.length) {
      this.setData(Object.assign(patch, { stageState: 'empty', card: null }));
      return;
    }

    const item = this.currentItem();
    if (!item) {
      this.setData(Object.assign(patch, { stageState: 'done', card: null }));
      return;
    }

    const entry = this.entryOf(item);
    const meaning = this.meaningOf(item);
    const topicLabel = TOPIC_LABEL[item.topic] || item.topic;
    const card = {
      word: item.word,
      meaning: meaning,
      example: item.example,
      topicLabel: topicLabel,
      levelLabel: LEVEL_SHORT[item.level] || item.level,
      promptLabel: PROMPT_LABEL[this.mode],
      statusLabel: entry.mastered ? '已掌握' : '学习中',
      streak: entry.streak,
      favorite: entry.favorite,
      // 各模式的显隐 —— 全部提前算好, WXML 只做 wx:if
      headline: '',
      subline: '',
      showWordSpeak: this.speechOn,
      showMeaningCard: false,
      showExampleCard: false,
      exampleText: item.example,
      showInput: false,
      inputPlaceholder: '',
      answerCard: '',
    };

    if (this.mode === 'flashcard') {
      card.headline = item.word;
      card.subline = `${card.levelLabel} · ${topicLabel}`;
      card.showMeaningCard = true; // 内容按 reveal 遮罩
      card.showExampleCard = true;
    } else if (this.mode === 'spelling') {
      card.headline = meaning;
      card.subline = `${topicLabel} · 提示 ${maskWord(item.word)}`;
      card.showExampleCard = true;
      card.showInput = true;
      card.inputPlaceholder = '拼出这个单词';
    } else if (this.mode === 'dictation') {
      card.headline = '听写';
      card.subline = `${topicLabel} · 点播放, 听到什么写什么`;
      card.showInput = true;
      card.inputPlaceholder = '写下你听到的词';
      card.answerCard = item.word;
    } else if (this.mode === 'cloze') {
      card.headline = meaning;
      card.subline = `${topicLabel} · 根据释义补全句子`;
      card.showExampleCard = true;
      card.exampleText = makeCloze(item.example, item.word);
      card.showInput = true;
      card.inputPlaceholder = '填入空格里的词';
    }

    this.setData(Object.assign(patch, { stageState: 'card', card: card }));
  },

  // ---- 过滤器交互 --------------------------------------------------------------

  onPickLevel(e) {
    this.level = e.currentTarget.dataset.key;
    this.afterFilterChange('level');
  },

  onPickTopic(e) {
    const i = Number(e.detail.value);
    this.topic = i === 0 ? 'all' : LIB.topics[i - 1].id;
    this.afterFilterChange('topic');
  },

  onPickFocus(e) {
    this.focus = e.currentTarget.dataset.key;
    this.afterFilterChange('focus');
  },

  onPickMode(e) {
    this.mode = e.currentTarget.dataset.key;
    this.answer = '';
    this.revealed = false;
    this.feedback = null;
    this.savePrefs();
    this.render();
    track.track('vocab_mode_change', { mode: this.mode });
  },

  onPickDefLang(e) {
    this.defLang = e.currentTarget.dataset.key;
    this.savePrefs();
    this.render();
  },

  onPickTarget(e) {
    this.dailyTarget = Number(e.currentTarget.dataset.n);
    this.afterFilterChange('dailyTarget');
  },

  onToggleUnmastered() {
    this.onlyUnmastered = !this.onlyUnmastered;
    this.afterFilterChange('onlyUnmastered');
  },

  onToggleRandom() {
    this.randomOrder = !this.randomOrder;
    this.afterFilterChange('randomOrder');
  },

  afterFilterChange(what) {
    this.savePrefs();
    this.buildQueue();
    this.render();
    track.track('vocab_filter_change', { filter: what, level: this.level, topic: this.topic, focus: this.focus });
  },

  onToggleSettings() {
    this.setData({ showSettings: !this.data.showSettings });
  },

  // ---- 答题交互 ----------------------------------------------------------------

  onSpeakWord() {
    const item = this.currentItem();
    if (item) speech.speakEn(item.word);
  },

  onSpeakSentence() {
    const item = this.currentItem();
    if (item) speech.speakEn(item.example);
  },

  onToggleReveal() {
    this.revealed = !this.revealed;
    this.setData({ reveal: this.revealed });
  },

  onToggleFavorite() {
    const item = this.currentItem();
    if (!item) return;
    const entry = this.entryOf(item);
    entry.favorite = !entry.favorite;
    entry.word = item.word;
    entry.topic = item.topic;
    entry.updatedAt = new Date().toISOString();
    store.saveProgress(this.stats);
    store.scheduleSync(this.stats, [item.key]);
    this.render();
  },

  onAnswerInput(e) {
    this.answer = e.detail.value;
  },

  /** 直接看答案 = 记一次错 (与 Web 端一致, 免得靠翻答案刷"掌握")。 */
  onReveal() {
    const item = this.currentItem();
    if (!item) return;
    this.revealed = true;
    this.feedback = { correct: false, message: `正确答案：${item.word} · ${this.meaningOf(item)}` };
    this.render();
    track.track('vocab_reveal_answer', { mode: this.mode, word: item.word, topic: item.topic });
  },

  onSubmit() {
    const item = this.currentItem();
    if (!item) return;
    const correct = normalizeAnswer(this.answer) === normalizeAnswer(item.word);
    this.revealed = true;
    this.feedback = correct
      ? { correct: true, message: `${item.word} — ${this.meaningOf(item)}` }
      : { correct: false, message: `正确答案：${item.word} · ${this.meaningOf(item)}` };
    this.render();
  },

  onKnown() {
    this.commit(true);
  },

  onAgain() {
    this.commit(false);
  },

  onContinue() {
    this.commit(this.feedback ? this.feedback.correct : false);
  },

  onRestart() {
    this.buildQueue();
    this.render();
  },

  /**
   * 记一次结果并推进队列。
   * 答对 → streak+1, 连对 2 次算掌握, 队列前进。
   * 答错 → streak 归零, 该词插回后面第 2 个位置, 本轮还会再见到。
   */
  commit(correct) {
    const item = this.currentItem();
    if (!item) return;

    const entry = this.entryOf(item);
    entry.word = item.word;
    entry.topic = item.topic;
    entry.updatedAt = new Date().toISOString();
    entry.seen += 1;
    if (correct) {
      entry.streak += 1;
      entry.mastered = entry.streak >= MASTER_STREAK;
    } else {
      entry.streak = 0;
      entry.mastered = false;
      entry.wrong += 1;
    }
    store.saveProgress(this.stats);
    store.scheduleSync(this.stats, [item.key]);

    // 背单词也算今天学过 —— 只背英语的那天首页 streak 不该断
    const ci = recordCheckIn(this.studentId);
    if (ci.firstToday) this.adapter.addXp(this.studentId, CHECKIN_XP);

    track.track('vocab_word_complete', {
      mode: this.mode,
      focus: this.focus,
      correct: correct,
      word: item.word,
      topic: item.topic,
    });

    if (correct) {
      this.index += 1;
    } else {
      const retry = this.queue.splice(this.index, 1)[0];
      this.queue.splice(Math.min(this.index + 2, this.queue.length), 0, retry);
    }

    this.answer = '';
    this.revealed = false;
    this.feedback = null;
    this.render();

    // 未登录的免费体验额度
    if (trial.bump('english')) this.setData({ trialBlocked: true });
  },

  onLoginFromTrial() {
    wx.switchTab({ url: '/pages/mine/mine' });
  },

  onExit() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/portal/portal' }) });
  },

  noop() {},
});
