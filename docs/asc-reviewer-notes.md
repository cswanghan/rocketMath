# 星芽 1.0.0 (6)：Issue #2 修复与审核说明草稿

更新：2026-11-17（Asia/Shanghai）。**未部署、未上传、未重新提审；本稿不是已通过验收的声明。**

## 依据与源码

- [Issue #2](https://github.com/cswanghan/rocketMath/issues/2)：1.0.0 (5) 于 11 月 16 日因 Guideline 2.1(a) Apple 登录错误、2.1(b) IAP “Item Unavailable” 再次被拒。
- 已读取[最新评论](https://github.com/cswanghan/rocketMath/issues/2#issuecomment-6934156190)。评论记录 11 月 17 日 ASC 只读检查：协议有效，银行/税务无待办，月订在 175 个地区（含美国）可用、US $2.99/月，状态为 Ready for Review；当前不在任何提交中。这是评论中的检查结果，不是本次重新访问 ASC 的结果，也不等于商品已批准或 Sandbox 实测通过。
- 本地实际实现为原生 SwiftUI / AuthenticationServices / StoreKit 2，后端为 Cloudflare Pages Functions，不是远端 Capacitor 壳。源码已先以 `75acdc9` 独立保存，包含此前未提交的本地修改。依赖、缓存、凭据、归档、测试结果包与临时日志未纳入提交，原本地文件保留。审核草稿中的密码已脱敏。
- 起始 Xcode 项目版本仍为 build 3，本仓库本地归档也不能证明与审核中的 build 5 二进制完全一致。因此以下根因是对**本地最新源码**确认的问题，未把它描述成对 Apple 审核环境的现场复现。修复后 App Debug/Release 构建号均为 **6**，版本保持 1.0.0。
- 现有练习引擎修改仅保留在源码恢复提交中；Issue #2 修复不改练习引擎。

## 已定位的问题与修复

### Apple 登录

1. 服务端挑战在展示 Apple 授权界面之前创建，却只有 300 秒有效期；慢速首次授权可能在回调时被拒。改为 30 分钟、每次请求新 nonce/challenge，仍执行原子单次消费、防重放、签名、audience、nonce 和 token 到期验证。
2. 移除客户端依赖设备时钟的提前到期判断，以及服务端独立于 token `exp` 的 10 分钟 `iat` 年龄限制。授权控制器、来源窗口和当前 state 在等待及前后台切换期间保持；缺省的可选 state 允许通过，明确不匹配的 state 仍拒绝，旧/重复回调不会完成新请求。Apple 凭据不写入持久存储。
3. 取消授权静默返回。验证失败不再一律称为“已失效”。服务端诊断仅记录固定的阶段、原因、HTTP 状态及白名单 Apple 错误码，不记录令牌、授权码、nonce、用户资料、密钥或原始响应。
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

**边界：** 原生生命周期测试使用通知和注入回调；后端延迟测试使用签名 fixture 与模拟 code exchange；商品测试使用本地 `Configuration.storekit` 与注入接口。Apple 真实授权码仍由 Apple 按其有效期验证，本次没有延长它。UI 测试没有按下真实 Apple 授权按钮。这些测试不证明真实 Apple ID、真实 Sandbox、生产部署或审核环境验收。

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

## 待完成验收（未通过、未执行）

- [ ] 真机 iPhone 与 iPad，全新安装、新 Apple 账号，首次授权、延迟数分钟、后台/前台后成功登录；取消无错误。
- [ ] 在审核对应系统（Issue 记录 iPadOS 27.2.1）和真实 App Store/Sandbox 商品目录上验证。Xcode 本地 `.storekit` 配置和注入测试不是该证据。
- [ ] 审核账号 `appstore_review` → 我的 → 账号 → 会员，真实 Sandbox 商品加载、购买、取消、恢复及后端权益绑定；凭据只从 ASC 受控审核信息取用。
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
