/* 星芽 · 网站 / iOS 壳 的运行时开关。必须在 track.js 和其他页面脚本之前加载。
 * Capacitor 在 WKWebView 文档开始时注入 window.Capacitor。网站上没有这个对象。
 * 网站继续使用相对 /api。iOS 壳的页面来自 capacitor://localhost，所以账号接口要指向 Pages。
 */
(function () {
  var ORIGIN = 'https://rocket-learning.pages.dev';
  var cap = window.Capacitor;
  var native = false;
  try {
    native = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  } catch (e) {}
  window.RM_NATIVE = native;
  window.RM_API_ORIGIN = native ? ORIGIN : '';
  window.rmApi = function (path) {
    if (!path) return window.RM_API_ORIGIN;
    if (/^https?:\/\//i.test(path)) return path;
    if (path.charAt(0) !== '/') path = '/' + path;
    return window.RM_API_ORIGIN + path;
  };
})();
