// 背单词进度: 本地存储 + 云同步。移植自 public/vocab-app.js 的 stats / sync 部分。
//
// 与 Web 端共用同一张 D1 表 (vocab_progress, 见 functions/api/vocab/progress.ts),
// 所以同一个账号在网页背过的词, 小程序里进度是接上的。
//
// 合并策略沿用 Web 端: 按 updatedAt 后写胜出, 但 seen / wrong 取两边最大值 ——
// 计数类字段谁也不该把对方的努力抹掉。
//
// 本地 key 用 rm.* 前缀 (Web 端是 ket-vocab-progress-v3), 两端 key 不同没关系:
// 对账发生在服务端, 本地只是缓存。

const api = require('../../../utils/api.js');

const STORAGE_KEY = 'rm.vocab.progress';
const PREFS_KEY = 'rm.vocab.prefs';
const SYNC_DEBOUNCE_MS = 1200;
// wx.storage 单 key 上限 1MB。516 词 × ~120 字节 ≈ 62KB, 远没到顶,
// 但仍留个保险: 只存"动过的"词条, 没背过的不落盘。

function safeInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
  if (typeof value === 'string' && value.trim()) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return new Date(0).toISOString();
}

/** 词条统一形状。fallback 用来补 word/topic (从词库条目取)。 */
function normalizeEntry(raw, fallback) {
  const f = fallback || {};
  const r = raw || {};
  return {
    word: r.word || f.word || '',
    topic: r.topic || f.topic || '',
    seen: safeInt(r.seen),
    streak: safeInt(r.streak),
    mastered: !!r.mastered,
    wrong: safeInt(r.wrong),
    favorite: !!r.favorite,
    updatedAt: normalizeTimestamp(r.updatedAt),
  };
}

function mergeEntry(localEntry, cloudEntry, fallback) {
  const local = normalizeEntry(localEntry, fallback);
  const cloud = normalizeEntry(cloudEntry, fallback);
  const latest = Date.parse(local.updatedAt) >= Date.parse(cloud.updatedAt) ? local : cloud;
  return {
    word: latest.word || (fallback && fallback.word) || '',
    topic: latest.topic || (fallback && fallback.topic) || '',
    seen: Math.max(local.seen, cloud.seen),
    streak: latest.streak,
    mastered: latest.mastered,
    wrong: Math.max(local.wrong, cloud.wrong),
    favorite: latest.favorite,
    updatedAt: latest.updatedAt || nowIso(),
  };
}

function makeWordKey(item) {
  return item.topic + '::' + String(item.word).toLowerCase();
}

// ---- 本地读写 --------------------------------------------------------------

function loadProgress() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || {};
  } catch (e) {
    return {};
  }
}

function saveProgress(stats) {
  try {
    wx.setStorageSync(STORAGE_KEY, stats);
  } catch (e) {
    console.warn('[vocab] 进度写入失败', e && e.errMsg);
  }
}

function loadPrefs() {
  try {
    return wx.getStorageSync(PREFS_KEY) || {};
  } catch (e) {
    return {};
  }
}

function savePrefs(prefs) {
  try {
    wx.setStorageSync(PREFS_KEY, prefs);
  } catch (e) {
    /* 偏好丢了不影响背词 */
  }
}

// ---- 云同步 ----------------------------------------------------------------
//
// 三条约束:
//   1. 未登录直接跳过 —— 背单词本身完全离线可用。
//   2. 任何失败都只 warn, 绝不弹错误挡住用户。
//   3. 上行攒批 + 防抖, 一词一请求会被答题速度打爆。

let syncTimer = null;
const pending = {};

function loggedIn() {
  return !!api.getToken();
}

/**
 * 进页面时拉一次云端进度并与本地合并。
 * 返回合并后的 stats; 未登录或失败时原样返回本地 stats。
 */
function pullAndMerge(stats, wordByKey) {
  if (!loggedIn()) return Promise.resolve({ stats: stats, synced: false });
  return api
    .request({ path: '/api/vocab/progress' })
    .then((data) => {
      const cloud = (data && data.progress) || {};
      const merged = {};
      const back = {};
      const keys = {};
      Object.keys(stats).forEach((k) => (keys[k] = 1));
      Object.keys(cloud).forEach((k) => (keys[k] = 1));

      Object.keys(keys).forEach((key) => {
        const item = wordByKey[key];
        if (!item) return; // 词库里已删掉的词, 丢弃
        const next = mergeEntry(stats[key], cloud[key], item);
        merged[key] = next;
        // 合并后与云端不一致 → 需要回推
        const cloudNorm = cloud[key] ? normalizeEntry(cloud[key], item) : null;
        if (JSON.stringify(next) !== JSON.stringify(cloudNorm)) back[key] = next;
      });

      saveProgress(merged);
      if (Object.keys(back).length) push(back);
      return { stats: merged, synced: true };
    })
    .catch((e) => {
      console.warn('[vocab] 云端进度拉取失败, 用本地进度继续', e && e.message);
      return { stats: stats, synced: false };
    });
}

function push(progressMap) {
  if (!loggedIn()) return Promise.resolve();
  const keys = Object.keys(progressMap);
  if (!keys.length) return Promise.resolve();
  // 后端单次上限 1000 条, 正常防抖批次远小于此, 这里只做兜底切片
  const payload = {};
  keys.slice(0, 1000).forEach((k) => (payload[k] = progressMap[k]));
  return api
    .request({ path: '/api/vocab/progress', method: 'POST', data: { progress: payload } })
    .catch((e) => {
      console.warn('[vocab] 进度上传失败, 下次答题会重试', e && e.message);
    });
}

/** 答完一词调用。攒批 + 防抖上传。 */
function scheduleSync(stats, keys) {
  if (!loggedIn()) return;
  keys.forEach((k) => {
    if (stats[k]) pending[k] = stats[k];
  });
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(flushSync, SYNC_DEBOUNCE_MS);
}

/** 离开页面时立刻把攒的批次推上去, 别等防抖。 */
function flushSync() {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  const keys = Object.keys(pending);
  if (!keys.length) return;
  const payload = {};
  keys.forEach((k) => {
    payload[k] = pending[k];
    delete pending[k];
  });
  push(payload);
}

module.exports = {
  STORAGE_KEY,
  makeWordKey,
  normalizeEntry,
  mergeEntry,
  loadProgress,
  saveProgress,
  loadPrefs,
  savePrefs,
  pullAndMerge,
  scheduleSync,
  flushSync,
};
