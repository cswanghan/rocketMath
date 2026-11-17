// 小程序页面静态预览。把 WXML/WXSS 转成 HTML/CSS, 用页面 JS 真实算出来的 data
// 渲染一遍, 输出到 preview-out/ 供浏览器打开截图。
//
// 为什么要有: 没装微信开发者工具时, 布局/样式完全没法验证 —— mini:test 只看
// data, 看不见"这行字被卡片挤出去了"。这里把每页真实的视图模型喂进真实的样式,
// 排版问题一眼可见。
//
// ⚠️ 它不是微信渲染引擎, 只是够用的近似:
//   · rpx 按 375px 视口折算 (1rpx = 0.5px), 与真机 iPhone 一致
//   · view→div / text→span / button→button, 补了微信组件的默认样式
//   · 交互全部失效 —— 要看某个交互态, 在 SCENES 里用 actions 把页面驱动过去
//   真机上的滚动惯性、键盘顶起、安全区仍需开发者工具或真机确认。
//
// 用法: npm run mini:preview  → preview-out/index.html

import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MINI = resolve(ROOT, 'apps/mini');
const OUT = resolve(ROOT, 'preview-out');
const req = createRequire(resolve(MINI, 'noop.cjs'));

// ============================================================================
// 假 wx 运行时 (与 test-mini-pages.mjs 同一套思路, 这里只需要读到 data)
// ============================================================================

const store = new Map();
let captured = null;

globalThis.Page = (opts) => {
  captured = opts;
};
globalThis.getApp = () => ({ globalData: {} });
globalThis.requirePlugin = () => {
  throw new Error('plugin not available in preview');
};
globalThis.wx = {
  getStorageSync: (k) => (store.has(k) ? store.get(k) : ''),
  setStorageSync: (k, v) => store.set(k, v),
  removeStorageSync: (k) => store.delete(k),
  getStorageInfoSync: () => ({ keys: [...store.keys()], currentSize: 0, limitSize: 10240 }),
  getSystemInfoSync: () => ({ windowWidth: 375, SDKVersion: '3.0.0' }),
  showToast: () => {},
  showModal: (o) => o.success && o.success({ confirm: true }),
  showLoading: () => {},
  hideLoading: () => {},
  setNavigationBarTitle: () => {},
  setClipboardData: (o) => o.success && o.success(),
  navigateTo: () => {},
  redirectTo: () => {},
  navigateBack: () => {},
  switchTab: () => {},
  login: (o) => o.fail && o.fail({ errMsg: 'offline' }),
  request: (o) => o.fail && o.fail({ errMsg: 'offline' }),
  createInnerAudioContext: () => ({ play() {}, stop() {}, destroy() {} }),
  getUpdateManager: () => ({ onCheckForUpdate() {}, onUpdateReady() {}, onUpdateFailed() {} }),
};

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

const flush = () => new Promise((r) => setTimeout(r, 0));

// ============================================================================
// WXML → HTML
// ============================================================================

// 自闭合的组件 (小程序里 input 也可以写成 <input ... />)
const VOID_TAGS = new Set(['input', 'image']);
const TAG_MAP = {
  view: 'div',
  text: 'span',
  block: null, // 透明容器
  button: 'button',
  input: 'input',
  textarea: 'textarea',
  image: 'img',
  'scroll-view': 'div',
  picker: 'div',
};

/** 把 WXML 切成节点树。只支持我们实际用到的子集。 */
function parseWxml(src) {
  const root = { tag: null, attrs: {}, children: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\/([a-z-]+)\s*>|<([a-z-]+)((?:\s+[^>]*?)?)(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(src))) {
    const [all, close, open, attrStr, selfClose, textRaw] = m;
    if (all.startsWith('<!--')) continue;
    if (close) {
      if (stack.length > 1) stack.pop();
    } else if (open) {
      const node = { tag: open, attrs: parseAttrs(attrStr || ''), children: [] };
      stack[stack.length - 1].children.push(node);
      if (!selfClose && !VOID_TAGS.has(open)) stack.push(node);
    } else if (textRaw != null) {
      const t = textRaw.replace(/\s+/g, ' ');
      if (t.trim()) stack[stack.length - 1].children.push({ text: t });
    }
  }
  return root;
}

function parseAttrs(str) {
  const attrs = {};
  const re = /([a-zA-Z:_-][\w:.-]*)(?:\s*=\s*"([^"]*)")?/g;
  let m;
  while ((m = re.exec(str))) {
    if (!m[1]) continue;
    attrs[m[1]] = m[2] === undefined ? '' : m[2];
  }
  return attrs;
}

