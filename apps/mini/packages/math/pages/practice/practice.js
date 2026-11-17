// 知识点练习 (不计时) —— 对应 Web 端 src/ui/PracticeScreen.tsx + usePractice.ts。
//
// 练习题集在 math 分包内 (体积大), 所以这里 require 的是分包自己的 content/index.js。
//
// 英语题集 (KET/PET 语法阅读) 用的是同一套 PracticePack 结构, 也走这个页面:
// `?pack=english&setId=ket_grammar`。它只有 16KB 放在主包, 备考清单 (exam 分包)
// 也要读 —— 分包之间不能互相 require。页面路径带 math 只是历史位置, 用户看不到。
const family = require('../../../../utils/family.js');
const track = require('../../../../utils/track.js');
const { createDefaultAdapter } = require('../../../../utils/storage.js');
const { mulberry32 } = require('../../../../vendor/engine');
const {
  correctText,
  practiceInit,
  practiceStep,
  responseText,
  xpForCorrect,
} = require('../../../../vendor/practice');
const { CHECKIN_XP, recordCheckIn } = require('../../../../utils/streak.js');
const packIndex = require('../../content/index.js');
const mainContent = require('../../../../content/index.js');

// 一次答对但超过这个时长, 记进错题本供家长关注 (与 Web 端同一阈值)
const SLOW_PRACTICE_MS = 20000;

const DIFFICULTY_ORDER = ['basic', 'consolidate', 'challenge'];
const TIER_LABEL = { basic: '基础', consolidate: '夯实', challenge: '拔高' };

