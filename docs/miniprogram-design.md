# 星芽小程序设计（apps/mini）

> 目标：把星芽 Web 版（rocketMath）搬到微信小程序，功能对齐、内容不分叉、账号互通。
> 做法参照 `muscle-master-wechat/apps/mini-customer`：**原生小程序，零框架、零构建步骤**。
> 代码在本仓库 `apps/mini/`，与 Web 端共享同一份引擎和内容源。

---

## 1. 关键决策

| # | 决策 | 取舍理由 |
|---|---|---|
| D1 | 原生小程序，不用 Taro/uni-app | 跨端框架要引入构建链、体积和调试成本，而星芽的 UI 交互并不复杂；muscle-master 已验证原生可行 |
| D2 | 放在 rocketMath 仓库内 `apps/mini/`（monorepo） | 引擎/内容/后端与 Web 同源，改一处两端跟上；分仓必然分叉 |
| D3 | P0 就做**全功能对齐 Web** | 星芽的价值在"知识地图 + 备考闭环"，砍成单纯口算就没有差异化 |
| D4 | 微信登录（`wx.login`）+ 复用现有 D1 账号体系 | 小程序里让家长敲用户名密码是劝退动作；openid 建号后，`children` 表和 Web 端完全互通 |
| D5 | 学习内容**随包下发**，不走网络 | `wx.request` 合法域名和 `web-view` 都要求 ICP 备案，备案前网络不可靠；且离线可练本来就是星芽的产品前提 |
| D6 | 引擎从 Web 端 TS **编译**下来，不手写第二份 | 见 §4。这是整个移植最大的杠杆点 |

---

## 2. 结构

```
apps/mini/
├── app.js / app.json / app.wxss      # 全局：设计 token 与 Web src/ui/styles.css 对齐
├── config.js                         # apiBase / enableTTS / trialLimit —— 运行时开关只在这里
├── project.config.json  sitemap.json
├── pages/                            # 主包：门面 + tabBar
│   ├── portal/                       #   学习（学科入口 / 继续备考 / 连胜）
│   ├── grade/                        #   选年级
│   └── mine/                         #   我的（登录 / 孩子档案 / 家长区入口）
├── content/                          # 主包内容（见 §3）
├── utils/                            # 小程序侧适配层（storage / api / family / pin / track …）
├── vendor/                           # ⚠️ 由 npm run mini:engine 生成，禁止手改
└── packages/                         # 分包
    ├── math/    map · play · probe · race · practice   + 各年级 practice pack
    ├── lang/    vocab · chinese · reading              + 词库 / 生字库
    ├── exam/    calendar · prep                        + 考试日历
    └── parent/  dashboard（PIN 门 + 错题本 + AI 总结 + 数据管理）
```

**分包的硬约束**：分包可以 `require` 主包，但**不能 `require` 另一个分包**（跳转不受限，只有 `require` 受限）。
WXSS 的 `@import` 同样按路径解析，所以跨分包共用的样式必须放 `app.wxss`。这两条决定了 §3 的内容摆放。

---

## 3. 内容投放策略

体积预算：主包 ≤ 2MB，单个分包 ≤ 2MB，总计 ≤ 20MB（按**压缩后**计算）。
`scripts/build-mini-content.mjs` 在构建时把浏览器版的内容源求值后输出成 CommonJS，当前产物（未压缩）：

| 位置 | 内容 | 未压缩体积 |
|---|---|---|
| 主包 `content/` | 各年级 fluency pack + knowledge map + **英语题集** | 122 KB |
| `packages/math/content/` | 各年级 practice pack | 1358 KB |
| `packages/lang/content/` | KET/PET 词库 + 语文生字库 | 108 KB |
| `packages/exam/content/` | 考试日历 | 25 KB |
| | 合计 | 1613 KB |

几个不那么显然的安排：

- **英语题集（16KB）放主包**：备考清单在 `exam` 分包、练习页在 `math` 分包，两边都要读它。
  分包之间不能互相 `require`，主包是唯一能共享的位置。
- **英语练习复用数学练习页**：题集是同一套 `PracticePack` 结构，走 `math/pages/practice?pack=english&setId=…`。
  路径里带 `math` 只是历史位置，用户看不到。填空题的数字过滤按 `numericInput` 开关，英语走字母输入。
- **`preloadRule` 从 portal / grade 预载 `math` 分包**，所以跨包跳进练习页在实际使用中没有额外下载等待。
- 内容一律输出 `.js`（`module.exports = {…}`）而不是 `.json`：基础库对 JSON 模块的支持随版本波动，
  `.js` 在任何基础库上都稳；压缩后体积差异可忽略。

---

## 4. 与 Web 端的代码共享

