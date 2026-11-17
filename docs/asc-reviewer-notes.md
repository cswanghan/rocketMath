# 星芽 1.0.0 (6)：Issue #2 修复与审核说明草稿

更新：2026-11-17（Asia/Shanghai）。**后端已获授权部署；尚未上传 iOS 构建、尚未重新提审。新后端的真机 Apple 登录复测待完成，本稿不是全部验收已通过的声明。**

## 依据与源码

- [Issue #2](https://github.com/cswanghan/rocketMath/issues/2)：1.0.0 (5) 于 11 月 16 日因 Guideline 2.1(a) Apple 登录错误、2.1(b) IAP “Item Unavailable” 再次被拒。
- 已读取[最新评论](https://github.com/cswanghan/rocketMath/issues/2#issuecomment-6934156190)。评论记录 11 月 17 日 ASC 只读检查：协议有效，银行/税务无待办，月订在 175 个地区（含美国）可用、US $2.99/月，状态为 Ready for Review；当前不在任何提交中。这是评论中的检查结果，不是本次重新访问 ASC 的结果，也不等于商品已批准或 Sandbox 实测通过。
- 本地实际实现为原生 SwiftUI / AuthenticationServices / StoreKit 2，后端为 Cloudflare Pages Functions，不是远端 Capacitor 壳。源码已先以 `75acdc9` 独立保存，包含此前未提交的本地修改。依赖、缓存、凭据、归档、测试结果包与临时日志未纳入提交，原本地文件保留。审核草稿中的密码已脱敏。
- 起始 Xcode 项目版本仍为 build 3，本仓库本地归档也不能证明与审核中的 build 5 二进制完全一致。因此以下根因是对**本地最新源码**确认的问题，未把它描述成对 Apple 审核环境的现场复现。修复后 App Debug/Release 构建号均为 **6**，版本保持 1.0.0。
- 现有练习引擎修改仅保留在源码恢复提交中；Issue #2 修复不改练习引擎。

## 已定位的问题与源码修复

以下后端修复已在本轮后续授权后部署。此前 09:xx–10:xx 真机记录使用旧后端，不能将其失败直接记为新部署的结果；新后端的 Apple 登录仍需真机复测。部署及无凭据健康检查证据单独列于下方。

### Apple 登录

1. 服务端挑战在展示 Apple 授权界面之前创建，却只有 300 秒有效期；慢速首次授权可能在回调时被拒。后端源码改为 30 分钟、每次请求新 nonce/challenge，仍执行原子单次消费、防重放、签名、audience、nonce 和 token 到期验证；部署前线上探测为 300 秒，部署后已确认 **1800 秒**。
2. 移除客户端依赖设备时钟的提前到期判断，以及服务端独立于 token `exp` 的 10 分钟 `iat` 年龄限制。授权控制器、来源窗口和当前 state 在等待及前后台切换期间保持；缺省的可选 state 允许通过，明确不匹配的 state 仍拒绝，旧/重复回调不会完成新请求。Apple 凭据不写入持久存储。
3. 取消授权静默返回。新源码中的验证失败不再一律称为“已失效”。已部署的服务端诊断仅记录固定的阶段、原因、HTTP 状态及白名单 Apple 错误码，不记录令牌、授权码、nonce、用户资料、密钥或原始响应。旧文案出现在部署前的真机失败记录中；新后端的真机诊断待复测收集。
4. Apple 返回 `invalid_grant` 不能证明单一原因：过期、已使用或客户端不匹配均可能产生该错误。日志保留实际错误类别，不猜测为“过期”。

### 月订与恢复

1. 商品 ID 保持 `com.hanwang.xingya.premium.monthly`。空响应和暂时请求错误进行有限退避重试，重新进入账号页或回到前台可再次请求。
2. 商品错误独立于会员刷新结果，显示中英文友好文案及“重试”按钮；购买/恢复不显示原始 StoreKit “Item Unavailable”。取消购买静默返回。
3. 保留购买后的服务端账号绑定：POST 成功返回的已验证权益直接成为当前状态，不用第二次 GET 的失败推翻成功购买。前台刷新避开正在进行的购买/恢复。
4. 恢复购买仍经 App Store 同步、当前权益读取与服务端账号核验；网络失败保留本地登录，离线打开不因网络错误退出账号。

实现依据：[Apple 用户验证](https://developer.apple.com/documentation/signinwithapple/verifying-a-user)、[Sign in with Apple 响应错误](https://developer.apple.com/documentation/technotes/tn3107-resolving-sign-in-with-apple-response-errors)、[StoreKit 取消购买结果](https://developer.apple.com/documentation/storekit/product/purchaseresult/usercancelled)。

## 本次实际验证

本次使用 Xcode 27.1（27A9275）。以下均为本机实际执行结果：

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

部署前的旧后端只读诊断（保留历史证据）：

- 当时单次无凭据 Challenge 探测返回 HTTP 200，实际 TTL 为 **300 秒**；当时 1800 秒修复尚未上线，6 分钟后才完成授权会受旧后端限制。这个历史数值不再代表下述新部署。
- 当时生产部署列表的最新记录显示“3 days ago”，分支 `main`、来源提交 `2a02449`。它是此前含未提交源码的上传来源标记，不能证明与该 Git 提交或本地恢复源码逐字一致；现已被下述部署替代。
- 核对生产 D1 绑定后，仅查询最近 20 分钟的时间桶与消费计数：09:32、09:34、09:37、09:38 共 **6 条 Challenge，已消费均为 0**。未读取 ID、nonce/hash、用户信息或令牌。结合恢复的旧版处理顺序，只能将失败范围缩小到成功消费挑战／授权码交换之前；无法确定具体是请求、身份 claims、nonce、JWKS 网络或 Challenge 校验失败。该聚合不是逐请求跟踪，旧版错误文案也不是精确原因。
- 诊断脚本默认 User-Agent 曾被 Cloudflare 1010（browser signature banned）拒绝；浏览器 User-Agent 可访问。该脚本限制不能当作原生 iPhone 或地区被阻止的证据。

### 后端生产部署（截至 2026-11-17 10:56 已完成核验）

用户后续已授权部署、上传和重新提审，覆盖此前禁止发布的限制。本阶段实际只完成 Cloudflare Pages 后端及 Web 产物部署，尚未上传 iOS 构建或提交 App Review。

- 生产项目：`rocket-math`；正式域名：[rocket-math-4kg.pages.dev](https://rocket-math-4kg.pages.dev)。部署 ID：`77e70a93-a95e-4372-aa00-37591320c63a`；[不可变部署地址](https://77e70a93.rocket-math-4kg.pages.dev)。
- 源码：分支 `fix/2-apple-signin-iap`，完整 SHA `b0395c835dcc5d9f8909e273804e19fd25752565`，部署时工作树干净。生产部署的分支元数据为 `main`，不代表执行了 Git 合并；本阶段没有 Git 提交或合并。
- 部署前重新执行 400 项测试、TypeScript 检查与 Vite 构建，均通过。明确指定生产项目，核实生产 D1 绑定与现有 Apple 登录、会员、数学进度表及索引；**未执行迁移、未重置或删除任何数据**。可选微信登录未配置所需环境变量，缺列不在本次 Apple/IAP 请求路径中，未添加非必要迁移。
- 正式域名健康检查：主页、语文识字页、语文阅读页、词汇页及英语练习资源均 **HTTP 200**；未登录的 `/api/auth/me` 正常返回 **401**。三科 Web 产物保留。
- 无凭据 `/api/auth/apple-challenge` 探测返回 **HTTP 200，TTL 1800 秒**，确认本次后端窗口变更已生效。未输出 Challenge ID、nonce 或秘密。
- 分类诊断实现已经部署；接下来仅以固定 `stage`、`reason`、HTTP 状态和白名单 OAuth 类别观测，不输出请求头、凭据或原始日志。**新后端尚待真机 Apple 授权复测，不能由健康检查推断登录已成功。**

本地真机记录与截图保存在 `/tmp/rocketmath-issue2-device/`，包括 `offline-login-preserved.png`、`offline-practice-answered.png`、`sandbox-purchase-bound.png` 和 `sandbox-restored.png`，未加入 Git；本文不包含私人设备标识或凭据。**当前 iPhone 的新 Sandbox 测试员购买、账号绑定、有效权益恢复与在线应用冷启动重验证已有成功证据；此前 Apple 登录在旧后端上失败，新后端复测、延迟／前后台授权、真机 iPad 与全新安装等仍待验收，不能声明完整修复或全部端到端验收通过。**

## 验收清单（含未完成或失败）

- [ ] 真机 iPhone 与 iPad，全新安装、新 Apple 账号，首次授权、延迟数分钟、后台/前台后成功登录。当前 iPhone 在位升级路径取消已通过；旧后端上的实际授权与即时重试失败，新后端复测待完成；真机 iPad 未验证。
- [ ] 在审核对应系统（Issue 记录 iPadOS 27.2.1）验证完整路径。当前 iPhone 真实商品目录加载及新测试员 Sandbox 购买已通过，不等于审核设备或完整验收；Xcode 本地 `.storekit` 配置和注入测试也不能代替它。
- [x] 当前 iPhone 在位升级安装环境下，审核账号 `appstore_review` 配正确团队新 Sandbox 测试员完成单次购买、有效会员显示、服务端持久账号绑定、有效权益恢复与在线应用冷启动重验证。10:45 购买、10:46 恢复及重验证通过；未变更手机主 Apple ID。
- [ ] 将上述购买、绑定、恢复及冷启动重验证扩展到真机 iPad／全新安装场景；当前结果不代表这些环境，亦未测试整机重启或完整加速续订／最终到期周期。凭据只从受控信息取用。
- [ ] 将离线应用冷启动与免费练习验证扩展到真机 iPad／全新安装场景。当前 iPhone 在位升级环境中，会话保持、网络超时后不退出、单题判分及进入下一题已通过；未测试整机重启或完整 18 题练习。
- [x] 后续授权后部署对应后端，核实生产配置与现有表结构，无需迁移；正式域名 Challenge 已确认 1800 秒。该项不等于真机 Apple 登录通过。
- [ ] 后续重新确认 ASC 协议/税务/银行/美国 storefront，以及订阅状态，并将订阅与 build 6 同时加入新提交；本次未进行此操作。

## 审核路径草稿

1. 首次启动选择年级并完成引导。免费练习无需登录或购买。
2. Apple 登录独立路径：我的 → 账号 → 登录/注册 → Continue with Apple。首次授权可以等待后完成；取消应直接返回，屏幕没有错误。
3. 订阅路径：我的 → 账号 → 使用审核账号登录。向下滚动至会员，等待 StoreKit 返回本地化名称、价格和每月周期。暂时不可用时使用“重试”，或者离开后再次进入账号页。
4. 使用 Sandbox 完成月订；服务器绑定成功后应显示有效会员。取消不应显示错误。已有购买使用“恢复购买”，保持原星芽账号。
5. 购买后可在账号页执行“立即同步”；家长中心内的远程 AI 家长总结应明确显示远程来源。它们仍需真实后端端到端验证，不能用本地分析充当远程结果。
6. 会员区提供恢复、管理订阅、自动续订说明、隐私政策及 Apple Standard EULA。删除星芽账号不会取消 Apple 订阅。

只有上述真机与 Sandbox 证据补齐后，才能把外发审核备注写成“已实测通过”。英文草稿见 `ios/asc-release-assets/REVIEW_NOTES.md`。
