// 小程序页面冒烟测试。用假的 wx / Page 全局把页面 require 进来跑一遍,
// 抓语法错、未定义引用、onLoad 崩溃、视图模型算错这类问题。不是 UI 测试 ——
// 布局/样式只能靠微信开发者工具看。
//
// 为什么值得有: 小程序没有类型检查, 页面又都是"WXML 只读 data"的模式, 一个
// 拼错的字段在真机上是静默空白。这里把每页的交互按真实顺序走一遍, 断言 data。
//
// 用法: npm run mini:test

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MINI = resolve(ROOT, 'apps/mini');
const req = createRequire(resolve(MINI, 'noop.cjs'));

const store = new Map();
let captured = null;
let lastNav = '';

globalThis.Page = (opts) => {
  captured = opts;
};
globalThis.getApp = () => ({ globalData: {} });
globalThis.requirePlugin = () => {
  throw new Error('plugin not available in smoke test');
};
globalThis.wx = {
  getStorageSync: (k) => (store.has(k) ? store.get(k) : ''),
  setStorageSync: (k, v) => store.set(k, v),
  removeStorageSync: (k) => store.delete(k),
  getStorageInfoSync: () => ({ keys: [...store.keys()], currentSize: 0, limitSize: 10240 }),
  getSystemInfoSync: () => ({ windowWidth: 375, SDKVersion: '3.0.0' }),
  showToast: (o) => log('  toast:', o.title),
  showModal: (o) => {
    log('  modal:', o.title);
    o.success && o.success({ confirm: true });
  },
  showLoading: () => {},
  hideLoading: () => {},
  setNavigationBarTitle: () => {},
  setClipboardData: (o) => {
    lastNav = 'clipboard:' + o.data;
    o.success && o.success();
  },
  navigateTo: (o) => {
    lastNav = o.url;
    log('  navigateTo:', o.url);
  },
  redirectTo: (o) => {
    lastNav = o.url;
    log('  redirectTo:', o.url);
  },
  navigateBack: (o) => (o && o.fail ? o.fail() : undefined),
  switchTab: (o) => {
    lastNav = o.url;
    log('  switchTab:', o.url);
  },
  login: (o) => o.fail && o.fail({ errMsg: 'offline' }),
  request: (o) => o.fail && o.fail({ errMsg: 'offline' }),
  createInnerAudioContext: () => ({ play() {}, stop() {}, destroy() {} }),
  getUpdateManager: () => ({ onCheckForUpdate() {}, onUpdateReady() {}, onUpdateFailed() {} }),
};

let quiet = false;
function log(...args) {
  if (!quiet) console.log(...args);
}