```
src/engine/**        ─┐
src/practice/**       │  tsc (apps/mini/tsconfig.mini.json)
src/map/types.ts      ├─────────────────────────► apps/mini/vendor/**   (CommonJS)
src/storage/types.ts  │  npm run mini:engine
src/ui/{prepMastery,summary,timelock}.ts ─┘
```

进入 `vendor/` 的条件只有一个：**零 React、零 DOM、零网络**。
`build-mini-engine.mjs` 第 3 步会扫描产物里的浏览器 API，扫到就直接失败——这比 tsconfig 的 `lib` 限制更可靠。

不编译、在 `utils/` 下另写一份的两类：

| Web 端 | 小程序侧 | 差异 |
|---|---|---|
| `src/storage/indexedDb.ts` | `utils/storage.js` | IndexedDB → `wx.storage`；无自增主键要自己维护；单 key 1MB / 总量 10MB，所以 events / mistakes 做了上限截断 |
| `src/ui/pin.ts` `streak.ts` `prep.ts` | `utils/pin.js` 等 | `localStorage` → `wx.storage`（同步 API，逻辑几乎一致） |
| `src/ui/speech.ts` | `utils/speech.js` | SpeechSynthesis → 微信同声传译插件，默认关闭 |

**页面不共享**：React 组件树 → WXML/JS 页面必须重写。移植时的两条固定规则——
WXML 不能调函数，所有视图模型在 JS 里算好；`window.confirm` → `wx.showModal`；
Web 端把子界面内嵌渲染的地方（如 PrepScreen 里的 Play/Practice），小程序改成页面跳转，返回时 `onShow` 重算状态。

---

## 5. 账号与数据

```
wx.login → code ──POST /api/auth/wechat──► jscode2session (需 AppSecret)
                                            └─► users 表按 wx_openid upsert
                                            └─► 签发星芽 JWT（与 Web 同一把 JWT_SECRET）
```

- `WX_APPID` / `WX_APPSECRET` **只存 Cloudflare Secret**，与 `DEEPSEEK_API_KEY` 同样的做法，
  绝不进 git、绝不进任何前端产物：
  ```
  npx wrangler pages secret put WX_APPSECRET --project-name=rocket-learning
  npx wrangler pages secret put WX_APPID     --project-name=rocket-learning
  ```
- `session_key` 用不到（不解密手机号/用户信息），因此**不落库**——不存就没有泄露风险。
- 建号时用 `wx_xxxxxxxx` 占位用户名（微信 2022 年后已回收昵称授权），界面上显示的是孩子档案的名字。
- 迁移：`src/db/migrations/wechat.sql`（`wx_openid` 唯一索引 + `wx_unionid` 备将来跨端合号）。

**数据边界**（与 Web 端完全一致，不是小程序的额外妥协）：

| 数据 | 位置 | 说明 |
|---|---|---|
| 口算/练习进度、XP、错题本 | 本机 `wx.storage` | Web 端同样只在 IndexedDB；换设备不带走 |
| 孩子档案 | 云端 `children` 表 | 登录后两端互通 |
| 背单词进度、语文生字本 | 云端（`/api/vocab/progress`、`/api/shengzi/notebook`） | 复用 Web 端已有接口 |
| 埋点 | `/api/track` | 断网静默丢弃，绝不阻塞答题 |

学习功能全部离线可用，`utils/api.js` 的任何失败都必须能被调用方安全忽略——断网不该挡住孩子做题。

---

## 6. 功能对照

| 能力 | Web | 小程序 | 位置 |
|---|---|---|---|
| 口算流畅度（热身测手速 → 关卡 → 竞速） | ✅ | ✅ | `packages/math` play / probe / race |
| 知识地图 + 分难度练习 | ✅ | ✅ | `packages/math` map / practice |
| 英语背单词（卡片/拼写/选择、收藏、错词） | ✅ | ✅ | `packages/lang` vocab |
| 语文识字（字表/拆解/偏旁/闯关/生字本/复习） | ✅ | ✅ | `packages/lang` chinese |
| 阅读识字（粘课文标生字） | ✅ | ✅ | `packages/lang` reading |
| 考试日历 + 备考清单 | ✅ | ✅ | `packages/exam` calendar / prep |
| 家长区（PIN、错题本、AI 总结、数据管理） | ✅ | ✅ | `packages/parent` dashboard |
| 多孩子档案切换 | ✅（浮层） | ✅（「我的」常驻页，手指够得着） | `pages/mine` |
| 朗读纠错答案 | SpeechSynthesis | 同声传译插件，默认关闭 | `utils/speech.js` |
| 汉字笔顺动画 | hanzi-writer（CDN） | ❌ 无 | 小程序不能加载 CDN 脚本，见 §7 |