const exprCache = new Map();
function evalExpr(expr, scope) {
  let fn = exprCache.get(expr);
  if (!fn) {
    // with(scope) 让 {{r.ready ? … }} 这类表达式直接按数据取值, 与 WXML 语义一致
    try {
      fn = new Function('scope', `with (scope) { return (${expr}); }`);
    } catch (e) {
      throw new Error(`WXML 表达式无法解析: {{${expr}}}`);
    }
    exprCache.set(expr, fn);
  }
  try {
    return fn(scope);
  } catch (e) {
    return '';
  }
}

/** 求值一段可能含 {{}} 的字符串。整串就是一个表达式时保留原始类型。 */
function interpolate(str, scope) {
  if (str.indexOf('{{') < 0) return str;
  // 整串只有一个 {{}} 时保留原始类型 (数组要能被 wx:for 遍历); `}}` 出现在中间
  // 说明是「{{a}} / {{b}}」这种拼接, 只能走字符串替换
  const whole = str.match(/^\{\{([\s\S]*)\}\}$/);
  if (whole && whole[1].indexOf('}}') < 0) return evalExpr(whole[1], scope);
  return str.replace(/\{\{([\s\S]*?)\}\}/g, (_, e) => {
    const v = evalExpr(e, scope);
    return v == null ? '' : String(v);
  });
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderNodes(nodes, scope) {
  let html = '';
  let lastIfTaken = null; // 支撑 wx:elif / wx:else
  for (const node of nodes) {
    if (node.text != null) {
      html += esc(interpolate(node.text, scope));
      continue;
    }
    const a = node.attrs;
    if ('wx:if' in a) {
      lastIfTaken = !!interpolate(a['wx:if'], scope);
      if (!lastIfTaken) continue;
    } else if ('wx:elif' in a) {
      if (lastIfTaken) continue;
      lastIfTaken = !!interpolate(a['wx:elif'], scope);
      if (!lastIfTaken) continue;
    } else if ('wx:else' in a) {
      if (lastIfTaken) continue;
      lastIfTaken = true;
    } else {
      lastIfTaken = null;
    }

    if ('wx:for' in a) {
      const list = interpolate(a['wx:for'], scope) || [];
      const itemName = a['wx:for-item'] || 'item';
      const idxName = a['wx:for-index'] || 'index';
      for (let i = 0; i < list.length; i += 1) {
        const inner = Object.create(scope);
        inner[itemName] = list[i];
        inner[idxName] = i;
        html += renderOne(node, inner);
      }
      continue;
    }
    html += renderOne(node, scope);
  }
  return html;
}

function renderOne(node, scope) {
  const a = node.attrs;
  const tag = TAG_MAP[node.tag];
  const inner = renderNodes(node.children, scope);
  if (tag === null) return inner; // <block>

  const htmlTag = tag || 'div';
  const parts = [`data-wx="${node.tag}"`];
  if (a.class) parts.push(`class="${esc(interpolate(a.class, scope))}"`);
  if (a.style) parts.push(`style="${esc(interpolate(a.style, scope))}"`);
  if (a.disabled && interpolate(a.disabled, scope)) parts.push('disabled');

  if (node.tag === 'input' || node.tag === 'textarea') {
    const val = a.value ? interpolate(a.value, scope) : '';
    if (a.placeholder) parts.push(`placeholder="${esc(interpolate(a.placeholder, scope))}"`);
    if (node.tag === 'input') {
      parts.push(`value="${esc(val == null ? '' : val)}"`);
      return `<input ${parts.join(' ')}>`;
    }
    return `<textarea ${parts.join(' ')}>${esc(val == null ? '' : val)}</textarea>`;
  }

  return `<${htmlTag} ${parts.join(' ')}>${inner}</${htmlTag}>`;
}

// ============================================================================
// WXSS → CSS
// ============================================================================

function convertWxss(src) {
  return (
    src
      // 750rpx = 375px 视口 —— 与 iPhone 逻辑分辨率一致
      .replace(/(-?\d*\.?\d+)rpx/g, (_, n) => `${Number(n) / 2}px`)
      // page 是小程序的根节点, CSS 变量都定义在这里
      .replace(/^page\s*\{/m, ':root, body {')
      .replace(/@import\s+["'][^"']*["'];/g, '')
  );
}

/** 微信基础组件自带的默认样式 —— 不补上, 按钮/文本会跑成浏览器默认样子。 */
const COMPONENT_RESET = `
* { box-sizing: border-box; }
html { background: #e9e6df; }
/* 375px = iPhone 逻辑宽度。窗口再宽也按手机排版, 两侧留灰底当"机身" */
body { width: 375px; margin: 0 auto; background: var(--bg, #fcfbf9); box-shadow: 0 0 0 1px #d8d4cb; }
/* :where() 让这些默认值特异性为 0 —— 页面自己的 .foo{display:flex} 必须能盖过它,
   否则所有 flex 布局都会被打回 block (这是这个预览器最容易踩的坑) */
:where(div[data-wx="view"], div[data-wx="scroll-view"], div[data-wx="picker"]) { display: block; }
:where(span[data-wx="text"]) { display: inline; }
:where(button) {
  position: relative; display: block; margin-left: auto; margin-right: auto;
  padding-left: 14px; padding-right: 14px; box-sizing: border-box;
  font-size: 18px; text-align: center; text-decoration: none;
  line-height: 2.55555556; border-radius: 5px; overflow: hidden;
  color: #000; background-color: #f8f8f8; font-family: inherit;
  border: none; cursor: pointer;
}
:where(button[disabled]) { color: rgba(0,0,0,.3); background-color: #f7f7f7; }
:where(input, textarea) {
  display: block; width: 100%; font-family: inherit; font-size: inherit;
  color: inherit; background: transparent; border: none; outline: none;
}
:where(textarea) { resize: none; }
:where(img) { max-width: 100%; }
`;


// ============================================================================
// 场景: 每页要截哪些状态
// ============================================================================

const SCENES = [
  { name: 'portal', title: '首页 · 学习', page: 'pages/portal/portal' },
  { name: 'grade', title: '选年级', page: 'pages/grade/grade' },
  { name: 'mine', title: '我的', page: 'pages/mine/mine' },
  {
    name: 'mine-family',
    title: '我的 · 已登录',
    page: 'pages/mine/mine',
    seed: seedFamily,
    actions: (p) => p.setData({ children: SEED_CHILDREN, activeChild: SEED_CHILDREN[0] }),
  },
  {
    name: 'mine-add-child',
    title: '我的 · 添加孩子',
    page: 'pages/mine/mine',
    seed: seedFamily,
    actions: (p) => {
      p.setData({ children: SEED_CHILDREN, activeChild: SEED_CHILDREN[0] });
      p.onToggleAdd();
    },
  },
  { name: 'math-map', title: '知识地图', page: 'packages/math/pages/map/map', query: { grade: 3 } },
  { name: 'math-probe', title: '测手速', page: 'packages/math/pages/probe/probe', query: { grade: 3 } },
  {
    name: 'math-play',
    title: '口算闯关',
    page: 'packages/math/pages/play/play',
    query: () => ({ grade: 3, trackId: firstTrackId(3) }),
  },
  {
    name: 'math-practice',
    title: '知识点练习',
    page: 'packages/math/pages/practice/practice',
    query: () => ({ grade: 5, setId: 'prime_composite' }),
  },
  {
    name: 'math-practice-english',
    title: '英语练习 (复用练习页)',
    page: 'packages/math/pages/practice/practice',
    query: { pack: 'english', setId: 'ket_grammar' },
  },
  {
    name: 'math-race',
    title: '竞速',
    page: 'packages/math/pages/race/race',
    query: () => ({ grade: 3, trackId: firstTrackId(3) }),
  },
  { name: 'lang-vocab', title: '背单词', page: 'packages/lang/pages/vocab/vocab' },
  {
    name: 'lang-vocab-spelling',
    title: '背单词 · 拼写',
    page: 'packages/lang/pages/vocab/vocab',
    actions: (p) => p.onPickMode({ currentTarget: { dataset: { key: 'spelling' } } }),
  },
  { name: 'lang-chinese', title: '语文识字', page: 'packages/lang/pages/chinese/chinese' },
  {
    name: 'lang-chinese-quiz',
    title: '语文识字 · 闯关',
    page: 'packages/lang/pages/chinese/chinese',
    // onStartQuiz 只管出题, 切 tab 是另一个 handler —— 两个都要调
    actions: (p) => {
      p.onSwitchTab(tap({ tab: 'quiz' }));
      p.onStartQuiz();
    },
  },
  {
    name: 'lang-chinese-notebook',
    title: '语文识字 · 生字本',
    page: 'packages/lang/pages/chinese/chinese',
    actions: (p) => p.onSwitchTab(tap({ tab: 'notebook' })),
  },
  { name: 'lang-reading', title: '阅读识字 · 录入', page: 'packages/lang/pages/reading/reading' },
  {
    name: 'lang-reading-marked',
    title: '阅读识字 · 标注',
    page: 'packages/lang/pages/reading/reading',
    actions: (p) => {
      p.onTextInput({ detail: { value: '春天来了，小鸟在树林里唱歌。田野上开满了金黄的油菜花。' } });
      p.onStart();
    },
  },
  { name: 'exam-calendar', title: '考试日历', page: 'packages/exam/pages/calendar/calendar' },
  {
    name: 'exam-calendar-detail',
    title: '考试日历 · 详情',
    page: 'packages/exam/pages/calendar/calendar',
    actions: (p) => {
      const EXAM = req('./packages/exam/content/exam_calendar.js');
      const s = EXAM.sessions.filter((x) => x.seriesId === 'amc8')[0];
      p.openDetail(s.id, 'preview');
    },
  },
  {
    name: 'exam-prep',
    title: '备考清单 · AMC 8',
    page: 'packages/exam/pages/prep/prep',
    query: { seriesId: 'amc8' },
  },
  {
    name: 'exam-prep-ket',
    title: '备考清单 · KET',
    page: 'packages/exam/pages/prep/prep',
    query: { seriesId: 'ket' },
  },
  { name: 'parent-gate', title: '家长区 · PIN 门', page: 'packages/parent/pages/dashboard/dashboard' },
  {
    name: 'parent-dashboard',
    title: '家长区 · 错题本',
    page: 'packages/parent/pages/dashboard/dashboard',
    seed: seedMistakes,
    actions: async (p) => {
      p.onPinInput({ detail: { value: '1234' } });
      p.onConfirmInput({ detail: { value: '1234' } });
      p.onSubmitPin();
      await flush();
      p.onSummarize();
      await flush();
    },
  },
];

function firstTrackId(grade) {
  const pack = req('./content/index.js').fluencyPack(grade);
  return pack.tracks[0].trackId;
}

/** 造一个 bindtap 事件对象 —— 页面 handler 都从 currentTarget.dataset 取参数。 */
function tap(dataset) {
  return { currentTarget: { dataset }, detail: {} };
}

const SEED_CHILDREN = [
  { id: 11, name: '小星', avatar: '🐯' },
  { id: 12, name: '小芽', avatar: '🐰' },
];

/** 登录态。wx.request 在预览里恒失败, 所以 children 由 actions 直接 setData 塞。 */
function seedFamily() {
  store.set('rm.token', 'preview-token');
  store.set('rm.user', { id: 1, username: 'wx_preview', role: 'user' });
  store.set('rm.child', SEED_CHILDREN[0]);
  store.set('rm.student.11', { id: '11', xp: 640 });
}

function seedMistakes() {
  const mk = (id, topic, over) =>
    Object.assign(
      {
        id,
        studentId: 'local',
        topicTitle: topic,
        prompt: `题目 ${id}`,
        yourAnswer: '9',
        correctAnswer: '8',
        elapsedMs: 3000 + id * 700,
        slow: false,
        difficulty: 'basic',
        corrected: false,
      },
      over,
    );
  store.set('rm.student.local', { id: 'local', xp: 350 });
  store.set('rm.mistakes.local', [
    mk(1, '两位数加法', { prompt: '47 + 38 = ?', yourAnswer: '75', correctAnswer: '85' }),
    mk(2, '两位数加法', { prompt: '56 + 29 = ?', yourAnswer: '75', correctAnswer: '85', difficulty: 'consolidate' }),
    mk(3, '两位数加法', { prompt: '68 + 27 = ?', correctAnswer: '95', slow: true, difficulty: 'challenge' }),
    mk(4, '乘法口诀', { prompt: '7 × 8 = ?', yourAnswer: '54', correctAnswer: '56' }),
    mk(5, '乘法口诀', { prompt: '9 × 6 = ?', correctAnswer: '54', slow: true }),
  ]);
  store.set('rm.mistakeSeq.local', 5);
}

// ============================================================================
// 生成
// ============================================================================

const APP_WXSS = convertWxss(readFileSync(join(MINI, 'app.wxss'), 'utf8'));

const APP_JSON = JSON.parse(readFileSync(join(MINI, 'app.json'), 'utf8'));
const TAB_PAGES = new Set((APP_JSON.tabBar?.list || []).map((t) => t.pagePath));

/** tabBar 是 app.json 声明的, 不在任何 WXML 里 —— 但"内容被 tabBar 盖住"是真实
 *  的排版 bug, 所以 tab 页要把它画出来。 */
function tabBarHtml(pagePath) {
  const bar = APP_JSON.tabBar;
  if (!bar || !TAB_PAGES.has(pagePath)) return '';
  const items = bar.list
    .map((t) => {
      const on = t.pagePath === pagePath;
      return `<div class="pv-tab" style="color:${on ? bar.selectedColor : bar.color}">${esc(t.text)}</div>`;
    })
    .join('');
  return `<div class="pv-tabbar" style="background:${bar.backgroundColor}">${items}</div>`;
}

const TABBAR_CSS = `
.pv-tabbar {
  position: fixed; left: 50%; transform: translateX(-50%); bottom: 0;
  width: 375px; height: 50px; display: flex; align-items: center;
  border-top: 1px solid #ededed; font-size: 10px; z-index: 500;
}
.pv-tab { flex: 1; text-align: center; }
`;

async function build(scene) {
  store.clear();
  if (scene.seed) scene.seed();

  const pagePath = join(MINI, scene.page);
  const page = makePage('./' + scene.page + '.js');
  const query = typeof scene.query === 'function' ? scene.query() : scene.query || {};
  if (page.onLoad) page.onLoad(query);
  await flush();
  if (page.onShow) page.onShow();
  await flush();
  if (scene.actions) {
    await scene.actions(page);
    await flush();
  }

  const wxml = readFileSync(pagePath + '.wxml', 'utf8');
  const pageCss = convertWxss(readFileSync(pagePath + '.wxss', 'utf8'));
  // 分包自己的 styles/*.wxss 由页面 @import 进来, 这里一并合上
  const imported = [...readFileSync(pagePath + '.wxss', 'utf8').matchAll(/@import\s+["']([^"']+)["']/g)]
    .map((m) => resolve(dirname(pagePath), m[1]))
    .filter((f) => existsSync(f))
    .map((f) => convertWxss(readFileSync(f, 'utf8')))
    .join('\n');

  const body = renderNodes(parseWxml(wxml).children, page.data);

  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=375, initial-scale=1">
<title>${esc(scene.title)}</title>
<style>${COMPONENT_RESET}</style>
<style>${APP_WXSS}</style>
<style>${imported}</style>
<style>${pageCss}</style>
<style>${TABBAR_CSS}</style>
</head><body>${body}${tabBarHtml(scene.page)}</body></html>`;

  writeFileSync(join(OUT, scene.name + '.html'), html);
  return { name: scene.name, title: scene.title, page: scene.page, bytes: html.length };
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const built = [];
for (const scene of SCENES) {
  try {
    built.push(await build(scene));
    console.log(`✓ ${scene.name.padEnd(24)} ${scene.title}`);
  } catch (e) {
    console.log(`✗ ${scene.name.padEnd(24)} ${e.stack.split('\n').slice(0, 4).join('\n    ')}`);
    process.exitCode = 1;
  }
}

writeFileSync(
  join(OUT, 'index.html'),
  `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>星芽小程序页面预览</title>
<style>
 body{font:15px/1.6 system-ui,-apple-system,'PingFang SC',sans-serif;background:#f4f1ea;margin:0;padding:24px}
 h1{font-size:20px;margin:0 0 4px}
 p{color:#777;margin:0 0 20px}
 .grid{display:flex;flex-wrap:wrap;gap:20px}
 .cell{background:#fff;border-radius:12px;padding:12px;box-shadow:0 2px 10px rgba(0,0,0,.07)}
 .cell b{display:block;font-size:13px;margin-bottom:8px}
 iframe{width:375px;height:720px;border:1px solid #e5e2da;border-radius:8px;background:#fcfbf9}
</style></head><body>
<h1>星芽小程序页面预览</h1>
<p>WXML/WXSS 静态渲染 · 375px 视口 · 共 ${built.length} 屏。交互失效，仅供排版核对。</p>
<div class="grid">${built
    .map((b) => `<div class="cell"><b>${esc(b.title)}</b><iframe src="${b.name}.html"></iframe></div>`)
    .join('')}</div>
</body></html>`,
);

console.log(`\n${built.length} 屏 → ${OUT}/index.html`);
try {
  execSync(`open "${join(OUT, 'index.html')}"`, { stdio: 'ignore' });
} catch {
  /* 无 GUI 时忽略 */
}