/** setData 支持 'a.b[0].c' 这种路径 key, 手写一个最小实现。 */
function setDeep(obj, path, value) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (cur[parts[i]] == null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function makePage(path) {
  captured = null;
  delete req.cache[req.resolve(path)];
  req(path);
  if (!captured) throw new Error(`${path} 没有调用 Page()`);
  const page = Object.assign({}, captured);
  page.data = JSON.parse(JSON.stringify(captured.data || {}));
  page.setData = (patch, cb) => {
    Object.keys(patch).forEach((k) => setDeep(page.data, k, patch[k]));
    if (cb) cb();
  };
  return page;
}

const tap = (dataset) => ({ currentTarget: { dataset } });
const input = (value) => ({ detail: { value } });
/** 让页面里的 Promise 链跑完 (storage adapter 都是 resolve 过的 Promise) */
const flush = () => new Promise((r) => setTimeout(r, 0));

const failures = [];
async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failures.push(`${name}: ${e.message}`);
    console.log(`✗ ${name}\n    ${e.stack.split('\n').slice(0, 3).join('\n    ')}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ============================================================================
console.log('\n— 语文识字 —');
const zh = makePage('./packages/lang/pages/chinese/chinese.js');

await check('onLoad 建出字表与详情', () => {
  zh.onLoad();
  assert(zh.data.groups.length > 0, 'groups 为空');
  assert(zh.data.detail && zh.data.detail.char, 'detail 没建出来');
  assert(zh.data.groups[0].chars.length > 0, '第一组没有字');
});

await check('点字 → 切换详情 (拆解/偏旁提示)', () => {
  const withParts = zh.data.groups
    .map((g) => g.chars)
    .reduce((a, b) => a.concat(b), [])
    .filter((c) => {
      zh.selectChar(c, true);
      return zh.data.detail.parts.length > 0;
    });
  assert(withParts.length > 0, '没有任何字能拆出部件');
  zh.selectChar(withParts[0], true);
  assert(zh.data.detail.radHint, '有偏旁的字没给 radHint');
});

await check('偏旁浮层列出一家人', () => {
  zh.onOpenRad(tap({ rad: zh.data.detail.radHint.key }));
  assert(zh.data.radSheet.family.length >= 2, '一家人不足 2 个');
  zh.onPickFromRad(tap({ c: zh.data.radSheet.family[0].c }));
  assert(zh.data.radSheet === null, '选字后浮层没关');
});

await check('闯关 10 题全部可答, 结算正常', () => {
  zh.onStartQuiz();
  for (let i = 0; i < 10; i += 1) {
    assert(zh.data.q && zh.data.qOpts.length === 4, `第 ${i + 1} 题选项数不对`);
    assert(zh.data.qOpts.filter((o) => o.value === zh.data.q.correct).length === 1, '正确项不在选项里');
    zh.onAnswer(tap({ v: zh.data.q.correct }));
    assert(zh.data.qOpts.filter((o) => o.state === 'correct').length === 1, '没标出正确项');
    zh.onNextQuestion();
  }
  assert(zh.data.quizState === 'result', '10 题后没进结算');
  assert(zh.data.qResult.score === 10, `全对却只算了 ${zh.data.qResult.score} 分`);
});

await check('闯关答错也能走完', () => {
  zh.onStartQuiz();
  for (let i = 0; i < 10; i += 1) {
    const wrong = zh.data.qOpts.filter((o) => o.value !== zh.data.q.correct)[0];
    zh.onAnswer(tap({ v: wrong.value }));
    assert(zh.data.qOpts.filter((o) => o.state === 'wrong').length === 1, '没标出错误项');
    zh.onNextQuestion();
  }
  assert(zh.data.qResult.score === 0, '全错却有分');
});

await check('生字本: 加 → 拆解 → 过滤 → 删', () => {
  zh.onWordInput(input('迷路'));
  zh.onNoteInput(input('写成了迷落'));
  zh.onPickScene(tap({ s: '写作文' }));
  zh.onAddEntry();
  assert(zh.data.noteCount === 1, '没加进去');
  const item = zh.data.noteList[0];
  assert(item.word === '迷路', '词不对: ' + item.word);
  assert(item.cells.length === 2, '拆解格子数不对');
  assert(zh.data.groups[0].key === 'mine', '生字本没置顶到字表');

  zh.onWordInput(input('藏'));
  zh.onPickScene(tap({ s: '听写' }));
  zh.onAddEntry();
  assert(zh.data.noteCount === 2, '第二条没加进去');

  zh.onPickFilter(tap({ s: '听写' }));
  assert(zh.data.noteList.length === 1, '按场景过滤没生效');
  zh.onPickFilter(tap({ s: '全部' }));

  zh.onDelEntry(tap({ id: zh.data.noteList[0].id }));
  assert(zh.data.noteCount === 1, '删除没生效');
});

await check('复习: 翻面 → 记住/再练一次', () => {
  zh.onWordInput(input('森林'));
  zh.onAddEntry();
  zh.onStartReview();
  const total = zh.data.review.total;
  assert(total >= 2, '复习队列太短');
  zh.onFlipReview();
  assert(zh.data.review.flipped, '没翻面');
  assert(zh.data.review.cells.length > 0, '翻面后没有拆解');
  zh.onMarkReview(tap({ got: 'no' }));
  assert(zh.data.review.total === total + 1, '没记住的没排回队尾');
  let guard = 0;
  while (!zh.data.review.finished && guard < 50) {
    zh.onFlipReview();
    zh.onMarkReview(tap({ got: 'yes' }));
    guard += 1;
  }
  assert(zh.data.review.finished, '复习走不完');
  zh.onCloseReview();
  assert(zh.data.review === null, '关不掉复习浮层');
});

// ============================================================================
console.log('\n— 阅读识字 —');
const rd = makePage('./packages/lang/pages/reading/reading.js');

await check('onLoad 给出 6 个年级', () => {
  rd.onLoad();
  assert(rd.data.grades.length === 6, '年级数不对');
  assert(rd.data.grades[2].active, '默认不是三年级');
});

await check('粘课文 → 命中字标亮 + 生字表', () => {
  rd.onTextInput(input('春天来了，小鸟在树林里唱歌。'));
  assert(rd.data.canStart, '有字却不能开始');
  rd.onPickGrade(tap({ g: 1 }));
  rd.onStart();
  assert(rd.data.view === 'reading', '没进阅读态');
  assert(rd.data.chips.length > 0, '一个生字都没命中');
  const hits = rd.data.segments.filter((s) => s.hit);
  assert(hits.length > 0, '正文没有标亮片段');
  assert(rd.data.segments.map((s) => s.s).join('') === '春天来了，小鸟在树林里唱歌。', '切片拼不回原文');
});

await check('累计范围命中数 ≥ 本年级', () => {
  rd.onPickGrade(tap({ g: 3 }));
  rd.onPickScope(tap({ scope: 'current' }));
  const cur = rd.data.chips.length;
  rd.onPickScope(tap({ scope: 'cumulative' }));
  assert(rd.data.chips.length >= cur, `累计 ${rd.data.chips.length} < 本年级 ${cur}`);
});

await check('标记掌握 → 正文与生字表同步变绿', () => {
  const ch = rd.data.chips[0].char;
  rd.onOpenChar(tap({ c: ch }));
  assert(rd.data.detail.char === ch, '浮层字不对');
  rd.onToggleMastered();
  assert(rd.data.detail.mastered, '没标上');
  assert(rd.data.chips.filter((c) => c.char === ch)[0].mastered, '生字表没同步');
  assert(rd.data.segments.filter((s) => s.c === ch)[0].mastered, '正文没同步');
  assert(rd.data.statsText.indexOf('已掌握') > 0, '统计没写已掌握');
  rd.onToggleMastered();
  assert(!rd.data.detail.mastered, '取消掌握没生效');
  rd.onCloseDetail();
});

await check('换一篇退回录入态并保留原文', () => {
  rd.onBack();
  assert(rd.data.view === 'input', '没退回录入');
  assert(rd.data.text.indexOf('春天') === 0, '原文没带回来');
});

// ============================================================================
console.log('\n— 背单词 —');
const vc = makePage('./packages/lang/pages/vocab/vocab.js');

await check('onLoad 建出队列与卡片', () => {
  vc.onLoad({});
  assert(vc.data.stageState === 'card', 'stage 不是 card: ' + vc.data.stageState);
  assert(vc.data.card && vc.data.card.word, '卡片没建出来');
  assert(vc.data.total > 0, '队列为空');
  assert(vc.data.poolCount > 400, '词池太小: ' + vc.data.poolCount);
});

await check('没有 TTS 时听写模式不出现', () => {
  assert(vc.data.modeTabs.filter((m) => m.key === 'dictation').length === 0, '插件不可用却给了听写');
  assert(vc.data.modeTabs.length === 3, '模式数不对');
});

await check('拼写: 答对 → 前进; 答错 → 排回队列', () => {
  vc.onPickMode(tap({ key: 'spelling' }));
  assert(vc.data.card.showInput, '拼写模式没有输入框');
  const w1 = vc.data.card.word;
  vc.onAnswerInput(input(w1.toUpperCase()));
  vc.onSubmit();
  assert(vc.data.feedback.correct, '大小写不同却判错');
  vc.onContinue();
  assert(vc.data.card.word !== w1, '答对了还停在同一个词');

  const w2 = vc.data.card.word;
  vc.onAnswerInput(input('zzz-not-a-word'));
  vc.onSubmit();
  assert(!vc.data.feedback.correct, '乱写却判对');
  vc.onContinue();
  assert(vc.data.card.word !== w2, '答错后没换词');
  const upcoming = [];
  for (let i = 0; i < 4 && vc.data.stageState === 'card'; i += 1) {
    upcoming.push(vc.data.card.word);
    vc.onAnswerInput(input(vc.data.card.word));
    vc.onSubmit();
    vc.onContinue();
  }
  assert(upcoming.indexOf(w2) > 0, '答错的词没排回本轮: ' + upcoming.join(','));
});

await check('卡片模式: 连对 2 次算掌握', () => {
  vc.onPickMode(tap({ key: 'flashcard' }));
  vc.onPickFocus(tap({ key: 'all' }));
  const before = vc.data.masteredCount;
  const w = vc.data.card.word;
  vc.onKnown();
  // 再找回这个词连对第二次 (一轮背完要重开一轮)
  let guard = 0;
  while (guard < 1200) {
    if (vc.data.stageState === 'done') vc.onRestart();
    if (vc.data.card && vc.data.card.word === w) break;
    vc.onKnown();
    guard += 1;
  }
  assert(vc.data.card && vc.data.card.word === w, '找不回刚学的词');
  vc.onKnown();
  assert(vc.data.masteredCount > before, '连对两次没算掌握');
});

await check('收藏 → 切到收藏页仍能背', () => {
  vc.onPickFocus(tap({ key: 'all' }));
  vc.onToggleFavorite();
  assert(vc.data.card.favorite, '没收藏上');
  vc.onPickFocus(tap({ key: 'favorites' }));
  assert(vc.data.stageState === 'card', '收藏页空了');
  assert(vc.data.poolCount >= 1, '收藏池为空');
});

await check('空池给 empty 态而不是崩', () => {
  vc.onPickFocus(tap({ key: 'wrong' }));
  vc.onPickLevel(tap({ key: 'ket' }));
  vc.onPickTopic({ detail: { value: 3 } });
  assert(['card', 'empty'].indexOf(vc.data.stageState) >= 0, 'stage 非法: ' + vc.data.stageState);
});

// ============================================================================
console.log('\n— 考试日历 —');
const EXAM = req('./packages/exam/content/exam_calendar.js');
const cal = makePage('./packages/exam/pages/calendar/calendar.js');

await check('onLoad 建出月历与筛选', () => {
  cal.onLoad();
  assert(cal.data.cells.length % 7 === 0, '格子数不是 7 的倍数: ' + cal.data.cells.length);
  assert(/^\d{4}-\d{2}$/.test(cal.data.monthLabel), 'monthLabel 格式不对: ' + cal.data.monthLabel);
  assert(cal.data.filters.length === 5 && cal.data.filters[0].active, '筛选默认不是「全部」');
  assert(cal.data.cells.filter((c) => c.isToday).length === 1, '当月没有且仅有一个「今天」');
});

await check('翻月 → 回到今天', () => {
  const start = cal.data.monthLabel;
  cal.onNav(tap({ dir: 'next' }));
  assert(cal.data.monthLabel !== start, '翻月后月份没变');
  cal.onNav(tap({ dir: 'prev' }));
  assert(cal.data.monthLabel === start, '翻回来对不上');
  cal.onNav(tap({ dir: 'next' }));
  cal.onToday();
  assert(cal.data.monthLabel === start, '点月份没回到今天');
});

await check('学科筛选只留该学科', () => {
  cal.onPickFilter(tap({ key: 'english' }));
  assert(cal.data.monthList.every((s) => s.subject === 'english'), '筛完还有别的学科');
  assert(cal.data.emptyText.indexOf('英语') > 0, '空态文案没带学科');
  cal.onPickFilter(tap({ key: 'all' }));
});

await check('日历圆点指向真实场次', () => {
  // 找到一个有考试的月份, 断言圆点数与当月场次对得上
  let guard = 0;
  while (!cal.data.monthList.length && guard < 24) {
    cal.onNav(tap({ dir: 'next' }));
    guard += 1;
  }
  assert(cal.data.monthList.length, '未来两年一场考试都没有?');
  const dotted = cal.data.cells.filter((c) => !c.empty && c.dots.length);
  assert(dotted.length > 0, '有考试却没打点');
  assert(dotted.every((c) => c.sessionId), '打了点却没挂 sessionId');
  cal.onToday();
});

await check('详情浮层字段齐全 + 开始备考跳转', () => {
  // amc8 有 prepTopics, 用它验「开始备考」这条路径
  const s = EXAM.sessions.filter((x) => x.seriesId === 'amc8')[0];
  cal.openDetail(s.id, 'test');
  const d = cal.data.detail;
  assert(d && d.name === 'AMC 8', '详情没打开');
  assert(d.subjectCN === '数学' && d.gradeText && d.format, '详情字段缺失');
  assert(d.examTime && d.regWindow, '时间字段缺失');
  assert(d.hasPrep && d.prepHint, 'amc8 应该有备考建议');

  cal.onCopyUrl();
  assert(lastNav === 'clipboard:' + d.officialUrl, '复制的不是官网地址: ' + lastNav);

  cal.onStartPrep();
  assert(lastNav.indexOf('/packages/exam/pages/prep/prep?seriesId=amc8') === 0, '备考跳转不对: ' + lastNav);
  assert(cal.data.detail === null, '跳转后浮层没关');
});

await check('没有备考内容的考试不给入口', () => {
  const s = EXAM.sessions.filter((x) => x.seriesId === 'aime')[0];
  if (!s) return; // 数据里没有就跳过
  cal.openDetail(s.id, 'test');
  assert(cal.data.detail.hasPrep === false, 'aime 不该有备考入口');
  cal.onCloseDetail();
});

// ============================================================================
console.log('\n— 备考清单 —');

await check('AMC 8: 按年级分组 + 全部未开始', async () => {
  const pg = makePage('./packages/exam/pages/prep/prep.js');
  pg.onLoad({ seriesId: 'amc8' });
  await flush();
  assert(pg.data.name === 'AMC 8', '名称不对');
  assert(pg.data.total > 0, '一个知识点都没解析出来');
  assert(pg.data.groups.length > 1, '没有按年级分组');

  // 分组必须按年级升序 (Web 端 groupOrder 的语义), 不能是 prepTopics 的原始顺序
  const LABELS = { 3: '三年级', 4: '四年级', 5: '五年级', 6: '六年级', 7: '初一', 8: '初二', 9: '初三' };
  const expected = [...new Set(pg.items.filter((i) => i.kind === 'math').map((i) => i.grade))]
    .sort((a, b) => a - b)
    .map((g) => LABELS[g]);
  assert(
    pg.data.groups.map((g) => g.title).join(',') === expected.join(','),
    `分组顺序不对: ${pg.data.groups.map((g) => g.title)} ≠ ${expected}`,
  );
  assert(pg.data.masteredCount === 0 && pg.data.pct === 0, '新用户不该有掌握度');
  assert(pg.data.groups[0].rows[0].meta.indexOf('去练习') > 0, '可练的行没给引导文案');
});

await check('点知识点 → 练习去练习页, 口算未测手速先热身', async () => {
  const pg = makePage('./packages/exam/pages/prep/prep.js');
  pg.onLoad({ seriesId: 'amc8' });
  await flush();

  const practice = pg.items.filter((i) => i.kind === 'math' && i.topic.problemSetId)[0];
  assert(practice, 'amc8 没有练习型知识点');
  pg.onOpen(tap({ key: practice.key }));
  assert(
    lastNav === `/packages/math/pages/practice/practice?grade=${practice.grade}&setId=${practice.topic.problemSetId}`,
    '练习跳转不对: ' + lastNav,
  );

  const fluency = pg.items.filter(
    (i) => i.kind === 'math' && !i.topic.problemSetId && i.topic.fluencyTrackId,
  )[0];
  if (!fluency) return; // amc8 全是练习型时跳过
  pg.onOpen(tap({ key: fluency.key }));
  assert(lastNav.indexOf('/packages/math/pages/probe/probe') === 0, '没测手速却直接进口算: ' + lastNav);
});

await check('KET: 英语题集走主包 pack=english + 词汇入口', async () => {
  const pg = makePage('./packages/exam/pages/prep/prep.js');
  pg.onLoad({ seriesId: 'ket' });
  await flush();
  assert(pg.data.vocab && pg.data.vocab.level === 'ket', '没给词汇入口');
  pg.onVocab();
  assert(lastNav === '/packages/lang/pages/vocab/vocab?level=a2-key', '词汇跳转不对: ' + lastNav);

  const en = pg.data.groups.filter((g) => g.title === '英语阅读·语法')[0];
  assert(en && en.rows.length === 2, '英语题集没解析出来');
  pg.onOpen(tap({ key: en.rows[0].key }));
  assert(
    lastNav.indexOf('/packages/math/pages/practice/practice?pack=english&setId=ket_') === 0,
    '英语练习跳转不对: ' + lastNav,
  );
});

await check('只有词汇没有知识点的考试不显示空清单', async () => {
  const pg = makePage('./packages/exam/pages/prep/prep.js');
  pg.onLoad({ seriesId: 'yle' });
  await flush();
  assert(pg.data.total === 0, 'yle 不该有知识点');
  assert(pg.data.empty === true || pg.data.vocab, '既没内容也没提示');
});

await check('未知考试给 notFound 而不是崩', () => {
  const pg = makePage('./packages/exam/pages/prep/prep.js');
  pg.onLoad({ seriesId: 'not-a-real-exam' });
  assert(pg.data.notFound, '没给 notFound');
});

// ============================================================================
console.log('\n— 家长 · 错题本 —');

// 家长页读的是 storage 里的错题本, 先铺一份可预期的数据 (studentId 默认 'local')
const mk = (id, topic, over) =>
  Object.assign(
    {
      id,
      studentId: 'local',
      topicTitle: topic,
      prompt: `题目 ${id}`,
      yourAnswer: '9',
      correctAnswer: '8',
      elapsedMs: 3000 + id * 500,
      slow: false,
      difficulty: 'basic',
      corrected: false,
    },
    over,
  );
store.set('rm.student.local', { id: 'local', xp: 350 });
store.set('rm.mistakes.local', [
  mk(1, '两位数加法'),
  mk(2, '两位数加法', { difficulty: 'consolidate' }),
  mk(3, '两位数加法', { slow: true, difficulty: 'challenge' }),
  mk(4, '乘法口诀'),
  mk(5, '乘法口诀', { slow: true }),
  mk(6, '乘法口诀', { corrected: true }), // 已订正的不该出现
]);
store.set('rm.mistakeSeq.local', 6);
store.delete('rm.parentPin');

const pa = makePage('./packages/parent/pages/dashboard/dashboard.js');

await check('首次进入是「设置密码」, 位数/一致性都要校验', () => {
  pa.onLoad();
  assert(pa.data.mode === 'set', '没 PIN 却不是设置模式');
  pa.onPinInput(input('12a'));
  assert(pa.data.pinVal === '12', '非数字没过滤掉: ' + pa.data.pinVal);
  pa.onSubmitPin();
  assert(pa.data.gateError === '请输入 4 位数字', '位数错误没提示: ' + pa.data.gateError);
  pa.onPinInput(input('1234'));
  pa.onConfirmInput(input('4321'));
  pa.onSubmitPin();
  assert(pa.data.gateError === '两次输入不一致', '不一致没提示: ' + pa.data.gateError);
  assert(!pa.data.unlocked, '校验没过却解锁了');
});

await check('设置成功 → 解锁并按题数降序分组 (已订正的不计)', async () => {
  pa.onConfirmInput(input('1234'));
  pa.onSubmitPin();
  await flush();
  assert(pa.data.unlocked, '没解锁');
  assert(pa.data.activeCount === 5, `待关注数不对: ${pa.data.activeCount}`);
  assert(pa.data.wrongTotal === 3 && pa.data.slowTotal === 2, '错/慢拆分不对');
  assert(pa.data.level.level === 3, 'Lv 算错: ' + pa.data.level.level); // 350 xp → Lv.3
  const titles = pa.data.groups.map((g) => g.topic);
  assert(titles.join(',') === '乘法口诀,两位数加法' || titles.join(',') === '两位数加法,乘法口诀', '分组不对: ' + titles);
  assert(pa.data.groups[0].count >= pa.data.groups[1].count, '没按题数降序');
  const all = pa.data.groups.reduce((a, g) => a.concat(g.items), []);
  assert(all.length === 5, '已订正的漏进来了');
  assert(all.filter((m) => m.slow)[0].badge === '⏱ 偏慢', '偏慢徽章不对');
  assert(all.filter((m) => !m.slow)[0].badge === '答错', '答错徽章不对');
  assert(all.filter((m) => m.diffLabel === '拔高').length === 1, '难度标签没映射');
  assert(all[0].timeText.indexOf('秒') > 0, '耗时没格式化: ' + all[0].timeText);
});

await check('一键总结: 后端不可用退回本地分析', async () => {
  pa.onSummarize();
  await flush();
  assert(pa.data.loading === false, 'loading 没收尾');
  assert(pa.data.summarySource === '本地', '断网却不是本地分析: ' + pa.data.summarySource);
  assert(pa.data.summaryText.indexOf('共有 5 道') === 0, '总结正文不对: ' + pa.data.summaryText.slice(0, 20));
  assert(pa.data.summaryText.indexOf('乘法口诀') > 0, '没点名知识点');
});

await check('标为已订正 → 待关注减少', async () => {
  const target = pa.data.groups[0].items[0];
  pa.onCorrect(tap({ id: target.id }));
  await flush();
  assert(pa.data.activeCount === 4, '订正后没减: ' + pa.data.activeCount);
  const all = pa.data.groups.reduce((a, g) => a.concat(g.items), []);
  assert(all.filter((m) => m.id === target.id).length === 0, '订正过的还在列表里');
});

await check('清空错题本 → 空态, 总结也跟着清掉', async () => {
  pa.onClearMistakes(); // showModal stub 直接确认
  await flush();
  assert(pa.data.activeCount === 0 && pa.data.groups.length === 0, '没清空');
  assert(pa.data.summaryText === '', '旧总结没清掉');
});

await check('重置进度: 经验归零, 错题本不受影响', async () => {
  store.set('rm.mistakes.local', [mk(7, '分数比较')]);
  store.set('rm.student.local', { id: 'local', xp: 350 });
  await pa.reload();
  assert(pa.data.xp === 350, '前置数据没铺上');
  pa.onResetProgress();
  await flush();
  assert(pa.data.xp === 0 && pa.data.level.level === 1, '经验没清零');
  assert(pa.data.activeCount === 1, '错题本被误删了');
});

await check('再次进入是「验证」, 密码错了不解锁', () => {
  const pg = makePage('./packages/parent/pages/dashboard/dashboard.js');
  pg.onLoad();
  assert(pg.data.mode === 'enter', '已设 PIN 却还是设置模式');
  pg.onPinInput(input('0000'));
  pg.onSubmitPin();
  assert(!pg.data.unlocked && pg.data.gateError === '密码错误', '错密码却放行了');
  assert(pg.data.pinVal === '', '错了没清空输入');
  pg.onPinInput(input('1234'));
  pg.onSubmitPin();
  assert(pg.data.unlocked, '对的密码进不去');
});

// ============================================================================
console.log('');
if (failures.length) {
  console.log(`${failures.length} 个用例失败`);
  process.exit(1);
}
console.log('全部通过');
