const track = require('./utils/track.js');
const api = require('./utils/api.js');
const { fontFaceUrl } = require('./config.js');

App({
  onLaunch() {
    // 静默续期登录态: 有 token 就什么都不做, 没有也不弹授权 —— 未登录能免费体验,
    // 真正需要账号的地方 (云同步/家长端) 再引导登录。
    if (api.getToken()) {
      api.request({ path: '/api/auth/me' }).catch(() => {
        /* token 过期时 request 内部已清理, 这里不打扰用户 */
      });
    }
    track.track('mp_launch', {});

    // 手写体标题字。同样受合法域名限制, config.fontFaceUrl 为空时走系统字体。
    if (fontFaceUrl) {
      wx.loadFontFace({
        family: 'ZCOOL KuaiLe',
        source: `url("${fontFaceUrl}")`,
        global: true,
        scopes: ['webview'],
        fail: (e) => console.warn('[font] 加载失败, 使用系统字体', e),
      });
    }
  },

  onHide() {
    // 切后台时把攒着的埋点冲出去, 否则可能永远发不出
    track.flush();
  },

  globalData: {
    brandColor: '#28a847',
  },
});