Page({
  data: {
    ready: false,
    title: '练习',
    mode: 'loading',
    // 当前题
    promptText: '',
    isVertical: false, // 竖式需要等宽字体 + 保留空白
    sourceLabel: '',
    type: '',
    choices: [],
    fields: [],
    hint: '',
    showHint: false,
    val: '',
    fieldValues: {},
    // 反馈
    correctAnswer: '',
    explanation: '',
    gainedXp: 0,
    firstTry: false,
    // 进度
    position: 0,
    total: 0,
    sessionXp: 0,
    stages: [],
    // 完成
    firstTryCorrect: 0,
  },

  onLoad(query) {
    const isEnglish = query.pack === 'english';
    const grade = Number(query.grade) || 3;
    const setId = query.setId;
    let pack;
    try {
      pack = isEnglish ? mainContent.englishPack() : packIndex.practicePack(grade);
    } catch (e) {
      wx.showToast({ title: '题集加载失败', icon: 'none' });
      return;
    }
    const set = pack.sets.filter((s) => s.id === setId)[0];
    if (!set) {
      wx.showToast({ title: '找不到这组练习', icon: 'none' });
      return;
    }

    this.setId = setId;
    this.numericInput = !isEnglish; // 英语填空要能打字母
    this.studentId = family.currentStudentId();
    this.adapter = createDefaultAdapter();
    this.missed = {}; // 同一题只进一次错题本
    this.sessionXp = 0;
    this.best = 0;
    wx.setNavigationBarTitle({ title: set.title });

    // 每次进来换一个种子 → 题序不同, 避免"背第几题是哪题"
    this.ctx = { set: set, rng: mulberry32(Date.now() >>> 0), now: () => Date.now() };

    this.adapter.getPractice(this.studentId, setId).then((prev) => {
      this.best = (prev && prev.bestFirstTry) || 0;
      this.game = practiceStep(practiceInit(set, this.ctx.rng), { type: 'NEXT' }, this.ctx);
      this.presentedAt = this.ctx.now();
      this.setData({ ready: true, title: set.title, total: set.problems.length });
      this.render();
    });
  },

  // ---- 派发 ------------------------------------------------------------------

  dispatch(event) {
    if (!this.game) return;
    const elapsedMs = this.ctx.now() - this.presentedAt;
    const res = practiceStep(this.game.state, event, this.ctx);
    this.game = res;
    const act = res.action;

    if (event.type === 'ANSWER') {
      const ci = recordCheckIn(this.studentId);
      if (ci.firstToday) this.adapter.addXp(this.studentId, CHECKIN_XP);
    }
    if (act.kind === 'PRESENT') this.presentedAt = this.ctx.now();

    if (act.kind === 'CORRECT') {
      const p = act.problem;
      const xp = xpForCorrect(p.difficulty, act.firstTry);
      this.sessionXp += xp;
      this.lastXp = xp;
      this.adapter.addXp(this.studentId, xp);
      // 一次答对但很慢 —— 也值得家长看一眼
      if (act.firstTry && elapsedMs > SLOW_PRACTICE_MS && !this.missed[p.id]) {
        this.missed[p.id] = true;
        this.adapter.appendMistake({
          studentId: this.studentId,
          source: 'practice',
          topicId: this.setId,
          topicTitle: this.ctx.set.title,
          problemId: p.id,
          prompt: p.prompt,
          difficulty: p.difficulty || 'consolidate',
          yourAnswer: correctText(p),
          correctAnswer: correctText(p),
          elapsedMs: elapsedMs,
          slow: true,
          ts: this.ctx.now(),
          corrected: false,
        });
      }
    }

    if ((act.kind === 'WRONG' || act.kind === 'REVEAL') && event.type === 'ANSWER') {
      const p = act.problem;
      if (!this.missed[p.id]) {
        this.missed[p.id] = true;
        this.adapter.appendMistake({
          studentId: this.studentId,
          source: 'practice',
          topicId: this.setId,
          topicTitle: this.ctx.set.title,
          problemId: p.id,
          prompt: p.prompt,
          difficulty: p.difficulty || 'consolidate',
          yourAnswer: responseText(p, event.response),
          correctAnswer: correctText(p),
          elapsedMs: elapsedMs,
          ts: this.ctx.now(),
          corrected: false,
        });
      }
    }

    if (act.kind === 'SET_COMPLETE') {
      this.best = Math.max(this.best, act.firstTryCorrect);
      this.adapter.putPractice({
        studentId: this.studentId,
        setId: this.setId,
        completed: true,
        bestFirstTry: this.best,
        total: act.total,
        updatedAt: this.ctx.now(),
      });
      track.track('practice_complete', {
        setId: this.setId,
        firstTryCorrect: act.firstTryCorrect,
        total: act.total,
      });
    }

    if (event.type === 'ANSWER' && (act.kind === 'CORRECT' || act.kind === 'WRONG' || act.kind === 'REVEAL')) {
      track.track('practice_answer', {
        setId: this.setId,
        result: act.kind.toLowerCase(),
        difficulty: act.problem.difficulty || 'consolidate',
        firstTry: act.kind === 'CORRECT' ? act.firstTry : false,
        ms: elapsedMs,
      });
    }

    this.render();
  },

  // ---- 渲染 ------------------------------------------------------------------

  render() {
    const act = this.game.action;
    const patch = { sessionXp: this.sessionXp, position: Math.min(this.game.state.index + 1, this.data.total) };

    if (act.kind === 'SET_COMPLETE') {
      this.setData(
        Object.assign(patch, {
          mode: 'complete',
          firstTryCorrect: act.firstTryCorrect,
          total: act.total,
        }),
      );
      return;
    }

    const p = act.problem;
    const tier = p.difficulty || 'consolidate';
    const activeIdx = DIFFICULTY_ORDER.indexOf(tier);
    patch.stages = DIFFICULTY_ORDER.map((d, i) => ({
      key: d,
      label: (i < activeIdx ? '✓ ' : '') + TIER_LABEL[d] + '关',
      state: i < activeIdx ? 'done' : i === activeIdx ? 'active' : 'todo',
    }));
    // 竖式题的 prompt 带横线, 要等宽字体 + 保留换行
    patch.isVertical = p.prompt.indexOf('─') >= 0;
    patch.promptText = p.prompt;
    patch.sourceLabel = (p.source && p.source.label) || '';
    patch.type = p.type;
    patch.choices = p.choices || [];
    patch.fields = (p.fields || []).map((f, i) => ({
      key: f.id || `f${i}`,
      label: f.label,
    }));
    patch.hint = p.hint || '';

    if (act.kind === 'PRESENT') {
      Object.assign(patch, {
        mode: 'present',
        showHint: false,
        val: '',
        fieldValues: {},
      });
    } else if (act.kind === 'WRONG') {
      Object.assign(patch, { mode: 'wrong', showHint: !!p.hint, val: '', fieldValues: {} });
    } else if (act.kind === 'CORRECT') {
      Object.assign(patch, {
        mode: 'correct',
        firstTry: act.firstTry,
        gainedXp: this.lastXp || 0,
        explanation: p.explanation || '',
      });
    } else if (act.kind === 'REVEAL') {
      Object.assign(patch, {
        mode: 'reveal',
        correctAnswer: correctText(p),
        explanation: p.explanation || '',
      });
    }

    this.setData(patch);
  },

  // ---- 交互 ------------------------------------------------------------------

  onValInput(e) {
    const raw = e.detail.value;
    const val = this.numericInput ? raw.replace(/[^\d.\-/]/g, '').slice(0, 12) : raw.slice(0, 24);
    this.setData({ val: val });
  },

  onFieldInput(e) {
    const key = e.currentTarget.dataset.key;
    const next = Object.assign({}, this.data.fieldValues);
    next[key] = e.detail.value.slice(0, 24);
    this.setData({ fieldValues: next });
  },

  onChoice(e) {
    if (this.data.mode !== 'present' && this.data.mode !== 'wrong') return;
    this.dispatch({ type: 'ANSWER', response: { kind: 'choice', choiceId: e.currentTarget.dataset.id } });
  },

  onSubmit() {
    if (this.data.mode !== 'present' && this.data.mode !== 'wrong') return;
    if (this.data.type === 'fill') {
      if (this.data.val.trim() === '') return;
      this.dispatch({ type: 'ANSWER', response: { kind: 'value', value: this.data.val } });
    } else if (this.data.type === 'steps') {
      this.dispatch({ type: 'ANSWER', response: { kind: 'fields', values: this.data.fieldValues } });
    }
  },

  onNext() {
    this.dispatch({ type: 'NEXT' });
  },

  onExit() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/portal/portal' }) });
  },
});
