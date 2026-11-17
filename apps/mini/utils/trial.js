// 「先试再登录」: 未登录用户每个学科可免费做 trialLimit 道题, 超出提示登录。
// 移植自 Web 端 src/trial.ts —— 那边计数在 /track.js 里完成, 小程序没有全局
// tracker, 所以计数也放这里 (bump)。
//
// 微信端登录只要一次授权, 门槛远低于网页, 所以这更像"降低首屏心理门槛"而不是
// 硬付费墙: 未登录也能完整体验一个知识点。

const { trialLimit } = require('../config.js');
const api = require('./api.js');

const keyFor = (subject) => 'rm.trial.' + subject;

function trialCount(subject) {
  try {
    return Number(wx.getStorageSync(keyFor(subject))) || 0;
  } catch (e) {
    return 0;
  }
}

/** 已登录用户不受限。 */
function trialExceeded(subject) {
  if (api.getToken()) return false;
  return trialCount(subject) >= trialLimit;
}

/** 未登录时每答一题 +1; 已登录不计数。返回累计后是否已超限。 */
function bump(subject) {
  if (api.getToken()) return false;
  const n = trialCount(subject) + 1;
  try {
    wx.setStorageSync(keyFor(subject), n);
  } catch (e) {
    /* ignore */
  }
  return n >= trialLimit;
}

/** 登录成功后清空所有学科的体验计数。 */
function resetTrials() {
  ['math', 'chinese', 'english'].forEach((s) => {
    try {
      wx.removeStorageSync(keyFor(s));
    } catch (e) {
      /* ignore */
    }
  });
}

module.exports = { trialLimit, trialCount, trialExceeded, bump, resetTrials };
