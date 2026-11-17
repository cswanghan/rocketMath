# 星芽小程序

原生微信小程序，零框架、零构建步骤。设计文档见 [`docs/miniprogram-design.md`](../../docs/miniprogram-design.md)。

## 跑起来

```bash
npm run mini          # 生成 vendor/ 引擎 + content/ 内容包（改了 src/ 或 content/ 后必跑）
npm run mini:test     # 页面冒烟测试（只查 data，不看样式）
npm run mini:preview  # 24 屏静态截图预览 → preview-out/index.html
```

`mini:preview` 把 WXML/WXSS 转成 HTML/CSS，用页面 JS 真算出来的 data 渲染一遍，
按 375px 宽（iPhone 逻辑分辨率）排版并画出 tabBar。**它不是微信渲染引擎**，只够
用来发现「这行字被卡片挤出去了」「flex 塌成 block 了」这类排版问题——真机行为
仍以微信开发者工具为准。

微信开发者工具 → 导入项目 → 选 **`apps/mini` 目录**（不是仓库根）。
`appid` 目前是 `touristappid`（游客模式），换成自己的 AppID 才能真机预览。

`vendor/` 是 `npm run mini:engine` 的产物，**禁止手改**——改 `src/` 再重新生成。

## 网络

`config.js` 的 `apiBase` 指向 Cloudflare Pages。`*.pages.dev` 无法 ICP 备案，所以：

- 开发阶段：详情 → 本地设置 → 勾「不校验合法域名、web-view、TLS 版本以及 HTTPS 证书」
  （`project.config.json` 已设 `urlCheck: false`）。
- 真机预览/发布前：换成备案域名，并在小程序后台配 request 合法域名。

学习功能全部离线可用，断网只影响登录/云同步/AI 总结。

## 开启朗读（可选）

默认关闭（`config.js` 的 `enableTTS: false`），走静默降级，不影响任何学习流程。开启需要两步：

1. 小程序管理后台 → 设置 → 第三方设置 → 插件管理 → 添加**微信同声传译** `wx069ba97219f66d99`
2. `config.js` 置 `enableTTS: true`，并在 `app.json` 顶层补上插件声明：

```json
"plugins": {
  "WechatSI": {
    "version": "0.3.5",
    "provider": "wx069ba97219f66d99"
  }
}
```

## 目录

| 路径 | 说明 |
|---|---|
| `pages/` | 主包：portal（学习）/ grade（选年级）/ mine（我的） |
| `packages/math/` | 口算、知识地图、分难度练习 |
| `packages/lang/` | 背单词、语文识字、阅读识字 |
| `packages/exam/` | 考试日历、备考清单 |
| `packages/parent/` | 家长区：PIN 门 + 错题本 + AI 总结 |
| `utils/` | 小程序侧适配层（storage / api / family / pin …） |
| `vendor/` | 从 `src/` 编译下来的引擎（生成物） |
| `content/` | 主包内容（生成物） |

分包可以 `require` 主包，**不能 `require` 另一个分包**（跳转不受限）。
跨分包共用的样式必须放 `app.wxss`。
