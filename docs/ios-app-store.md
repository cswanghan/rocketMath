# 星芽 iOS 上架清单

这份清单只记录仓库里已经存在的行为和这次为 App Store 做的壳层改动。它不是隐私政策，也不是律师意见。提交前仍要由账号持有人核对，并自行准备 App Store Connect 上的隐私政策网址。

本轮没有注册 Apple 账号、没有付费、没有部署、没有提交问卷，也没有新建远程仓库。

## 产品现状

用户看到的名称是 **星芽**。`package.json` 和 README 仍写 Rocket Math，那是训练模型的来源说明，不是商店显示名。iOS 工程的显示名使用星芽，没有改产品名。

应用是本地优先的学习工具：数学口算（限时流畅度）、练习题、语文生字、英语单词、考试日历和备考清单。核心答题在设备上完成，进度放在 IndexedDB，静音、家长密码、打卡和试用次数放在 localStorage。账号、孩子档案、单词云端进度、生字本云端副本和家长页的远程总结才需要网络。

技术栈：React 18、TypeScript、Vite、Vitest。线上是 Cloudflare Pages 项目 `rocket-learning`（`wrangler.toml`），函数在 `functions/`，用户库是 D1 `rocket-learning-users`。另有微信小程序 `apps/mini/`，这次没有改它。仓库里原先没有 Capacitor、Cordova 或 Xcode 工程。仓库根目录没有 LICENSE 文件。

已核对的线上地址：

- `https://rocket-learning.pages.dev`：与 `wrangler.toml` 的项目名一致，iOS 壳的账号接口指向这里。
- `https://rocket-math-4kg.pages.dev`：当前首页引用的前端包与上面相同（`/assets/index-DuklAx3M.js`），`/api/auth/me` 同样返回 401。两个站点是否绑定同一份 D1，要以 Cloudflare 控制台为准。若不是同一份，登录会进错库。

## 名称和内容授权（未改名，需要人确认）

- **Rocket Math** 是第三方课程品牌。不要把它用作 App Store 名称、副标题或截图文案。应用内没有获得该品牌授权的记录。
- 题目标记为 **人教版**。仓库里是按该课程结构生成的练习，没有出版社授权文件。商店素材不要写成官方教材或授权版本。
- 英语词表页面写有「剑桥 KET / PET」「官方主题词」。仓库只保存了剑桥公开词表 PDF 的链接，没有官方合作记录。商店素材不要使用「官方」或 Cambridge 商标。应用内这句文案这次没有改，提交前要处理。
- 注册页原先把邮箱说明写成「用于找回密码」。仓库里没有找回密码接口。占位文案已改为「账号邮箱」。邮箱仍会写入账号，并被现有的邮件活动表使用。

## 这次 iOS 壳实际改变了什么

网站行为尽量保持原样。只在 `window.Capacitor.isNativePlatform()` 为真时收紧：

| 能力 | 网站 | iOS 壳 |
|---|---|---|
| 口算 / 练习 / 本地进度 | 不变 | 随包离线运行 |
| `/api/track` 行为上传 | 保留 | 不上传。试用 10 次计数仍在本机 |
| 家长「一键总结」 | 可请求 `/api/summarize`（服务端再请求 DeepSeek） | 只用本地总结，不把错题发到 DeepSeek |
| 顶栏「打印版」、闲鱼、支付宝 | 保留 | 不显示，且不同步 `support.html` / `admin.html` 进安装包 |
| Google 登录 | 保留 | 隐藏。WKWebView 里的 Google 登录不可用，请用用户名和密码 |
| 微信登录 | 只在小程序 | iOS 壳没有微信登录 |
| Google Fonts、jsDelivr 笔顺脚本和笔顺 JSON | 保留 | 不请求。笔顺退回静态大字，其余生字内容仍在页面内 |
| 生字语音输入 | 浏览器支持时可用 | 关闭，不申请麦克风 |
| 朗读 | Web Speech | 仍调用，失败时静默，不打断做题 |
| 管理后台入口 | 管理员可见 | 隐藏 |

账号接口在壳里改为绝对地址 `https://rocket-learning.pages.dev`，因为安装包页面的源是 `capacitor://localhost`。`functions/_middleware.ts` 只给 `capacitor://localhost` 和 `ionic://localhost` 加 CORS，不给任意网站加。**这个中间件和 `DELETE /api/auth/account` 都还没部署。** 不部署的话，真机登录和删账号会失败。本轮按要求没有部署。

