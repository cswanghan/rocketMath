// 家庭/孩子档案 + 当前在学的孩子。移植自 Web 端 src/ui/family.ts。
// 后端复用同一套 /api/family/children (Cloudflare Function + D1), 所以小程序和
// 网页登录同一账号时看到的是同一批孩子。

const api = require('./api.js');

const ACTIVE_KEY = 'rm.child';

function getActiveChild() {
  try {
    return wx.getStorageSync(ACTIVE_KEY) || null;
  } catch (e) {
    return null;
  }
}

function setActiveChild(c) {
  try {
    if (c) wx.setStorageSync(ACTIVE_KEY, c);
    else wx.removeStorageSync(ACTIVE_KEY);
  } catch (e) {
    /* ignore */
  }
}

/**
 * 学习数据按孩子隔离的 student id。
 * null (家长本人 / 未建档案) 沿用 'local' —— 与 Web 端一致, 保住老用户已有进度。
 */
function studentIdFor(c) {
  return c ? `child_${c.id}` : 'local';
}

/** 当前 studentId 的快捷方式 —— 页面里最常用的就是这个。 */
function currentStudentId() {
  return studentIdFor(getActiveChild());
}

function listChildren() {
  return api
    .request({ path: '/api/family/children' })
    .then((d) => (d && d.children) || [])
    .catch(() => []); // 未登录/断网时安静退化为"没有孩子档案"
}

function createChild(input) {
  return api.request({ path: '/api/family/children', method: 'POST', data: input });
}

function updateChild(input) {
  return api.request({ path: '/api/family/children', method: 'PATCH', data: input });
}

function deleteChild(id) {
  return api.request({ path: '/api/family/children', method: 'DELETE', data: { id: id } });
}

module.exports = {
  getActiveChild,
  setActiveChild,
  studentIdFor,
  currentStudentId,
  listChildren,
  createChild,
  updateChild,
  deleteChild,
};
