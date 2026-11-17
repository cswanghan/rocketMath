// 埋点。对接 Web 端同一个 /api/track (events 表), 所以小程序和网页的数据能一起看。
//
// 两条铁律 (与 Web 端 /track.js 一致):
//   1. 埋点永远不能阻塞或搞崩学习流程 —— 全链路 try/catch + 失败静默。
//   2. 攒批上报, 不是一事件一请求 —— 答题页每秒可能产生多条。
//
// 未登录也上报, 用 anonId 归因; 登录后 Authorization 头会自动带上 userId。

const api = require('./api.js');
const family = require('./family.js');

const ANON_KEY = 'rm.anonId';
const FLUSH_SIZE = 20;
const FLUSH_MS = 10000;

let queue = [];
let timer = null;

function anonId() {
  try {
    let id = wx.getStorageSync(ANON_KEY);
    if (!id) {
      id = 'mp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      wx.setStorageSync(ANON_KEY, id);
    }
    return id;
  } catch (e) {
    return 'mp-anon';
  }
}

function currentPath() {
  try {
    const pages = getCurrentPages();
    const top = pages[pages.length - 1];
    return top ? '/' + top.route : '';
  } catch (e) {
    return '';
  }
}

function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return;
  const events = queue;
  queue = [];
  const child = family.getActiveChild();
  api
    .request({
      path: '/api/track',
      method: 'POST',
      data: { events: events, anonId: anonId(), childId: child ? child.id : null },
      timeout: 8000,
    })
    .catch(() => {
      /* 埋点失败就丢掉, 不重试不报错 —— 断网时孩子照样做题 */
    });
}

function track(event, props) {
  try {
    queue.push({ event: event, props: props || {}, path: currentPath() });
    if (queue.length >= FLUSH_SIZE) {
      flush();
      return;
    }
    if (!timer) timer = setTimeout(flush, FLUSH_MS);
  } catch (e) {
    /* 埋点绝不抛错 */
  }
}

module.exports = { track, flush, anonId };
