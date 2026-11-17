# 星芽 1.0.0 (6)：Issue #2 本次重审与后续 Build 7 记录

更新：2026-11-17（Asia/Shanghai）。**本次数学版 1.0.0 (6) 已按用户授权重新提审。截至 14:32 CST，原 submission 及三个项目均显示“等待审核”：iOS 1.0.0 Build 6、Premium Monthly、星芽会员订阅群组。App 分发已保存为其余 174 个国家或地区，中国大陆“未供应”；未填写合规声明或新材料。四年级扩充与 Build 7 留待后续，未关联、安装或提交本次审核。Apple 运行时兼容修复已部署，当前生产部署 `102fa3d8` 的 API 代码与已修复的 `37c92c3` 相同；14:04–14:05 已确认当前 iPhone 开发签名 Build 6 的真实 Apple 新账号创建及登录通过。首次 Apple 同意、长延迟、前后台、全新安装及真机 iPad 等仍未验收，不能声明全部场景通过。“等待审核”不等于审核通过。**

## 依据与源码

- [Issue #2](https://github.com/cswanghan/rocketMath/issues/2)：1.0.0 (5) 于 11 月 16 日因 Guideline 2.1(a) Apple 登录错误、2.1(b) IAP “Item Unavailable” 再次被拒。
- 已读取[最新评论](https://github.com/cswanghan/rocketMath/issues/2#issuecomment-6934156190)。评论记录 11 月 17 日 ASC 只读检查：协议有效，银行/税务无待办，月订在 175 个地区（含美国）可用、US $2.99/月，状态为 Ready for Review；评论当时记录“不在任何提交中”。这是评论中的历史检查结果；本轮后续 ASC 界面已独立确认原 Unresolved Issues 提交含 App 版本、月订与订阅组三个项目，详见后文。上述状态不等于商品已批准或 Sandbox 实测通过。
- 本地实际实现为原生 SwiftUI / AuthenticationServices / StoreKit 2，后端为 Cloudflare Pages Functions，不是远端 Capacitor 壳。源码已先以 `75acdc9` 独立保存，包含此前未提交的本地修改。依赖、缓存、凭据、归档、测试结果包与临时日志未纳入提交，原本地文件保留。审核草稿中的密码已脱敏。
- 起始 Xcode 项目版本仍为 build 3，本仓库本地归档也不能证明与审核中的 build 5 二进制完全一致。原有源码分析不能证明 Apple 审核环境的精确失败原因；本轮后续 12:07 真机复测则已取得下述新部署的现场诊断。本次选择已上传的 **Build 6**。工作树中另含四年级内容扩充且构建号为 7，属于后续版本；不能把它的功能或验证记成本次 Build 6 的证据。
- 现有练习引擎修改仅保留在源码恢复提交中；Issue #2 修复不改练习引擎。
- 用户明确本次仅对数学版重新提审；原生三科接入留待后续，不把已保留的三科 Web 产物描述成本次 iOS 版本功能。

## 已定位的问题与源码修复

挑战窗口与分类诊断等改进已在 10:56 前部署，但 12:07 新鲜授权仍失败。该轮现场已确认 Workers 不支持 `redirect: "error"`，在请求构造时抛错，阻止获取 Apple 公钥；该原因已由 12:18:21 部署的兼容补丁修复，后续 14:04–14:05 真实登录复测通过。09:xx–10:xx 旧后端失败没有同等诊断，不能全部归因于挑战 TTL。最小重定向兼容补丁已完成、通过验证并部署；当前 iPhone Build 6 的真实新 Apple 账号创建及登录已通过。

### Apple 登录

1. **12:07 新现场确证原因：Cloudflare Workers 请求模式不兼容。** 新鲜真实 Face ID 授权后，安全诊断记录 `stage=identity`、`reason=jwks_network`、HTTP **503**。公钥请求使用 `redirect: "error"`；[Cloudflare Request 文档](https://developers.cloudflare.com/workers/runtime-apis/request/)确认 Workers 不支持此模式，会在构造 Request 时抛 `TypeError`，网络请求尚未发出。独立 `curl` 访问 Apple 公钥 URL 返回 HTTP 200 且无重定向，不能将此次失败解释为 Apple 公钥服务不可用。最小补丁已将 JWKS 和共享 token/revoke 请求两处改为 `manual`，继续通过状态检查拒绝 3xx，禁止自动跟随重定向；补丁已通过下述测试并于 12:18:21 部署，14:04–14:05 当前 iPhone 的真实登录复测通过。该后端补丁不要求 iOS 代码改动；Build 6 已上传，四年级内容扩充与 Build 7 按用户最新选择留待后续。
2. **其他已实现改进：** 服务端挑战由 300 秒延长为 30 分钟，每次请求使用新 nonce/challenge，仍执行原子单次消费、防重放、签名、audience、nonce 和 token 到期验证；线上已确认 **1800 秒**。较长窗口解决慢速授权的时限风险，不能解释所有旧即时失败，也未延长 Apple 授权码自身寿命。
3. 移除客户端依赖设备时钟的提前到期判断，以及服务端独立于 token `exp` 的 10 分钟 `iat` 年龄限制。授权控制器、来源窗口和当前 state 在等待及前后台切换期间保持；缺省的可选 state 允许通过，明确不匹配的 state 仍拒绝，旧/重复回调不会完成新请求。客户端不持久保存本次 Apple 身份令牌和授权码；服务端单独加密保存后续撤销授权所需记录。真实延迟／前后台成功路径仍待验收。
4. 取消授权静默返回。验证失败不再一律称为“已失效”；已部署分类诊断在 12:07 给出了上述公钥请求失败阶段。仅记录固定阶段、原因、HTTP 状态及白名单 Apple 错误码，不记录令牌、授权码、nonce、用户资料、密钥或原始响应。
5. Apple 返回 `invalid_grant` 不能证明单一原因：过期、已使用或客户端不匹配均可能产生该错误。日志保留实际错误类别，不猜测为“过期”。

### 月订与恢复

1. 商品 ID 保持 `com.hanwang.xingya.premium.monthly`。空响应和暂时请求错误进行有限退避重试，重新进入账号页或回到前台可再次请求。
2. 商品错误独立于会员刷新结果，显示中英文友好文案及“重试”按钮；购买/恢复不显示原始 StoreKit “Item Unavailable”。取消购买静默返回。
3. 保留购买后的服务端账号绑定：POST 成功返回的已验证权益直接成为当前状态，不用第二次 GET 的失败推翻成功购买。前台刷新避开正在进行的购买/恢复。
4. 恢复购买仍经 App Store 同步、当前权益读取与服务端账号核验；网络失败保留本地登录，离线打开不因网络错误退出账号。

实现依据：[Apple 用户验证](https://developer.apple.com/documentation/signinwithapple/verifying-a-user)、[Sign in with Apple 响应错误](https://developer.apple.com/documentation/technotes/tn3107-resolving-sign-in-with-apple-response-errors)、[StoreKit 取消购买结果](https://developer.apple.com/documentation/storekit/product/purchaseresult/usercancelled)。

### 重定向兼容补丁已完成的验证

- JWKS 与共享 token/revoke 请求两处已改为 `manual`，保留非成功状态拒绝逻辑，不跟随 3xx；新增 **10 例回归**。
- Apple 相关测试 **76 项通过**；全套 **410/410 通过**，TypeScript 检查、Vite 构建、`git diff --check` 均通过。这些是后端补丁的新增验证，不表示重新运行了 iOS 套件。
- 真实 **workerd/Miniflare**，`compatibilityDate=2026-06-02`：旧 `error` 模式立即 `TypeError`、**零出站**；`manual` 模式收到 **302**、`ok=false`、`redirected=false`，总出站 **1 次**且未跟随。此结果验证运行时兼容及拒绝重定向行为，不等于真实 Apple 登录成功。
- **补丁已于 12:18:21 部署，且当前生产 API 保持该修复；当前 iPhone Build 6 真实 Apple 登录已通过；本次 Build 6 已于 14:32 前重新提审，当前等待审核。** 生产无凭据假签名探测已进入签名拒绝阶段，详见下方部署记录；不算登录通过。本次继续使用已关联的 Build 6；四年级扩充和 Build 7 证据另列在后续版本章节。

## 本次实际验证

本次使用 Xcode 27.1（27A9275）。以下常规构建及 iOS 验证保留原执行范围；重定向兼容补丁的新增验证单列如下：

| 验证 | 实际结果 |
| --- | --- |
| `npm test` | 9 个套件、400 项通过；Apple 登录 66 项，原生会员后端 217 项 |
| `npx tsc --noEmit --pretty false` | 通过 |
| `npm run build` | Vite 构建通过；后续授权部署结果见下方部署记录 |
| iPhone 17 Pro Max / iOS 26.5 Simulator | 90 项单元测试 + 3 项 Apple 登录界面测试通过；xcresult 93 passed / 0 failed / 0 skipped |
| iPad Air 11-inch (M4) / iOS 26.5 Simulator | 90 项单元测试 + 3 项 Apple 登录界面测试通过；xcresult 93 passed / 0 failed / 0 skipped |
| `xcodebuild` generic iOS Release | **BUILD SUCCEEDED**，`CODE_SIGNING_ALLOWED=NO`（未签名编译验证，不是上传包） |
| Release App 的生成 Info.plist | `com.hanwang.xingya` / `1.0.0` / `CFBundleVersion=6` |
| `git diff --check`、凭据/产物检查、练习引擎基线比较 | 修复差异检查通过；无新增凭据或构建产物；与恢复基线相比练习引擎无变化 |

首轮 iPhone 测试确实发现 4 条英文文案断言失败；补齐资源目录后，最终两端均全通过。原始失败与最终结果保存在独立目录，没有覆盖旧项目测试产物。

回归范围包括：延迟首次回调、前后台通知期间保留 controller/state/nonce、设备时钟偏差、取消后新 nonce/challenge、旧回调隔离、空商品→1/2 秒退避→成功、重新请求/耗尽后重试、本地化、购买/恢复取消、前台刷新竞争、POST 绑定后无冗余 GET、恢复账号归属、离线会话保持。

**自动化边界：** 原生生命周期测试使用通知和注入回调；后端延迟测试使用签名 fixture 与模拟 code exchange；自动化商品测试使用本地 `Configuration.storekit` 与注入接口。Apple 真实授权码仍由 Apple 按其有效期验证，本次没有延长它。自动化 UI 测试没有按下真实 Apple 授权按钮。这些测试不证明真实 Apple ID、真实 Sandbox、生产部署或审核环境验收。后续人工真机观察单独记录如下。

复现命令（将设备 ID 替换为本机同类模拟器）：

```sh
npm test
npx tsc --noEmit --pretty false
npm run build
xcodebuild -project ios/Xingya.xcodeproj -scheme Xingya \
  -destination 'platform=iOS Simulator,id=<device-id>' \
  -derivedDataPath /tmp/xingya-issue2-simulator \
  -resultBundlePath /tmp/xingya-issue2-tests.xcresult \
  -parallel-testing-enabled NO -only-testing:XingyaTests \
  -only-testing:XingyaUITests/AppleSignInUITests test
xcodebuild -project ios/Xingya.xcodeproj -scheme Xingya -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath /tmp/xingya-issue2-release \
  CODE_SIGNING_ALLOWED=NO build
```

本机证据：`/tmp/rocketmath-issue2/npm-test.log`、`web-build.log`、`device-final.log`、`iphone-final.log`、`ipad-final.log`、`iPhone-final.xcresult`、`iPad-final.xcresult`。这些是本地产物，未加入 Git。

### 11 月 17 日真机增量（仍在进行）

使用源码提交 `7bbffa4` 构建的开发签名 **1.0.0 (6)**，在 USB 连接的 **iPhone 16 Pro Max / iOS 27.3** 上在位升级并保留数据，随后通过 `devicectl` 独立启动，**未启用 Xcode 本地 StoreKit 配置**。这不是全新安装、TestFlight 或审核分发包验收。手机主 Apple ID 未变更，本轮没有真机 iPad 证据。

| 项目 | 已观察结果 | 证据边界 |
| --- | --- | --- |
| 安装、独立启动 | 通过 | 开发签名、在位升级。 |
| 真实 StoreKit 商品目录 | **通过（仅加载展示）** | 月订显示 **US$2.99**，无本地 StoreKit 配置；不能据此确认 Sandbox 测试账号、购买或权益绑定成功。 |
| 首次弹出的 Apple 授权页取消 | **通过** | 静默返回，没有错误提示。 |
| 随后的首次实际 Apple 授权 | **失败** | 线上旧后端返回 `apple_invalid` 和“Apple 登录验证已失效，请重新使用 Apple 登录。”，未登录成功。 |
| 一分钟内立即重试 Apple 授权 | **失败** | 再次返回上述错误；因此不能把全部失败归因于等待超过 5 分钟。 |
| 12:05 新部署后的长时间授权尝试 | **失败，未单独确定该轮阶段** | 真机显示“Apple 登录未配置或暂时不可用，请稍后重试”。11:22 创建的 Challenge 未消费，未新增 Apple 用户或 token；该轮不能仅凭 UI 判定是原生授权还是后端阶段。 |
| 12:07 新鲜真实 Face ID 授权 | **失败，已定位请求运行时不兼容** | 后端安全诊断为 `stage=identity`、`reason=jwks_network`、HTTP 503；Workers 不支持 `redirect: "error"`，Request 构造即抛错，公钥请求未发出。最小兼容补丁及测试已完成，12:18:21 已部署；后续成功记录见下一行。 |
| 修复后真实 Apple 新账号创建及登录 | **通过（当前 iPhone Build 6）** | 14:04:17 新 Challenge，14:04:24 消费；14:04:25 创建 1 个 approved Apple 登录账号并保存 1 条加密授权记录，安全 tail 为 `login_response=200`；14:05 账号页明确已登录。首次 Apple 同意、长延迟与前后台场景未据此通过。 |
| 审核账号登录 | **通过** | 10:07 账号页显示 `appstore_review` 已登录、尚未开通会员；这是用户名/密码路径，不是 Apple 登录成功。 |
| 系统测试购买页与取消 | **通过（仅展示与取消）** | 10:08 系统购买页明确显示仅用于测试、确认后不会收费；取消后静默返回。 |
| 旧 Sandbox 身份的测试购买尝试 | **历史失败报告，具体原因未独立复核** | 10:09 用户确认后报告 Sandbox 购买权限不足。当时电脑锁定，10:19 再查看时弹窗已消失，未独立看到完整原文，当时无有效会员。换用已核实正确团队的新测试员后 10:45 购买成功，但不能据此确定旧身份失败的具体原因。 |
| 离线应用冷启动保持登录 | **通过（当前 iPhone）** | 10:20 开启飞行模式并关闭 Wi-Fi、蜂窝网络；终止原 App 进程后于 10:21 独立冷启动，账号仍登录，10:22 网络请求超时后仍保留会话。未测试整机重启。 |
| 离线免费练习 | **通过（单题与继续）** | 10:23 离线概念练习作答 1 题，判为正确并进入第 2 题；未完成整套 18 题。 |
| 恢复网络后账号页重入 | **通过（本次观察）** | 10:24–25 恢复原网络，10:28 重入账号页后超时错误消失，商品仍显示 US$2.99。 |
| 恢复购买的身份验证取消 | **通过（仅取消）** | 10:29 恢复购买触发系统 Sandbox 身份验证，取消后静默返回可操作的账号页，无错误；没有恢复有效权益。 |
| 新 Sandbox 测试员购买及账号绑定 | **通过（当前 iPhone、本次单次购买）** | 10:45 应用显示“购买成功，会员已关联当前账号”“月度会员有效”“沙盒测试权益，不代表生产购买”。同一审核账号的 D1 Sandbox 绑定由不存在变为存在，Production 绑定仍不存在；D1 仅证明持久绑定，不独立证明 `active` 或 `expiresAt`。 |
| 购买后恢复有效权益 | **通过（当前 iPhone）** | 10:45 发起恢复，10:46 同一星芽审核账号与新 Sandbox 测试员完成系统密码验证后，应用明确显示“已恢复购买，会员已关联当前账号”“月度会员有效”及 Sandbox 提示。 |
| 购买后在线应用冷启动重验证 | **通过（当前安装）** | 10:46 使用 `devicectl --terminate-existing` 结束旧进程并独立冷启动，重新进入我的 → 账号，同一账号仍登录，会员经在线重验证仍有效。不是全新安装或整机重启。 |

10:26 已独立观察到设备开发者设置中的 Sandbox 入口有登录身份，与当时系统购买页身份一致；当时正确 ASC 团队的 Sandbox 测试员列表仍为空，设备 Sandbox 管理页两次显示无法连接，旧身份的团队归属未确认。10:40 已在正确 ASC 团队列表独立核实一个新建美国区 Sandbox 测试员。10:41 仅退出设备旧的独立 Sandbox 身份，准备使用新测试员登录。10:44 设备开发者 → Sandbox 入口已显示与新测试员一致的登录身份；可选双重认证升级邀请选择“不升级”后返回已登录状态，未要求验证码。手机主 Apple ID 保持不变。新测试员创建、团队归属及设备独立 Sandbox 登录已确认；10:45 该测试员完成一次购买并显示有效 Sandbox 会员，购买权限及本次购买已有成功证据，10:46 有效权益恢复与在线应用冷启动重验证也已通过。不记录账号身份、邮件别名或凭据。

10:24–25 已恢复原网络状态：飞行模式关闭，原 Wi-Fi 重连，蜂窝网络开启，VPN 显示已连接。10:45 新测试员仅完成一次购买；应用成功与有效会员提示和 D1 持久绑定变更互相补充，不把数据库存在性当作实时会员状态或到期时间。ASC 测试员编辑页只读确认月订续期速率为每 5 分钟，“中断购买”复选框关闭。购买后立即发起的恢复在 10:46 完成系统身份验证，应用显示恢复成功和有效 Sandbox 会员，随后在线应用冷启动重验证仍有效。本次恢复和冷启动检查在同一次在位升级安装环境中完成；未做全新安装或整机重启，亦未观察完整加速续订／最终到期周期，不能把这些未执行场景记为通过。

### 修复后真实 Apple 登录成功（2026-11-17 14:04–14:05）

- 当前开发签名 Build 6、同一 iPhone 16 Pro Max / iOS 27.3 在位升级安装环境下，真实 Apple 授权创建并登录了一个新的星芽账号。后端记录新的 Challenge 于 **14:04:17 CST** 创建、**14:04:24** 消费；**14:04:25** 新增 1 个 approved Apple 登录账号和 1 条加密授权记录。
- **14:04:52** 读取安全 tail，确认 `challenge_response=200` 与 `login_response=200`、无该次失败事件；HTTP 200 登录路由已返回应用会话。**14:05** 账号页独立显示 Apple 用户已登录、未开通会员，商品仍为 US$2.99。不记录用户名、用户 ID、邮箱、令牌、nonce 或原始日志。
- 这是新 Challenge 约 **7 秒**后成功消费的请求，不是此前长时间等待的授权成功，也不证明首次 Apple 同意、刻意延迟／前后台切换、全新安装或真机 iPad 已通过。
- 新 Apple 账号与此前 Sandbox 购买所用审核账号不同。原有学习数据的跨账号同步保护提示按设计出现，未将审核账号的会员权益转绑到新 Apple 账号；已有 Sandbox／恢复／离线结果继续限定于原审核账号及原测试范围。
- 无秘密聚合证据：`/tmp/rocketmath-issue2-device/apple-real-device-success-journal.json`。截图 `apple-login-success-20261117.png` 保存在同一私有临时目录，未加入 Git 或公开上传。**14:08–14:09 的 Update Review 尝试曾被 ASC 中国大陆合规材料要求阻止；随后按用户授权排除中国大陆，14:32 前已重新提审并进入等待审核。**

部署前的旧后端只读诊断（保留历史证据）：

- 当时单次无凭据 Challenge 探测返回 HTTP 200，实际 TTL 为 **300 秒**；当时 1800 秒修复尚未上线，6 分钟后才完成授权会受旧后端限制。这个历史数值不再代表下述新部署。
- 当时生产部署列表的最新记录显示“3 days ago”，分支 `main`、来源提交 `2a02449`。它是此前含未提交源码的上传来源标记，不能证明与该 Git 提交或本地恢复源码逐字一致；现已被下述部署替代。
- 核对生产 D1 绑定后，仅查询最近 20 分钟的时间桶与消费计数：09:32、09:34、09:37、09:38 共 **6 条 Challenge，已消费均为 0**。未读取 ID、nonce/hash、用户信息或令牌。结合恢复的旧版处理顺序，只能将失败范围缩小到成功消费挑战／授权码交换之前；无法确定具体是请求、身份 claims、nonce、JWKS 网络或 Challenge 校验失败。该聚合不是逐请求跟踪，旧版错误文案也不是精确原因。
- 诊断脚本默认 User-Agent 曾被 Cloudflare 1010（browser signature banned）拒绝；浏览器 User-Agent 可访问。该脚本限制不能当作原生 iPhone 或地区被阻止的证据。

### 后端生产部署（截至 2026-11-17 10:56 已完成核验）

用户后续已授权部署、上传和重新提审，覆盖此前禁止发布的限制。截至本节 10:56 的阶段已完成 Cloudflare Pages 后端及 Web 产物部署；该阶段当时尚未重新提交 App Review；后续 iOS 上传及 14:32 前重新提审结果另列于下方。

- 生产项目：`rocket-math`；正式域名：[rocket-math-4kg.pages.dev](https://rocket-math-4kg.pages.dev)。部署 ID：`77e70a93-a95e-4372-aa00-37591320c63a`；[不可变部署地址](https://77e70a93.rocket-math-4kg.pages.dev)。
- 源码：分支 `fix/2-apple-signin-iap`，完整 SHA `b0395c835dcc5d9f8909e273804e19fd25752565`，部署时工作树干净。生产部署的分支元数据为 `main`，不代表执行了 Git 合并；本阶段没有 Git 提交或合并。
- 部署前重新执行 400 项测试、TypeScript 检查与 Vite 构建，均通过。明确指定生产项目，核实生产 D1 绑定与现有 Apple 登录、会员、数学进度表及索引；**未执行迁移、未重置或删除任何数据**。可选微信登录未配置所需环境变量，缺列不在本次 Apple/IAP 请求路径中，未添加非必要迁移。
- 正式域名健康检查：主页、语文识字页、语文阅读页、词汇页及英语练习资源均 **HTTP 200**；未登录的 `/api/auth/me` 正常返回 **401**。三科 Web 产物保留。
- 无凭据 `/api/auth/apple-challenge` 探测返回 **HTTP 200，TTL 1800 秒**，确认本次后端窗口变更已生效。未输出 Challenge ID、nonce 或秘密。
- 分类诊断实现已经部署，仅以固定 `stage`、`reason`、HTTP 状态和白名单 OAuth 类别观测，不输出请求头、凭据或原始日志。10:56 的健康检查不证明登录成功；12:07 后续真机失败及根因记录见上文，重定向兼容补丁及测试已完成，并于 12:18:21 部署，尚待真机复测。

### 重定向兼容补丁生产部署（2026-11-17 12:18:21）

- 同一 `rocket-math` 生产项目部署成功；部署 ID `1f4eeecf-daa9-4630-8857-3be6b8d13964`，[部署地址](https://1f4eeecf.rocket-math-4kg.pages.dev)，来源提交 `37c92c364a11a294f75efb30c7b0cff09c5b9379`。部署前 410 项全套测试、76 项 Apple 测试、TypeScript 和 Vite 构建通过。
- **未执行迁移、重置或删除数据，未变更生产设置。** 生产项目、数据库绑定、变量、兼容日期和 placement off 均复核保持原值。
- 正式域名健康检查通过；Challenge HTTP 200、TTL 1800 秒。无凭据假签名探测返回 `stage=identity`、`reason=signature_invalid`、HTTP **400**，表明生产端已能获取 Apple 公钥并拒绝无效签名；**未到授权码交换，不是真实登录成功证据。**
- 修复已上线，当前 iPhone Build 6 真实 Apple 登录已通过；本次 Build 6 已于 14:32 前重新提审，当前等待审核。无秘密证据记录：`/tmp/rocketmath-issue2-device/apple-manual-release-journal.json`，未加入 Git。

### 四年级 Web 内容生产部署（2026-11-17 12:34:37）

- 同一 `rocket-math` 生产项目部署 `102fa3d8-e873-4b4e-9ccc-6d80615a6f25`，[部署地址](https://102fa3d8.rocket-math-4kg.pages.dev)，来源提交 `9a4d9f09384a41437dc961decc687aaa4bc91f93`。
- 正式站点四年级口算资源返回 HTTP 200，包含 **256 题**；资源 SHA 与已验证的 dist 一致。此为 Web 发布事实；原生新题保留在后续 Build 7，本次 iOS Build 6 使用其原有题包。语文、数学、英语 Web 资源保持可用，不代表本次原生 iOS 加入三科。
- API 代码与已修复的 `37c92c3` 相同；Apple Challenge HTTP 200、TTL **1800 秒**。生产数据库绑定、变量、兼容日期与 placement off 未变；**无迁移、数据重置／删除或设置变更**。这次部署没有提供新的真实 Apple 登录成功证据。
- 无秘密部署证据：`/tmp/rocketmath-issue2-device/grade4-release-journal.json`，未加入 Git。

### iOS 构建上传与审核记录（2026-11-17）

- 本次范围仅为数学版 **1.0.0 (6)**；三科接入后续处理。
- **11:15:56 CST：云签名构建上传成功。** Delivery/build UUID：`7e4a66da-3bf8-4b33-99d9-560f92ebec18`。
- **11:23：ASC TestFlight 界面独立确认构建 6 为“准备提交”，处理完成。** 这不等于已安装 TestFlight 包、重新提审或审核通过；此前真机测试仍使用开发签名在位升级安装。
- ASC 原 Unresolved Issues 提交已完整包含 iOS 1.0.0 Build 5（Rejected）、PremiumMonthly（Ready for Review）与星芽会员订阅组（Ready for Review）。**11:25–11:26：已在 ASC 版本页选择 1.0.0 Build 6 并保存；Build 5 仅从版本所选构建中解除关联，原 submission 的三个项目均未移除。** 14:08–14:09 已保存包含真实 Apple 登录成功及其范围的新审核说明；Update Review 当时因中国大陆合规材料要求被阻止。随后按用户明确授权排除中国大陆，并在原提交中完成 Update Review 与“重新提交至 App 审核”，未移除或重建提交。**截至 14:32，Build 6、月订与订阅组三个项目均等待审核。**
- 新后端真机 Apple 授权于 **11:22** 收到 Challenge HTTP 200；截至 **11:29** 仍停留在系统首次姓名／邮箱授权 sheet，尚未点“继续”，后端尚无 Apple 登录 POST。**这只是 11:29 当时的状态，不构成延迟回调通过证据；后续 12:05 和 12:07 的失败及诊断见上方真机记录。** 已有 Sandbox 购买、绑定、恢复、在线重验证与离线保持事实保持其原有范围。

本地真机记录与截图保存在 `/tmp/rocketmath-issue2-device/`，包括 `offline-login-preserved.png`、`offline-practice-answered.png`、`sandbox-purchase-bound.png` 和 `sandbox-restored.png`，未加入 Git；本文不包含私人设备标识或凭据。**当前 iPhone 的新 Sandbox 测试员购买、账号绑定、有效权益恢复与在线应用冷启动重验证已有成功证据；此前 Apple 登录在旧后端上失败，12:07 新部署的复测也失败并定位请求模式问题；14:04–14:05 修复后的真实 Apple 新账号创建及登录已通过；首次 Apple 同意、延迟／前后台授权、真机 iPad 与全新安装等仍待验收，不能声明全部端到端验收通过。**

### ASC 重审：历史阻塞、地区调整与最终结果（2026-11-17 14:08–14:32）

- 已成功保存 3372 字符的新审核说明，版本仍关联 **1.0.0 (6)**；原审核凭据与提交的三个项目保持。
- 点击 **Update Review**，并在“已有较新构建”提示中确认继续使用 Build 6 后，ASC 显示 **“无法添加以供审核”**，要求中国大陆的**安全评估证明及报告、AIGC 声明及备案信息**。
- 14:08–14:09 的该次操作未成功进入审核队列，也未执行 Resubmit。这是真实表单阻塞；后续按用户授权调整本次地区范围后已解除。
- 用户随后明确授权本次排除中国大陆、在其余 174 个地区重审。**14:29，ASC 界面已确认地区保存成功：“App 供应情况（174 个国家或地区）”，中国大陆行“未供应”。** 仅取消中国大陆，其余地区选择和“未来新地区自动提供”的原选项均保持；没有填写合规声明或提交新材料，也不宣称中国大陆材料要求已满足。
- **截至 14:32 CST，Update Review 已通过，随后已点击“重新提交至 App 审核”。** 同一原 submission `7cd2f7a4-c789-4e30-8fa3-684e02362d6a` 整体为“等待审核”，三个项目也均为“等待审核”：**iOS 1.0.0 Build 6、Premium Monthly、星芽会员订阅群组**。原审核凭据及 3372 字符的真实验收备注保留；未改 Apple ID，Build 7 未关联、安装或提交本次审核。
- 截图证据保存在私有临时目录 `/tmp/rocketmath-issue2-device/`：`asc-build6-compliance-blocked.jpg`、`asc-mainland-unavailable.jpg`、`asc-build6-resubmitted.jpg`；无秘密结果记录为同目录 `asc-build6-resubmission-journal.json`，均未加入 Git 或公开上传。

## 验收清单（含未完成或失败）

- [ ] 真机 iPhone 与 iPad，全新安装、新 Apple 账号，首次授权、延迟数分钟、后台/前台后成功登录。当前 iPhone 在位升级路径取消已通过；旧后端上的实际授权与即时重试失败；12:07 失败已定位请求模式问题，补丁后当前 iPhone 的新鲜真实授权在 14:04–14:05 通过，但不等于首次同意、长延迟、前后台或新安装场景通过；真机 iPad 未验证。
- [ ] 在审核对应系统（Issue 记录 iPadOS 27.2.1）验证完整路径。当前 iPhone 真实商品目录加载及新测试员 Sandbox 购买已通过，不等于审核设备或完整验收；Xcode 本地 `.storekit` 配置和注入测试也不能代替它。
- [x] 当前 iPhone 在位升级安装环境下，审核账号 `appstore_review` 配正确团队新 Sandbox 测试员完成单次购买、有效会员显示、服务端持久账号绑定、有效权益恢复与在线应用冷启动重验证。10:45 购买、10:46 恢复及重验证通过；未变更手机主 Apple ID。
- [ ] 将上述购买、绑定、恢复及冷启动重验证扩展到真机 iPad／全新安装场景；当前结果不代表这些环境，亦未测试整机重启或完整加速续订／最终到期周期。凭据只从受控信息取用。
- [ ] 将离线应用冷启动与免费练习验证扩展到真机 iPad／全新安装场景。当前 iPhone 在位升级环境中，会话保持、网络超时后不退出、单题判分及进入下一题已通过；未测试整机重启或完整 18 题练习。
- [x] 后续授权后部署对应后端，核实生产配置与现有表结构，无需迁移；正式域名 Challenge 已确认 1800 秒。该项不等于真机 Apple 登录通过。
- [x] Workers 重定向兼容补丁已完成：两处使用 `manual`，新增 10 例回归，76 项 Apple 测试及全套 410 项测试通过；TypeScript、Vite 构建与 diff 检查通过。真实 workerd/Miniflare 验证拒绝重定向，详见上方范围说明。
- [x] 12:18:21 部署 Workers 重定向兼容补丁，生产假签名探测为 `identity/signature_invalid` HTTP 400，验证公钥可取且无效签名被拒；未到 code exchange，不等于真实登录通过。
- [x] 当前 iPhone 开发签名 Build 6 的真实 Apple 新账号创建及登录通过：14:04:17 新 Challenge，14:04:24 消费，14:04:25 新建 approved 账号及加密授权记录；后端 HTTP 200 与 14:05 账号页已登录相互印证。该次约 7 秒，不含首次同意、长延迟、前后台或新安装验收。
- [x] 1.0.0 (6) 云签名上传成功，并于 11:23 在 TestFlight 独立确认处理完成、状态“准备提交”。该状态不是已重新提审或审核通过。
- [x] ASC 原 Unresolved Issues 提交已独立确认包含三个项目：iOS 1.0.0 Build 5（Rejected）、PremiumMonthly（Ready for Review）、星芽会员订阅组（Ready for Review）。
- [x] 11:25–11:26 在 ASC 版本页选择并保存 1.0.0 Build 6；仅解除旧 Build 5 的版本构建关联，原 submission 的三个项目均保留。
- [x] 14:08–14:09 已保存本次 Build 6 的新审核说明（ASC 显示 3372 字符），保留 Build 6 关联及原提交项目；说明包含真实 Apple 登录通过与未验收范围。
- [x] 按用户明确授权，本次 App 分发仅排除中国大陆；14:29 已确认其余 174 个地区保存成功，中国大陆未供应，其余及未来新地区自动提供的原选项保持。未填写合规声明或新材料。
- [x] 截至 14:32，已在原提交完成 Update Review 和“重新提交至 App 审核”；整体与 iOS 1.0.0 Build 6、Premium Monthly、星芽会员订阅群组三个项目均等待审核。原凭据与 3372 字符的真实验收备注保留。
- [ ] Apple 完成审核并给出最终结果；当前“等待审核”不等于已获批准。

## 审核路径草稿

1. 首次启动选择年级并完成引导。免费练习无需登录或购买。
2. Apple 登录独立路径：我的 → 账号 → 登录/注册 → Continue with Apple。首次授权可以等待后完成；取消应直接返回，屏幕没有错误。
3. 订阅路径：我的 → 账号 → 使用审核账号登录。向下滚动至会员，等待 StoreKit 返回本地化名称、价格和每月周期。暂时不可用时使用“重试”，或者离开后再次进入账号页。
4. 使用 Sandbox 完成月订；服务器绑定成功后应显示有效会员。取消不应显示错误。已有购买使用“恢复购买”，保持原星芽账号。
5. 购买后可在账号页执行“立即同步”；家长中心内的远程 AI 家长总结应明确显示远程来源。它们仍需真实后端端到端验证，不能用本地分析充当远程结果。
6. 会员区提供恢复、管理订阅、自动续订说明、隐私政策及 Apple Standard EULA。删除星芽账号不会取消 Apple 订阅。

只有上述真机与 Sandbox 证据补齐后，才能把外发审核备注写成“已实测通过”。英文草稿见 `ios/asc-release-assets/REVIEW_NOTES.md`。

## 后续版本 Build 7（不纳入本次 Build 6 重审）

用户已明确将四年级口算扩充留到后续。以下内容、测试、归档和上传均是后续 Build 7 的已完成记录，不是本次 Build 6 的新增功能或验收证据。Build 7 已上传并处理完成，未关联本次版本；后续启用时再确认真机验收与审核范围。

### 四年级口算内容扩充（后续 Build 7）

用户反馈四年级整十除法答案总为 4。已确认原 A 级四题均答 4、B 级四题均答 6；A 级的起飞、环绕、宇宙阶段使用同一题池，因此原引擎在 100 个种子、合计 7200 次正常作答中全部答 4。这是内容分布问题，不是计算错误或随机种子失效。

- 四条口算轨道（整百整十乘法、整十除法、两步混合运算、大数运算）的 A–D 共 **16 个题池，由 64 题扩至 256 题，每池 16 题**。每池至少 6 种答案，任一答案最多占 25%；除法 A/B/C/D 分别有 8/7/8/8 种商。
- **原有 64 题的 ID、题面、答案和所属关卡不变**，保留既有学习记录及待纠错题。只扩充内容与构建目标，不改练习引擎、随机选择逻辑、阶段阈值或纠错规则。
- 中文、英文与小程序内容一致；未变更其他年级、practice 或知识地图题包，旧翻译词条保留。生成器新增仅生成口算包的模式，避免覆盖已有练习内容扩充。
- 已运行 **7/7 项 TS 专项回归**，覆盖题量/答案分布、教学范围、独立算式复核（含括号、乘除优先与“万”单位）、64 题兼容、三端内容一致、100 个种子的 72 题实际出题流程及旧纠错进度恢复。另以独立 Python AST/Fraction 复算中英文共 **512 题，零错误**；只读审查通过。
- **Build 7 完整自动化验证已通过，详见下表；后续已归档并上传，尚未进行真机验收。不能将下方历史 Build 6 的设备、签名或上传证据视为 Build 7 真机验收。**

### Build 7 完整自动化验证（已完成）

| 验证 | 实际结果 |
| --- | --- |
| 全套 TypeScript 测试 | **417/417 通过**，包含新增四年级 7 项回归 |
| TypeScript 类型检查、Web build | **通过** |
| 本地化测试与题包审计 | **18/18 通过**；审计 **21 个题包**，错误、数值及术语标记均为 **0** |
| iOS Simulator `XingyaTests` | **93/93 通过**；xcresult 树确认 `Grade4FluencyTests` 三个函数各含 zh-Hans/en，共 **6 个参数用例通过** |
| iOS Simulator UI | **3/3 通过**：保留的 3–9 年级英文选择 1 项；新增中、英两项分别切换四年级 → 整十除法 → 口算，独立计算并正确作答 **6 题** |
| generic iOS Release | **BUILD SUCCEEDED**，`CODE_SIGNING_ALLOWED=NO`；为未签名编译验证，非归档、上传或真机验收 |
| 内容重新生成 | 输出逐字节一致 |

证据位于 `ios/build/grade4-build7-zNpDh0/`：`validation-summary.json`、`UnitTests.xcresult`、`unit-test-tree.json`、`unit-summary.json`、`Grade4UITests.xcresult` 与 `release-build.log`。这些本地产物不加入 Git。此次内容测试没有进行 Apple ID／Sandbox 验收；Build 6 的真实 Apple 登录已于 14:04–14:05 另行验证通过，测试运行当时没有进行 Build 7 归档上传；后续已于 12:37:34 上传，当前真机验收仍未完成。

### Build 7 归档与上传（2026-11-17 12:37:34）

- **1.0.0 (7) 云签名上传成功**，delivery `a89d1e24-f0cb-4627-b3d0-3a89d4b6a7cc`。归档与开发签名产物位于 `ios/build/asc-build7-9a4d9f0-U55KFY/`，未加入 Git，尚未安装到真机。
- 发行产物已核验版本／构建号、预期 team、`com.hanwang.xingya`、Sign in with Apple 权限、iPhone 与 iPad 支持、codesign、dSYM，以及 `get-task-allow=false`。
- **约 12:41，ASC 上传表已明确显示 Build 7“完成”，TestFlight 行为“准备提交”，处理完成已独立确认。** 本次版本页按用户选择保留 **Build 6**，Build 7 留待后续，未关联本次版本。处理完成不等同重新提审或审核通过。
- Build 7 尚未安装到真机，其真机验收留待后续。当前 Apple 修复已上线，Build 6 的真实 Apple 登录已通过；**本次 Build 6 已完成 Update Review 与 Resubmit，14:32 前进入等待审核**，原 submission 三个项目保留；Build 7 未提交。

### 后续版本状态

- [x] 四年级四轨道 16 个题池已从 64 扩至 256 题，专项 TS 7/7 通过；中英文 512 题独立复算、旧 64 题兼容、CN/EN/小程序一致性审查通过。
- [x] Build 7 全套 TS 417/417、TypeScript/Web build、本地化 18/18 与 21 包审计零标记、iOS 单元 93/93、UI 3/3 及未签名 generic iOS Release 编译通过。
- [x] Build 7 已归档并完成发行产物验证，12:37:34 云签名上传成功；版本、bundle、team、Sign in with Apple、iPhone/iPad 支持、codesign、dSYM 与发行包 `get-task-allow=false` 均已核验。
- [x] 约 12:41 独立确认 Build 7 上传表“完成”及 TestFlight“准备提交”。
- [ ] 后续决定启用 Build 7 时再完成真机验收并关联对应审核版本；本次按用户选择保留 Build 6。Build 7 未关联本次版本。
