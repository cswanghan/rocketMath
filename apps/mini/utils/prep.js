// 「我要备考」目标持久化。移植自 Web 端 src/ui/prep.ts (localStorage → wx.storage)。
// 按 studentId 隔离, 与多孩子档案体系一致。

const keyFor = (studentId) => `rm.prep.${studentId}`;

function readPrepTarget(studentId) {
  try {
    return wx.getStorageSync(keyFor(studentId)) || null;
  } catch (e) {
    return null;
  }
}

function savePrepTarget(studentId, seriesId) {
  try {
    const existing = readPrepTarget(studentId);
    const next =
      existing && existing.seriesId === seriesId
        ? existing
        : { seriesId: seriesId, startedAt: Date.now() };
    wx.setStorageSync(keyFor(studentId), next);
  } catch (e) {
    /* ignore */
  }
}

/** 备考页算完掌握度后回写, 首页「继续备考」直接展示, 不用重算。 */
function updatePrepProgress(studentId, masteredCount, total) {
  try {
    const existing = readPrepTarget(studentId);
    if (!existing) return;
    wx.setStorageSync(
      keyFor(studentId),
      Object.assign({}, existing, { masteredCount: masteredCount, total: total }),
    );
  } catch (e) {
    /* ignore */
  }
}

function clearPrepTarget(studentId) {
  try {
    wx.removeStorageSync(keyFor(studentId));
  } catch (e) {
    /* ignore */
  }
}

/**
 * 首页「继续备考」胶囊数据。名称要从 exam 分包的日历里解析, 而主包不能 require
 * 分包 —— 所以保存目标时顺手把名称冗余进来 (见 prep 页 savePrepTargetWithName)。
 */
function readResume(studentId) {
  const t = readPrepTarget(studentId);
  if (!t || !t.name) return null;
  return {
    seriesId: t.seriesId,
    name: t.name,
    masteredCount: t.masteredCount || 0,
    total: t.total || 0,
  };
}

/** exam 分包在进入备考时调用, 把系列名冗余存下来供首页展示。 */
function savePrepTargetWithName(studentId, seriesId, name) {
  savePrepTarget(studentId, seriesId);
  try {
    const existing = readPrepTarget(studentId) || {};
    wx.setStorageSync(keyFor(studentId), Object.assign({}, existing, { name: name }));
  } catch (e) {
    /* ignore */
  }
}

/** vocabLink.level ("ket"/"pet") → 词表筛选值。与 Web 端 vocabLevelParam 一致。 */
function vocabLevelParam(level) {
  if (level === 'ket') return 'a2-key';
  if (level === 'pet') return 'b1-preliminary';
  return 'all';
}

module.exports = {
  readPrepTarget,
  savePrepTarget,
  savePrepTargetWithName,
  updatePrepProgress,
  clearPrepTarget,
  readResume,
  vocabLevelParam,
};
