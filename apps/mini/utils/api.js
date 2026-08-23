// 网络层。星芽后端是 Cloudflare Pages Functions, 约定与 muscle-master 的
// {code,data} 不同: 成功直接返回业务 JSON, 失败返回非 2xx + {error: '...'}。
//
// 学习功能全部离线可用, 这里只承载 登录 / 云同步 / AI 总结。任何调用失败都必须
// 能被调用方安全忽略 —— 断网不该挡住孩子做题。

const { apiBase } = require('../config.js');

const TOKEN_KEY = 'rm.token';
const USER_KEY = 'rm.user';

function request(options) {
  const path = options.path;
  const header = { 'Content-Type': 'application/json' };
  if (options.auth !== false) {
    const token = wx.getStorageSync(TOKEN_KEY);
    if (token) header.Authorization = 'Bearer ' + token;
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiBase + path,
      method: options.method || 'GET',
      data: options.data,
      header: header,
      timeout: options.timeout || 15000,
      success(res) {
        const body = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
          return;
        }
        if (res.statusCode === 401) clearAuth();
        const err = new Error(body.error || `HTTP ${res.statusCode}`);
        err.statusCode = res.statusCode;
        err.body = body;
        reject(err);
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || '网络错误'));
      },
    });
  });
}

// ---- 登录态 ----------------------------------------------------------------

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || '';
}

function getUser() {
  return wx.getStorageSync(USER_KEY) || null;
}

function saveAuth(token, user) {
  wx.setStorageSync(TOKEN_KEY, token);
  wx.setStorageSync(USER_KEY, user || null);
}

function clearAuth() {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(USER_KEY);
}

/**
 * 微信登录: wx.login 拿 code → 后端换 openid 并签发星芽 JWT。
 * 后端见 functions/api/auth/wechat.ts。
 */
function wechatLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (r) => (r.code ? resolve(r.code) : reject(new Error('wx.login 未返回 code'))),
      fail: (e) => reject(new Error((e && e.errMsg) || 'wx.login 失败')),
    });
  }).then((code) =>
    request({ path: '/api/auth/wechat', method: 'POST', data: { code: code }, auth: false }).then((d) => {
      if (!d || !d.token) throw new Error('登录响应缺少 token');
      saveAuth(d.token, d.user);
      return d.user;
    }),
  );
}

/** 已登录则返回缓存用户, 否则走一次 wx 登录。 */
function ensureLogin() {
  const token = getToken();
  if (token) return Promise.resolve(getUser());
  return wechatLogin();
}

module.exports = {
  apiBase,
  request,
  getToken,
  getUser,
  saveAuth,
  clearAuth,
  wechatLogin,
  ensureLogin,
};
