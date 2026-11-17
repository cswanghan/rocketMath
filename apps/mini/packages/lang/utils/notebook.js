// 生字本存储 + 云同步。移植自 public/chinese-characters.html 里的 Store / cloudGet /
// cloudPut / mergeNotes。
//
// 后端 functions/api/shengzi/notebook.ts 是「整本 JSON 覆盖」语义 (不是逐条),
// 按 user + child 隔离。所以这里的合并只能在客户端做: 按 word 去重, ts 大的胜出。
// 与 Web 端同一张表, 网页加的字在小程序里能看到。

const api = require('../../../utils/api.js');
const family = require('../../../utils/family.js');

const PUT_DEBOUNCE_MS = 600;
// 后端上限 2000 条, 本地不设更严的限制 —— 生字本是家长手动加的, 到不了这个量级

const keyFor = (studentId) => `rm.shengziben.${studentId}`;
const tsKeyFor = (studentId) => `rm.shengziben_ts.${studentId}`;

/** 后端的 child 维度。家长本人 (没选孩子) 用 '0', 与 Web 端 nbChildKey 一致。 */
function childKey() {
  const c = family.getActiveChild();
  return c && c.id ? String(c.id) : '0';
}

function load(studentId) {
  try {
    return wx.getStorageSync(keyFor(studentId)) || [];
  } catch (e) {
    return [];
  }
}

function save(studentId, arr, ts) {
  try {
    wx.setStorageSync(keyFor(studentId), arr);
    wx.setStorageSync(tsKeyFor(studentId), ts || Date.now());
  } catch (e) {
    console.warn('[生字本] 本地写入失败', e && e.errMsg);
  }
}

/** 按 word 去重, ts 新的赢; 结果按 ts 倒序 (最近加的排前面)。 */
function mergeNotes(a, b) {
  const byWord = {};
  (a || []).concat(b || []).forEach((e) => {
    if (!e || !e.word) return;
    const prev = byWord[e.word];
    if (!prev || (e.ts || 0) > (prev.ts || 0)) byWord[e.word] = e;
  });
  return Object.keys(byWord)
    .map((w) => byWord[w])
    .sort((x, y) => (y.ts || 0) - (x.ts || 0));
}

/**
 * 拉云端并与本地合并。未登录 / 失败时原样返回本地。
 * 合并后条数有变化说明本地有云端没有的字 → 整本回推。
 */
function pull(studentId, localList) {
  if (!api.getToken()) return Promise.resolve({ list: localList, synced: false });
  return api
    .request({ path: '/api/shengzi/notebook?child=' + encodeURIComponent(childKey()) })
    .then((cloud) => {
      const cloudList = (cloud && cloud.data) || [];
      const merged = mergeNotes(localList, cloudList);
      const ts = Date.now();
      save(studentId, merged, ts);
      if (merged.length !== cloudList.length) push(merged, ts);
      return { list: merged, synced: true };
    })
    .catch((e) => {
      console.warn('[生字本] 云端拉取失败, 用本地继续', e && e.message);
      return { list: localList, synced: false };
    });
}

let putTimer = null;
let putPayload = null;

/** 整本覆盖上传。防抖 —— 连续加几个字只推最后一次。 */
function push(list, ts) {
  if (!api.getToken()) return;
  putPayload = { data: list, updatedAt: ts || Date.now(), child: childKey() };
  if (putTimer) clearTimeout(putTimer);
  putTimer = setTimeout(flush, PUT_DEBOUNCE_MS);
}

function flush() {
  if (putTimer) {
    clearTimeout(putTimer);
    putTimer = null;
  }
  if (!putPayload) return;
  const data = putPayload;
  putPayload = null;
  api
    .request({ path: '/api/shengzi/notebook', method: 'POST', data: data })
    .catch((e) => console.warn('[生字本] 上传失败', e && e.message));
}

module.exports = { childKey, load, save, mergeNotes, pull, push, flush };