删账号在家长密码之后的「数据管理」里。确认用户名后删除：账号行、孩子档案、单词进度、生字本云端副本、该账号的邮件日志、该账号的行为事件，并把邮件活动的 `created_by` 置空。不删除：本机 IndexedDB 进度、匿名事件（`user_id` 为空）、一次性 `auth_codes`（表上没有用户列）。界面写明了这一点。

离线时 `/api/auth/me` 失败不再清除本机登录；只有 401 / 403 才退出。IndexedDB 打不开时，底部会提示进度可能无法保存，做题不中断。

## 权限、追踪、付费

Info.plist 不申请相机、麦克风、定位、通讯录、跟踪（没有 `NSUserTrackingUsageDescription`）。没有广告 SDK，没有 IDFA，没有 ATT 弹窗。`PrivacyInfo.xcprivacy` 里 `NSPrivacyTracking` 为 false。

应用内没有 App 内购买。打印版仍只在网站上通过闲鱼和支付宝收款码销售，不进 iOS 安装包。不要在商店页写内购或订阅。

`ITSAppUsesNonExemptEncryption` 为 false：安装包只使用系统 HTTPS，没有自带加密算法。

## 儿童和账号

产品面向小学到初中学生，并有家长密码和家长账号。审核可能按儿童应用处理。儿童类目不允许第三方分析和广告；这个壳已经去掉第三方字体、笔顺 CDN、DeepSeek、行为上传和外部支付链接。仍会在家长登录后，把账号资料发到自有的 Cloudflare：用户名、密码哈希、邮箱、可选手机号、Google/微信标识（网站注册才有）、孩子的名字、头像和年级、单词进度、生字本。本机还保存口算进度、错题、经验、家长密码和试用次数。

仓库里没有可以贴到 App Store Connect 的隐私政策。在有一份与上表一致的公开政策之前，不要提交审核。营养标签按上表填写，不要勾选广告或跟踪。

年龄分级按实际内容回答：没有用户生成公开内容，没有广告，没有不受限的网页浏览。应用内链到登录页和自有 API，不是开放浏览器。

## Linux 上已经能验证的

- `npm test`、`npx tsc --noEmit`、`npm run build`
- Capacitor iOS 工程文件已生成（`ios/App`）
- 配置测试检查了 bundle 显示名、加密声明、隐私清单，以及 plist 里没有相机/定位/跟踪/麦克风用途说明
- 网页预览截图只说明界面，不等于 iOS 运行通过

## 必须在 Mac 上验证的

Linux 没有 Xcode，下面全部还没在模拟器或真机上跑过。网页构建通过不能代替这些步骤。

1. 安装 Xcode。在 `ios/App` 执行 `pod install`（若工程使用 CocoaPods），然后打开 `App.xcworkspace`。
2. 把 Bundle Identifier `app.xingya.learn` 换成自己开发者账号里的正式 id，并在 Signing 里选择 Team。当前 id 只是占位，没有注册。
3. 先把包含 `_middleware.ts` 和 `functions/api/auth/account.ts` 的版本部署到 `rocket-learning`，再测登录。不要在本清单之外用这个环境部署。
4. iPhone 与 iPad、竖屏与横屏：刘海、底部横条、键盘弹出时登录框仍可输入。数字键和顶栏按钮应能点中。
5. 飞行模式下完成一道口算，划掉应用再打开，进度还在。再打开家长页，总结应为本地，不出现「AI 分析」。
6. 登录、错误密码、断网打开应用（不应被退出）、家长区删除账号。删除成功后该账号不能再登录。
7. 确认安装包内没有 `support.html`、`admin.html`，也没有支付二维码。
8. 听一道纠错朗读。若系统没有中文语音，应用应继续可玩，而不是卡住。
9. 用 Xcode Archive 上传。截图必须来自模拟器或真机，尺寸按 App Store Connect 当前要求。不要把本仓库的网页截图当作商店截图。
10. App Store Connect：隐私政策 URL、营养标签、年龄分级、出口合规选「否」（对应 plist 里的加密声明）。不要提交儿童类目，除非有人再核对剩余的账号数据收集。本轮不要替用户提交问卷。

图标由 `scripts/generate-app-icon.py` 生成，是不透明的纯色树形占位图，不是任何第三方标志。上传前可以换成正式图标，尺寸保持 1024×1024。