---

## 7. 合规与上线风险

按拦路程度排序：

1. **ICP 备案（阻断级）**。`wx.request` 合法域名必须是已备案域名，`*.pages.dev` 无法备案。
   - 开发阶段：开发者工具 → 详情 → 本地设置 → 勾「不校验合法域名…」（`project.config.json` 已设 `urlCheck: false`）。
   - 真机预览/发布前：必须换成自己的备案域名，并在小程序后台配置 request 合法域名。
   - 影响面仅限登录/云同步/AI 总结；不备案也能上一个纯离线版本，但没有账号。
2. **AppID 与类目**。当前 `project.config.json` 用 `touristappid`（游客模式，无法真机预览）。
   教育类小程序涉及「教育 - 在线教育」类目，部分子类目需要资质材料；注册主体和类目要先定。
3. **未成年人相关规范**。面向 K12 的小程序审核会看是否有诱导付费、是否收集未成年人信息。
   星芽目前不收集姓名以外的儿童信息（孩子档案只有昵称 + emoji 头像），风险低，但**不要**在小程序里加内购。
4. **无 CDN 脚本**。hanzi-writer / cnchar 这类靠 CDN 的库在小程序里不可用，笔顺动画只能另找方案（P2）。
5. **不能打开任意外链**。考试官网只能 `wx.setClipboardData` 复制地址让家长自己去浏览器打开；
   `web-view` 同样需要备案域名。
6. **弹窗规范**。小程序没有 `window.confirm`；所有二次确认走 `wx.showModal`。

---

## 8. 路线

**P0（已完成）** — 全功能对齐 Web
- 主包门面（portal / grade / mine）+ tabBar
- math / lang / exam / parent 四个分包全部落地
- 引擎与内容的构建脚本（`mini:engine` / `mini:content`）
- 微信登录后端 `functions/api/auth/wechat.ts` + `wechat.sql` 迁移
- 页面冒烟测试 `npm run mini:test`（34 个用例）

**P1** — 上线必备
- 注册主体 / AppID / 类目；备案域名并替换 `config.js` 的 `apiBase`
- 真机走查（iOS + Android 各一台），重点看安全区、`input` 键盘遮挡、长列表滚动
- 分享卡片（`onShareAppMessage`）与场景值埋点
- 同声传译插件接入（`config.enableTTS` + `app.json` 的 `plugins` 声明）

**P2** — 增量
- 学习进度云同步（口算/练习/错题本；Web 端也没有，做就两端一起做）
- 订阅消息：每日练习提醒、考试报名提醒
- 笔顺动画的小程序方案（canvas 自绘或换轻量数据源）

---

## 9. 开发流程

```bash
npm run mini          # = mini:engine + mini:content，改了 src/ 或 content/ 后必跑
npm run mini:test     # 页面冒烟测试：假 wx/Page 全局把每页跑一遍，断言 data
npm run mini:preview  # 24 屏静态截图预览 → preview-out/index.html
```

然后用微信开发者工具**导入 `apps/mini` 目录**（不是仓库根）。

### 两层验证

`mini:test`（`scripts/test-mini-pages.mjs`，36 条断言）抓语法错、未定义引用、`onLoad`
崩溃、视图模型算错——小程序没有类型检查，一个拼错的字段在真机上是静默空白。
**但它只看 data，布局和样式抓不到。**

`mini:preview`（`scripts/preview-mini.mjs`）补的就是这一层：把 WXML/WXSS 转成
HTML/CSS，用页面 JS 真算出来的 data 渲染一遍，按 375px 宽排版、画出 tabBar，
输出 24 屏 + 一张联系表 `preview-out/index.html`。没装开发者工具时，这是唯一能
看见排版的手段。

近似程度有限，已知不覆盖：`hover-class` / 动画 / `scroll-view` 惯性 / 真机字体
差异 / 键盘弹起时的布局。这些仍以开发者工具和真机为准。

写过的坑（都是这个预览器逼出来的）：

| 问题 | 根因 | 修法 |
|---|---|---|
| 所有 flex 塌成 block | 组件默认样式 `div[data-wx="view"]` 特异性 (0,1,1) 盖过页面类 (0,1,0) | 默认值全包一层 `:where()` 归零 |
| `{{a}} / {{b}}` 报语法错 | 整串匹配 `^\{\{…\}\}$` 贪婪吃掉了中间的 `}}` | 额外要求捕获组里不含 `}}` |
| 页面渲染出的不是目标状态 | 只调了业务方法没切 tab（如 `onStartQuiz` 不改 `tab`） | 场景 `actions` 里两个 handler 都调 |
