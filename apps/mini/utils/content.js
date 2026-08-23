// 主包内容加载器: 流畅度包 + 知识地图 + 当前年级。
//
// 练习题集 (practice pack) 体积大得多, 放在 math 分包里, 由分包内的
// packages/math/content/index.js 加载 —— 主包不能 require 分包代码。
//
// 内容全部随代码包下发, 不走网络: 断网也能做题, 也不需要备案域名。

const index = require('../content/index.js');
const { validatePack } = require('../vendor/engine');

const GRADE_KEY = 'rm.grade';
const cache = {};

/** 同步加载某年级的流畅度包 + 知识地图。require 是同步的, 内容已在包内。 */
function loadGrade(grade) {
  if (cache[grade]) return cache[grade];
  const pack = index.fluencyPack(grade);
  validatePack(pack); // content pack 结构自检 —— 与 Web 端同一份校验
  const content = { grade: grade, pack: pack, knowledgeMap: index.knowledgeMap(grade) };
  cache[grade] = content;
  return content;
}

function getGrade() {
  try {
    return wx.getStorageSync(GRADE_KEY) || null;
  } catch (e) {
    return null;
  }
}

function setGrade(grade) {
  try {
    wx.setStorageSync(GRADE_KEY, grade);
  } catch (e) {
    /* ignore */
  }
}

module.exports = {
  GRADES: index.GRADES,
  loadGrade: loadGrade,
  getGrade: getGrade,
  setGrade: setGrade,
};
