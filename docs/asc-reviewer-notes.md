# 星芽 1.0.0 (6)：Issue #2 修复与审核说明草稿

更新：2026-11-17（Asia/Shanghai）。**未部署、未上传、未重新提审；本稿不是已通过验收的声明。**

## 依据与源码

- [Issue #2](https://github.com/cswanghan/rocketMath/issues/2)：1.0.0 (5) 于 11 月 16 日因 Guideline 2.1(a) Apple 登录错误、2.1(b) IAP “Item Unavailable” 再次被拒。
- 已读取[最新评论](https://github.com/cswanghan/rocketMath/issues/2#issuecomment-6934156190)。评论记录 11 月 17 日 ASC 只读检查：协议有效，银行/税务无待办，月订在 175 个地区（含美国）可用、US $2.99/月，状态为 Ready for Review；当前不在任何提交中。这是评论中的检查结果，不是本次重新访问 ASC 的结果，也不等于商品已批准或 Sandbox 实测通过。
- 本地实际实现为原生 SwiftUI / AuthenticationServices / StoreKit 2，后端为 Cloudflare Pages Functions，不是远端 Capacitor 壳。源码已先以 `75acdc9` 独立保存，包含此前未提交的本地修改。依赖、缓存、凭据、归档、测试结果包与临时日志未纳入提交，原本地文件保留。审核草稿中的密码已脱敏。
- 起始 Xcode 项目版本仍为 build 3，本仓库本地归档也不能证明与审核中的 build 5 二进制完全一致。因此以下根因是对**本地最新源码**确认的问题，未把它描述成对 Apple 审核环境的现场复现。修复后 App Debug/Release 构建号均为 **6**，版本保持 1.0.0。
- 现有练习引擎修改仅保留在源码恢复提交中；Issue #2 修复不改练习引擎。

## 已定位的问题与源码修复

以下后端修复尚未部署。真机继续使用当前线上旧后端；不能将源码或本地回归结果写成线上修复已生效。

### Apple 登录

1. 服务端挑战在展示 Apple 授权界面之前创建，却只有 300 秒有效期；慢速首次授权可能在回调时被拒。后端源码改为 30 分钟、每次请求新 nonce/challenge，仍执行原子单次消费、防重放、签名、audience、nonce 和 token 到期验证；本轮线上探测仍为 300 秒。
2. 移除客户端依赖设备时钟的提前到期判断，以及服务端独立于 token `exp` 的 10 分钟 `iat` 年龄限制。授权控制器、来源窗口和当前 state 在等待及前后台切换期间保持；缺省的可选 state 允许通过，明确不匹配的 state 仍拒绝，旧/重复回调不会完成新请求。Apple 凭据不写入持久存储。
3. 取消授权静默返回。新源码中的验证失败不再一律称为“已失效”。待部署的服务端诊断仅记录固定的阶段、原因、HTTP 状态及白名单 Apple 错误码，不记录令牌、授权码、nonce、用户资料、密钥或原始响应；线上旧后端仍返回旧文案。
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
| `npm run build` | Vite 构建通过，未部署 |
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

当前尚无成功 Sandbox 购买、购买后服务端权益绑定、恢复购买、购买页取消或离线启动保持登录及免费练习的真机结论。用户表示 Sandbox 账号已在设备登录，但本轮查看的 ASC 团队 Sandbox 测试员列表为空；账号团队归属、设备实际交易环境仍待核实，不能标记为已验证。审核账号登录及后续验收仍在进行，可在取得新证据后增补，不记录账号密码。

线上只读诊断确认：

- 单次无凭据 Challenge 探测返回 HTTP 200，实际 TTL 为 **300 秒**。本地 1800 秒修复尚未上线，6 分钟后才完成授权的成功验收目前受旧后端限制。
- 生产部署列表的最新记录显示“3 days ago”，分支 `main`、来源提交 `2a02449`。它是此前含未提交源码的上传来源标记，不能证明与该 Git 提交或本地恢复源码逐字一致；也不是当前修复提交的部署证据。
- 核对生产 D1 绑定后，仅查询最近 20 分钟的时间桶与消费计数：09:32、09:34、09:37、09:38 共 **6 条 Challenge，已消费均为 0**。未读取 ID、nonce/hash、用户信息或令牌。结合恢复的旧版处理顺序，只能将失败范围缩小到成功消费挑战／授权码交换之前；无法确定具体是请求、身份 claims、nonce、JWKS 网络或 Challenge 校验失败。该聚合不是逐请求跟踪，旧版错误文案也不是精确原因。
- 诊断脚本默认 User-Agent 曾被 Cloudflare 1010（browser signature banned）拒绝；浏览器 User-Agent 可访问。该脚本限制不能当作原生 iPhone 或地区被阻止的证据。

本地真机记录与截图保存在 `/tmp/rocketmath-issue2-device/`，未加入 Git；本文不包含私人设备标识或凭据。**Apple 登录当前仍为失败，不能声明完整修复或端到端验收通过。**

## 待完成验收（未完成或失败）

- [ ] 真机 iPhone 与 iPad，全新安装、新 Apple 账号，首次授权、延迟数分钟、后台/前台后成功登录。当前 iPhone 在位升级路径取消已通过，实际授权与即时重试仍失败；真机 iPad 未验证。
- [ ] 在审核对应系统（Issue 记录 iPadOS 27.2.1）验证完整路径。当前 iPhone 真实商品目录加载已通过，不等于审核设备或 Sandbox 交易验收；Xcode 本地 `.storekit` 配置和注入测试也不能代替它。
- [ ] 审核账号 `appstore_review` → 我的 → 账号 → 会员，确认实际 Sandbox 账号/交易环境，完成购买、取消、恢复及后端权益绑定；凭据只从 ASC 受控审核信息取用。
- [ ] 真机离线重启保持登录，免费练习仍可用。
- [ ] 在后续单独授权的发布流程中部署对应后端，核实线上配置、数据库迁移与诊断；本次未部署，不能声称线上已修复。
- [ ] 后续重新确认 ASC 协议/税务/银行/美国 storefront，以及订阅状态，并将订阅与 build 6 同时加入新提交；本次未进行此操作。

## 审核路径草稿

1. 首次启动选择年级并完成引导。免费练习无需登录或购买。
2. Apple 登录独立路径：我的 → 账号 → 登录/注册 → Continue with Apple。首次授权可以等待后完成；取消应直接返回，屏幕没有错误。
3. 订阅路径：我的 → 账号 → 使用审核账号登录。向下滚动至会员，等待 StoreKit 返回本地化名称、价格和每月周期。暂时不可用时使用“重试”，或者离开后再次进入账号页。
4. 使用 Sandbox 完成月订；服务器绑定成功后应显示有效会员。取消不应显示错误。已有购买使用“恢复购买”，保持原星芽账号。
5. 购买后可在账号页执行“立即同步”；家长中心内的远程 AI 家长总结应明确显示远程来源。它们仍需真实后端端到端验证，不能用本地分析充当远程结果。
6. 会员区提供恢复、管理订阅、自动续订说明、隐私政策及 Apple Standard EULA。删除星芽账号不会取消 Apple 订阅。

只有上述真机与 Sandbox 证据补齐后，才能把外发审核备注写成“已实测通过”。英文草稿见 `ios/asc-release-assets/REVIEW_NOTES.md`。
