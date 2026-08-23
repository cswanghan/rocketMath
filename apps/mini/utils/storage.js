// StorageAdapter 的微信实现 —— 对应 Web 端 src/storage/indexedDb.ts。
//
// 契约完全一致 (src/storage/types.ts): 方法名、参数、返回值、Promise 语义都不变,
// 所以引擎和页面逻辑无需为小程序改写。IndexedDB → wx.storage 的差异全部关在这里。
//
// wx.storage 限制: 单 key 1MB / 单来源总量 10MB。因此 append-only 的两个日志
// (events / mistakes) 都做了上限截断 —— Web 端不截断是因为 IndexedDB 没这个约束。

const K = {
  student: (id) => `rm.student.${id}`,
  track: (sid, tid) => `rm.track.${sid}.${tid}`,
  practice: (sid, setId) => `rm.practice.${sid}.${setId}`,
  races: (sid, tid) => `rm.races.${sid}.${tid}`,
  mistakes: (sid) => `rm.mistakes.${sid}`,
  events: (sid) => `rm.events.${sid}`,
  mistakeSeq: (sid) => `rm.mistakeSeq.${sid}`,
};

// 事件日志只用于家长端统计, 保留最近 N 条足够; 超出丢最旧的。
const MAX_EVENTS = 400;
// 错题本 UI 按知识点分组展示, 过多反而无法使用; 超出丢最旧的未订正记录。
const MAX_MISTAKES = 300;

function get(key, fallback) {
  try {
    const v = wx.getStorageSync(key);
    return v === '' || v === undefined || v === null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function set(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (e) {
    // 存储写满时不能让答题流程崩掉: 记一条日志, 本次进度丢失但游戏继续。
    console.error('[storage] 写入失败', key, e);
  }
}

function del(key) {
  try {
    wx.removeStorageSync(key);
  } catch (e) {
    /* 已不存在 */
  }
}

class WxStorageAdapter {
  // ---- 学生 / 经验 ----------------------------------------------------------
  getStudent(id) {
    return Promise.resolve(get(K.student(id), null));
  }

  putStudent(student) {
    set(K.student(student.id), student);
    return Promise.resolve();
  }

  addXp(studentId, amount) {
    const s = get(K.student(studentId), null) || { id: studentId, createdAt: Date.now() };
    const xp = (s.xp || 0) + amount;
    set(K.student(studentId), Object.assign({}, s, { xp: xp }));
    return Promise.resolve(xp);
  }

  // ---- 口算进度 -------------------------------------------------------------
  getTrackState(studentId, trackId) {
    return Promise.resolve(get(K.track(studentId, trackId), null));
  }

  putTrackState(studentId, trackId, state) {
    set(K.track(studentId, trackId), state);
    return Promise.resolve();
  }

  // ---- 答题事件日志 (append-only, 截断保留最近 MAX_EVENTS 条) -----------------
  appendEvent(event) {
    const key = K.events(event.studentId);
    const list = get(key, []);
    list.push(event);
    if (list.length > MAX_EVENTS) list.splice(0, list.length - MAX_EVENTS);
    set(key, list);
    return Promise.resolve();
  }

  listEvents(studentId) {
    return Promise.resolve(get(K.events(studentId), []));
  }

  // ---- 竞速成绩 -------------------------------------------------------------
  putRaceResult(result) {
    const key = K.races(result.studentId, result.trackId);
    const list = get(key, []);
    list.push(result);
    set(key, list);
    return Promise.resolve();
  }

  listRaceResults(studentId, trackId) {
    return Promise.resolve(get(K.races(studentId, trackId), []));
  }

  // ---- 练习进度 -------------------------------------------------------------
  getPractice(studentId, setId) {
    return Promise.resolve(get(K.practice(studentId, setId), null));
  }

  putPractice(record) {
    set(K.practice(record.studentId, record.setId), record);
    return Promise.resolve();
  }

  // ---- 错题本 ---------------------------------------------------------------
  appendMistake(m) {
    const key = K.mistakes(m.studentId);
    const list = get(key, []);
    // IndexedDB 的 autoIncrement 在这里要自己维护 —— markMistakeCorrected 按 id 定位。
    const seqKey = K.mistakeSeq(m.studentId);
    const id = get(seqKey, 0) + 1;
    set(seqKey, id);
    list.push(Object.assign({}, m, { id: id }));
    if (list.length > MAX_MISTAKES) list.splice(0, list.length - MAX_MISTAKES);
    set(key, list);
    return Promise.resolve();
  }

  listMistakes(studentId) {
    return Promise.resolve(get(K.mistakes(studentId), []));
  }

  markMistakeCorrected(studentId, id) {
    const key = K.mistakes(studentId);
    const list = get(key, []);
    const next = list.map((m) => (m.id === id ? Object.assign({}, m, { corrected: true }) : m));
    set(key, next);
    return Promise.resolve();
  }

  clearMistakes(studentId) {
    del(K.mistakes(studentId));
    del(K.mistakeSeq(studentId));
    return Promise.resolve();
  }

  // ---- 重置 -----------------------------------------------------------------
  // Web 端靠 IndexedDB 的 clear() 整表清空; 这里没有"表", 改为按 key 前缀扫描。
  resetProgress(studentId) {
    let keys = [];
    try {
      keys = wx.getStorageInfoSync().keys || [];
    } catch (e) {
      keys = [];
    }
    const trackPrefix = `rm.track.${studentId}.`;
    const practicePrefix = `rm.practice.${studentId}.`;
    const racePrefix = `rm.races.${studentId}.`;
    keys.forEach((k) => {
      if (k.indexOf(trackPrefix) === 0 || k.indexOf(practicePrefix) === 0 || k.indexOf(racePrefix) === 0) {
        del(k);
      }
    });
    del(K.events(studentId));
    const s = get(K.student(studentId), null) || { id: studentId, createdAt: Date.now() };
    set(K.student(studentId), Object.assign({}, s, { xp: 0 }));
    return Promise.resolve();
  }
}

let singleton = null;

/** 全 App 共用一个 adapter 实例 (wx.storage 本身是全局的, 多实例没有意义)。 */
function createDefaultAdapter() {
  if (!singleton) singleton = new WxStorageAdapter();
  return singleton;
}

module.exports = { WxStorageAdapter, createDefaultAdapter };
