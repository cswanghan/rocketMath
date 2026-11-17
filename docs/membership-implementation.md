# 星芽 1.0 月订阅实现记录

## 2026-11-10 协调进程核实的 ASC 状态（本轮未访问 ASC）

本节事实来自用户转述的协调进程浏览器核验；不是本次代码检查推断，也不是本轮 API 查询。下文各历史阶段的实现/测试记录保留；最新完整 scheme 与付费墙专项状态见文末「付费墙截图测试与可用性收尾」。

| 项目 | 精确状态 |
| --- | --- |
| 应用 | 星芽；Apple ID `6793418759`；Bundle `com.hanwang.xingya` |
| 已提交旧版本 | iOS 1.0.0 **build 1**：Rejected / Unresolved Issues；最近反馈 7 月 29 日，Guideline **2.3 Accurate Metadata**，尚无开发者回复 |
| 拒审原因 | 找不到元数据所描述的高级会员云同步增强和 AI 家长总结。新版本必须实际交付并可演示，不能以占位或本地分析代替远程结果 |
| 订阅组 | `22563981`（真实 ASC 组 ID，不是本地 StoreKit 配置内的模拟组编号） |
| 商品 | `com.hanwang.xingya.premium.monthly`；Apple ID `6832887439`；一个月自动续订；**Prepare for Submission**，尚未提交 |
| 价格及本地化 | 中国大陆基准价 **CNY 18.00 已保存**；其他地区由 Apple 自动换算；中英文已保存；本地 `.storekit` 的 18 仍仅本地示例，两者都不代表已获批上架价 |
| 共享/优惠 | 家庭共享关闭，无介绍优惠 |
| 可用性 | 订阅 **175/175，包含中国大陆**；应用本身 175/175。协调进程已确认地区配置纠正；商品尚未提交/批准，真实 Sandbox 加载/购买未验证，不能据此声称可售 |
| 审核材料 | 商品审核截图缺失；订阅尚未提交；真实 Sandbox 商品加载/购买未验证 |
| 协议/银行税务 | Paid Apps 协议、银行与税务均为 Active；不等于商品已批准或已可售 |
| 新源码版本 | App Debug/Release：1.0.0 **build 2**；协调进程已完成 iPhone/iPad 全量 scheme 测试并通过；未归档/上传，旧 Archive 保持不动 |

[已核实商品页（仅供人工导航，本轮未打开）](https://appstoreconnect.apple.com/apps/6793418759/distribution/subscriptions/6832887439)

后端会员校验与 AI 服务仍未部署，审核路径尚不能宣称已实测成功。导航和证据草稿见 `docs/asc-reviewer-notes.md`，仅文档，未发送回复或邮件。


2026-11-10；当前工作树 `feat/ios-native-app` / `2a02449`。政策已批准：仅 `com.hanwang.xingya.premium.monthly` 一个月自动续订；口算/练习免费且可离线；云同步、AI 家长总结为会员权益。协调进程已核实 ASC 中国大陆基准价 CNY 18.00 已保存（其他地区由 Apple 自动换算）；本地 StoreKit 18 仍仅示例。商品 Prepare for Submission，缺审核截图、尚未提交，订阅可用性已纠正为 175/175、包含中国大陆，真实 Sandbox 加载/购买未验证；不是已批准或购买已就绪。

## 实现前确认的绑定与迁移边界

旧版本购买没有 appAccountToken，现已确认唯一月订为 Prepare for Submission、尚未提交；是否有需要恢复的既有测试/历史购买仍须核实。不能把“谁先提交 transaction ID”当作所有权证明。本轮不自动认领无 token 的历史交易，不覆盖 Apple 已有 token，也不迁移本机学习数据。历史交易若缺少或不匹配当前账号 token，将明确拒绝自动绑定并提示保留购买、恢复原账号，不能建议再次付费解决。若确有历史付费用户，须在上线前制定可核验的人工恢复/迁移流程；当前没有可用人工联系方式，不虚构联系渠道。

服务端为已批准的原生登录账号生成稳定随机 UUID，购买传给 Apple，只有 Apple 官方 API 返回匹配该 UUID 的月订交易才能绑定。绑定记录保留到软删除账号之后，防止同一交易被重新认领；软删/撤销账号无权使用接口。此留存范围需与隐私文案一致。

## 共享路由边界

Web 家长页 `src/ui/ParentDashboard.tsx` 匿名调用 `/api/summarize`；原生将使用 `/api/native/summarize`，强制服务端会员校验。现有公开 Web AI 路由不能靠 Origin/User-Agent/自报平台安全区分真实浏览器与外部客户端。为遵守“不改变 Web 免费能力”，保留公开 Web 路径；不把它当作原生接口的验证回退。攻击者仍可能直接利用公开 Web AI，这一政策/防滥用边界尚未解决，不能声称已杜绝跨客户端使用。进度 `/api/progress/sync` 在当前工作树仅发现原生调用方，将对读写均强制会员校验。

原同步文件的旧注释曾称“iOS / Web 共用”，但当前仓库的实际业务调用仅来自 `ios/Xingya/Network/ProgressSync.swift`；Web 家长总结调用在 `src/ui/ParentDashboard.tsx:43`，与同步无关。未发现本仓小程序同步调用；没有调查其他工作区。**部署前仍须确认是否有仓库外消费者**，不能把本仓无调用等同于所有外部客户端都不存在。同步没有基于“Web”header 的豁免，也没有另留一个可绕过校验的免费同步入口。

## 本轮实际实现

### 客户端

- `StoreKitService.refreshEntitlements()` 从 `Transaction.currentEntitlements` 重建集合；只有已验证、未撤销、未升级替代且 product ID 匹配唯一月订的项可留下。启动、前台恢复、交易更新和用户刷新均会重新计算，不再只 insert。Apple 当前权益序列包含适用的账单宽限期，不能只看原交易到期时间把宽限期误删。[Apple currentEntitlements](https://developer.apple.com/documentation/storekit/transaction/currententitlements)
- 本地 `isPremium` 只表示发现 Apple 本地权益。云服务 UI 判断使用服务端成功响应、当前原生账号/会话和有效截止时间；服务器每次付费请求仍独立复核。客户端内存布尔值不构成服务端授权。
- 购买前先获取服务端为当前登录账号分配的稳定 UUID，通过 `.appAccountToken(...)` 传给 Apple；配置缺失、数据库不可用、退出/切换账号时，不继续开购买面板。配置预检能检查配置完整性及私钥格式，**不能代替真实 Sandbox 对密钥权限/商店目录的核验**。[Apple appAccountToken](https://developer.apple.com/documentation/storekit/product/purchaseoption/appaccounttoken(_:))
- 购买成功须通过本地验证及服务器绑定后才 `finish()`。绑定失败保留可重试的未完成交易；刷新/恢复重新核验并绑定后可完成属于该 UUID 的交易。未验证、其他商品或其他账号交易不会按当前账号完成。
- 区分处理中、取消、pending、购买成功、恢复成功、无可恢复购买和错误。购买/恢复期间禁止重叠操作。目录失败不阻止本地权益重建；空目录显示当前不可用/需核对配置，不再作为“即将上线即可首发”的交付方案。
- `XingyaApp` 在前台刷新，随登录 token 变化重新连接会员状态；异步响应按会话、账号及刷新版本丢弃过期结果。退出/换账号不删除本机学习记录。
- 同步和 AI 在序列化/发送学习数据前，先检查 `SyncOwnership`，再请求服务端当前会员状态，并在网络等待后复查会话和归属。非会员不上传学习数据。同步响应仍有原来的迟到响应保护；AI 失败只回退免费本地分析，绝不回退到匿名 Web AI 路由。
- 会员区展示 StoreKit 返回的商品名、描述、价格；只展示周期确为一个月的自动续订商品，并显示每月周期、自动续订说明、恢复购买、Apple 管理订阅链接及[Apple 标准 EULA](https://www.apple.com/legal/internet-services/itunes/dev/stdeula/)。中文与既有英文商品名/描述保持，补充英文权益及续订说明。没有在 UI 写死人民币 18 元或声称价格已获批。

主要入口：`ios/Xingya/Store/StoreKitService.swift`、`MembershipState.swift`、`Views/MembershipSection.swift`、`Network/ProgressSync.swift`、`Network/SummarizeClient.swift`。核心口算/练习引擎、本机数据库及归属标记没有迁移或删除。

### 服务端可信边界

选择的是 **App Store Server API 在线查询方案**，不是客户端提交 JWS 后直接解码信任，也不是接受客户端 `isPremium`/平台 header。

1. `getRequestUser` 仍验证 JWT 和数据库中的 `approved` 状态。新路由与同步均保留此检查；慢速 Apple 请求之后再次检查，写绑定及同步 SQL 也约束当前账号状态。
2. 服务端用加密环境变量中的 P-256 私钥生成 ES256 API JWT，包含 `iss`、`kid`、`aud=appstoreconnect-v1`、`bid=com.hanwang.xingya`，有效期五分钟。调用固定 Apple HTTPS 主机的 `/inApps/v1/subscriptions/{transactionId}`；只接受数字交易 ID，每次请求十秒超时；使用 `redirect: 'manual'`，仅跟随允许的两个 Apple origin 一次，具体边界见文末。不接受客户端指定的主机或环境。[Apple API JWT](https://developer.apple.com/documentation/appstoreserverapi/generating-json-web-tokens-for-api-requests)、[Get All Subscription Statuses](https://developer.apple.com/documentation/appstoreserverapi/get-all-subscription-statuses/)
3. **交易载荷的真实性来源是直接向 Apple 发起的已认证 HTTPS 查询及 TLS 响应。** 私有解码函数仅解析该响应中的 JWS 字段，并检查格式/ES256 标记，不是独立的 JWS 证书链验签器；绝不用于客户端、通知推送或任意第三方传来的 JWS。此实现没有通知接收接口，也不声称完成了离线 JWS 验签。若未来新增推送/离线验证，必须另加 Apple 证书链/签名验证，不能复用这个解码器作授权。
4. 核对顶层和交易 Bundle、环境、唯一 product ID、自动续订类型、原交易编号、购买所有权（非家庭共享）、Apple 返回的 appAccountToken；与服务端当前账号 UUID 不一致或缺失则拒绝认领。
5. 接受状态 1 且付费期仍有效，或状态 4 且 Apple 返回的宽限期截止时间仍有效；拒绝到期、退款/撤销、升级替代、无宽限期的账单重试、未知状态。取消自动续费不会提前剥夺已付费有效期。[Apple 状态定义](https://developer.apple.com/documentation/appstoreserverapi/status)
6. `/api/native/membership` GET 返回稳定账号 UUID 和经复核的会员状态；POST 接受交易编号，完成验证及持久绑定后才返回 `ok: true, active: true`。响应禁用缓存。原交易编号在同一环境内唯一，不能并发绑定到两个账号。同一账号再次购买产生新原交易编号时，可凭相同的 Apple 账号标记更新绑定；不覆盖 Apple 的 token。
7. `/api/progress/sync` GET/POST、`/api/native/summarize` 都实时向 Apple 复核绑定。没有正向权益缓存/离线放行；Apple 超时、限流、异常响应或配置/表缺失时失败关闭。代价是多一次以上联网请求和对 Apple 可用性的依赖；免费离线练习不受影响。

错误语义：无效/停用会话 401；无有效会员 403；历史/跨账号绑定不匹配 409；缺少配置、无效私钥格式、Apple/数据库不可用或无法确认响应 503。错误不返回原始 SQL、Apple 认证 token、私钥或上游响应正文。

## 后端迁移与配置步骤（待用户/协调进程执行，本轮未部署）

### D1 与 Functions

1. 确认实际 Pages 项目及其 `DB` 绑定；区分 Production 和 Preview，核实当前数学进度表及此前可靠性修复已部署。不得对别的产品数据库执行 SQL。
2. 对对应 D1 **增量执行** `src/db/migrations/native_membership.sql`，新增 `native_subscription_accounts`、`native_subscription_bindings` 两张表；不重建用户/进度表，不回填旧交易，不删除原有数据。现有 `math_progress.sql` 仍是数学接口的前提。
3. 两表按用户保存 UUID，以及按用户/环境保存原始交易编号；`(environment, original_transaction_id)` 唯一。没有持久化完整 JWS 或 Apple API JWT。账号软删后这些不透明关联记录保留，`approved` 检查继续拒绝服务；隐私与账号删除提示已写明这个范围。删除原生账号不会取消 Apple 订阅。
4. 配好下述 secret/变量后，再部署本轮 Pages Functions 与原生新客户端。**本轮没有执行 migration、发布 Functions 或创建 Archive。** 新客户端在旧后端无会员路由时解析失败关闭，不会把 HTML/缺失接口当作成功，也不自动上传数据。
5. 不新增包依赖或 Node 运行时依赖；实现使用 Workers 可用的 Web Crypto、fetch、D1。真实 Pages 环境的互操作性尚待集成验证。

| 名称 | 配置方式与值的含义 | 缺省行为 |
| --- | --- | --- |
| `DB` | 现有 Pages D1 绑定，须含两张新表及现有用户/数学表 | 缺失/表未迁移时拒绝 |
| `JWT_SECRET` | 保持现有登录鉴权 secret 与账号体系，不为会员另造客户端密钥 | 不跳过现有会话/approved 验证 |
| `APPLE_IAP_ISSUER_ID` | 对应开发者团队的 In-App Purchase API Issuer ID，建议按加密变量管理 | 缺失时 503 |
| `APPLE_IAP_KEY_ID` | 对应 **In-App Purchase key** 的 Key ID，建议按加密变量管理 | 缺失时 503 |
| `APPLE_IAP_PRIVATE_KEY` | **加密 secret**：对应 P-256 PKCS#8 私钥完整 PEM，保留真实换行。只在受控配置界面/secret 注入流程中处理，不放仓库、前端变量、日志或本文 | 缺失/格式错误 503；没有调试放行 |
| `APPLE_IAP_BUNDLE_ID` | `com.hanwang.xingya` | 缺失或其他 Bundle 一律 503 |
| `APPLE_IAP_ENVIRONMENT` | 显式配置，线上保持 `Production`；独立测试配置仍可显式使用 `Sandbox`，没有 Sandbox 默认值 | 缺失/未知值一律 503；未知交易在 Production 返回 HTTP 404 且数字或字符串 `errorCode=4040010`、HTTP 401 或 fetch 抛错时查询 Sandbox；已保存绑定按其环境验证，401/fetch 抛错仍失败关闭；上架前取舍见文末 |
| 旧 `APPLE_IAP_SANDBOX_USER_IDS` | 此前按用户 ID 切换环境的路径已移除，源码不再读取该变量；无需创建或填写名单 | 审核/TestFlight 使用 Apple 官方交易环境发现流程，不依赖猜测的审核用户 ID；本轮未操作任何线上变量 |
| `DEEPSEEK_API_KEY` | 沿用既有服务端 AI secret；本轮未读取或更换 | 会员通过后 AI 仍可能因提供方未配置失败，客户端回退本地分析 |

由 Account Holder/Admin 在 Apple 的 **Users and Access → Integrations → Keys → In-App Purchase** 核对/创建合适用途的 key，并确认 Issuer ID、Key ID 和私钥属于同一配置。不能从本机某个文件名推断它可用于该 API。随后在对应 Cloudflare Pages 项目的变量/secret 配置中安全注入，分别核对 Preview/Production，不在命令行输出密钥。本轮仅阅读公开官方文档，没有打开任何私钥文件或访问 ASC 账号。[Apple 官方配置步骤](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/generate-keys-for-in-app-purchases/)

TestFlight/审核版本指向现有正式 API 地址时，服务器配置保持 `Production`，未知交易先查 Production，在 HTTP 404 且数字或字符串 `errorCode=4040010`、HTTP 401 或 fetch 抛错时查 Sandbox；401 与 fetch 抛错是上架前的发现兼容路径，不表示交易未找到或校验成功，取舍见文末。须取得 **Apple Sandbox 返回的有效订阅**并匹配当前原生账号的 appAccountToken；不依赖审核用户名单或客户端环境开关。Sandbox 只表示测试权益，不代表生产付款；它可用于测试现有会员同步/AI 路径，但响应和已有原生 UI 必须保留测试标识。不要用个人真实 Apple ID/资金测试。

### 回滚与兼容风险

- 迁移只有加表，旧学习数据保持；回滚代码时不要顺手删表，否则会丢掉订阅账号关联并卡住已有购买。
- 回滚到旧同步/旧原生 AI 客户端会恢复无会员强制的旧行为，是安全/商业策略回退，不能作为无风险发布回滚。特别是旧原生客户端仍可直接调用公开 Web AI。
- 当前客户端只支持一个月订，不改变本地数据集；付费账号 B 仍不能自动使用/上传账号 A 归属的本机数据。购买前账号页已展示归属限制；跨账号迁移仍未实现。
- 无账号标记的历史交易、购买绑定到错误原生账号、账号删后重新注册，均不能自动转移；不修改 Apple 的 appAccountToken，也不做“先来先得”抢绑。须先核实真实历史用户并制定恢复流程再发布；无人工联系渠道仍是支持阻断项。

## 三种测试环境与真实核验状态

| 环境 | 本轮完成 | 不代表什么 |
| --- | --- | --- |
| 本地 Xcode StoreKit 配置 | 保留共享 scheme 的本地文件、唯一月订和示例 18；没有改商品 ID、加新档位、优惠或家庭共享 | 模拟购买不能通过 Apple Server API，不授予真实云端会员；本轮未实际点击购买 |
| 自动化测试桩 | 本地 HTTP 桩覆盖服务端查询结果和客户端成功/失败语义；测试用私钥只在内存临时生成，用于验证我们发出的 ES256 JWT | 响应载荷是明确标注的 unsigned fixture，不是 Apple 签名验证成功，也不是 Sandbox 购买 |
| 真实 Sandbox / TestFlight | **商品加载/购买仍未验证**；ASC 商品已创建但尚未提交，仍需正确 key、已部署会员后端及专用测试账号 | 不是生产扣款；已创建不代表商店可返回商品，尤其不能声称中国大陆已就绪 |
| 生产 | **后端未部署，商品未提交/未批准**；ASC 中国大陆基准价 CNY 18.00 已保存 | 订阅可用性 175/175、包含中国大陆；地区配置不等于可售或审核通过，不能据本文上传审核 |

TestFlight 和开发测试环境的区别见 [Apple Sandbox 测试说明](https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox)。现有隐私/支持 URL 均保持原路径，**线上可达性待核验**；没有声称已发布，没有编造邮箱/联系人。

## 上一轮会员实现测试记录（保留）

以下为上一轮会员实现结束时的检查结果；本次增量结果另附于文末。早期新增测试的括号/fixture 外键问题及导入问题已经修正；没有保留忽略失败的测试或 skip。

| 命令/检查 | 结果 |
| --- | --- |
| 根目录 `npx tsc --noEmit` | **退出码 0** |
| 根目录 `npm test -- --reporter=dot` | **退出码 0；8 个文件、149 项测试全部通过**。其中新增会员后端回归 32 项，原账号可靠性 21 项仍通过 |
| `xcrun swiftc -frontend -parse`（本轮修改/新增的 Swift 源码及测试） | **退出码 0**；仅语法解析，不等同于完整编译/运行 |
| 下方独立会员核心编译 + 执行 | **编译和执行均退出码 0；18 项检查通过**，不访问真实网络/钥匙串/用户库 |
| 包含 `StoreKitService` / `AuthSession` 的 `swiftc -typecheck` | **退出码 1**：`sandbox-exec: sandbox_apply: Operation not permitted`，Observation 宏插件无法启动。最后一次诊断有 59 条宏错误、没有其他类别错误；仍不能据此宣称完整类型检查成功。未关闭宏沙箱或其他安全限制 |
| `Xingya` scheme / iPhone、iPad 模拟器 | **本轮未运行**，交协调进程在沙箱外用隔离 DerivedData 执行 |

独立核心命令（输出只写 `/tmp`）：

```sh
xcrun swiftc -swift-version 5 -parse-as-library \
  -module-cache-path /tmp/xingya-membership-module-cache \
  ios/Xingya/Network/APIClient.swift ios/Xingya/Store/MembershipState.swift \
  ios/tools/check-membership-core.swift -o /tmp/xingya-membership-core-check
/tmp/xingya-membership-core-check
```

新增 `XingyaTests/MembershipTests.swift` 的 **10 个 Swift Testing 用例**覆盖：重建/撤销/白名单、当前宽限期与截止时间、恢复成功/无购买/失败、恢复串行、模拟/离线不能解锁云端、历史/跨账号不自动认领、迟到响应与付费账号 B 的本机归属限制、成功结构校验、非会员不上传数据、AI 不走匿名 Web 回退。项目使用文件系统同步分组，新增文件在现有 `XingyaTests` target 中，无新 scheme。

原 `AccountReliabilityTests.staleSyncResponse` 增加了会员预检响应及“确已发送同步”的断言，仍实际测试退出后丢弃同步响应，未被前置会员失败掩盖。服务端原删除/回滚测试使用内存 SQLite 与受控 Apple HTTP 桩；增加了软删保留不透明购买关联但不能继续访问的断言。

## 协调进程 / 用户下一步核对清单

1. **源码构建与 UI**：协调进程已在沙箱外完成 iPhone/iPad 完整 `Xingya` scheme，各 44 项 Swift Testing + Playthrough 通过（见文末结果路径）。本次只需重跑修正后的付费墙截图测试并导出新截图；使用新目录，不覆盖旧 `ios/build` / `ios/store` 或成功结果包。付费墙的长文案、恢复/管理入口由该专项测试继续核验。
2. **ASC 后续核对**：协调已确认 App Apple ID `6793418759`、Bundle `com.hanwang.xingya`、订阅组 `22563981`、商品 Apple ID `6832887439`、唯一月订 ID、已保存 CNY 18.00 基准价和中英文。本轮不再查询 ASC；订阅可用性现已纠正为 175/175、包含中国大陆；后续由协调进程补齐审核截图，再验证真实 Sandbox 商品加载/购买。不得据已保存配置推定可售/批准。
3. **后端先决条件**：正确 D1、新表、登录 secret、Apple IAP key 权限/Bundle/环境、AI secret；正常账号与专用 Sandbox 账号分离。实际验证有效订阅得到会员，未配置/撤销/过期/伪造状态均拒绝；使用测试数据验证数据不串账号。
4. **真实 Sandbox**：购买、取消、pending→批准、恢复有/无购买、重启/前台、退款/撤销、到期、取消续费但仍有效、账单重试及已配置的宽限期、目录为空/网络失败、换原生账号。确认错误后不重复收费、不清本机数据，会员只在 Apple 复核后生效。是否配置宽限期由已有商店状态决定；代码支持，不在本轮替用户开启商店开关。
5. **历史与共享边界**：先核实是否已有无 appAccountToken 的真实订阅；确认旧客户端/仓库外调用方及公开 Web AI 风险的处理方案。若要求彻底禁止跨客户端利用公开免费 Web AI，须另行明确 Web 身份/服务边界或防滥用方案；不能靠平台 header 达成。
6. **隐私和支持**：浏览器核对原 `privacy.html`、`app-support.html` 实际可达、部署文案与订阅留存范围一致；补充真实人工支持渠道。核对 EULA/管理订阅打开正确系统页面。截图使用演示或空状态，不出现真实邮箱、token、孩子真名或购买编号。

可交给协调进程的命令（本轮未执行）：

```sh
MEMBERSHIP_TEST_DIR=$(mktemp -d /tmp/xingya-membership-tests.XXXXXX)
xcodebuild -project ios/Xingya.xcodeproj -scheme Xingya \
  -destination 'platform=iOS Simulator,id=01B48858-AE3E-454E-8BBD-E35A02045807' \
  -derivedDataPath "$MEMBERSHIP_TEST_DIR/DerivedData-iPhone" \
  -resultBundlePath "$MEMBERSHIP_TEST_DIR/iPhone.xcresult" test
xcodebuild -project ios/Xingya.xcodeproj -scheme Xingya \
  -destination 'platform=iOS Simulator,id=C5A5AA58-6D6B-49E8-8D74-6718787092D8' \
  -derivedDataPath "$MEMBERSHIP_TEST_DIR/DerivedData-iPad" \
  -resultBundlePath "$MEMBERSHIP_TEST_DIR/iPad.xcresult" test
```

这些是先前协调进程提供的设备 ID，若设备发生变化应先核对目的地；命令不归档、不上传。

## 本轮文件清单

以下包含在已有未跟踪文件上继续修改的文件，不等于整个脏工作树清单。

| 范围 | 新增 | 修改 |
| --- | --- | --- |
| 服务端 | `src/apple-subscriptions.ts`；`src/native-membership.ts`；`functions/api/native/membership.ts`；`functions/api/native/summarize.ts`；`src/db/migrations/native_membership.sql` | `functions/api/progress/sync.ts` |
| 原生会员与入口 | `ios/Xingya/Store/MembershipState.swift`；`ios/Xingya/Views/MembershipSection.swift` | `ios/Xingya/Store/StoreKitService.swift`；`ios/Xingya/XingyaApp.swift`；`ios/Xingya/Views/AccountView.swift`；`ios/Xingya/Views/ParentDashboardView.swift`；`ios/Xingya/Network/ProgressSync.swift`；`ios/Xingya/Network/SummarizeClient.swift` |
| 测试/本地检查 | `src/native-membership.test.ts`；`src/test-support/apple-fixture.ts`；`ios/XingyaTests/MembershipTests.swift`；`ios/tools/check-membership-core.swift` | `src/account-reliability.test.ts`；`src/test-support/sqlite-d1.ts`；`ios/XingyaTests/AccountReliabilityTests.swift` |
| 文档/披露 | `docs/membership-implementation.md` | `ios/APP_STORE.md`；`ios/ASC_SUBMIT.md`；`public/privacy.html`；`public/app-support.html` |

没有修改本地 `.storekit` 价格或商品配置、现有 Web AI handler、Web 产品代码、核心练习门闸或其他 worktree。保留已有可靠性修改和所有脏/未跟踪工作。没有 git 写操作、部署、ASC 查询/写入、真实购买、Archive 创建/上传或覆盖旧测试产物/截图/备份。

操作记录：没有打开私钥文件、钥匙串或 `.wrangler` 内容。一次读取上架文档邻近段落时意外输出了既有审核密码，已在对话中说明；未使用该值，本文不收录，后续仅作精确替换和不输出正文的核验。不把此轮描述成从未出现凭据输出。

外部目标目录不在本轮可写根目录，因此报告实际路径是 `/Users/hanwang/Documents/workspaces/rocketMath/docs/membership-implementation.md`。**源码与测试已实现；已吸收协调核实的 ASC 配置事实，完整 iPhone/iPad scheme 已由协调进程验证通过；后端部署、真实 Sandbox、付费墙截图及上述迁移/共享路由限制仍未全部验证或解除，不能声称可以上传审核。**

## 本次增量：build 2、已核实 ASC 事实及 2.3 审核材料

本节是在上述会员实现上的 follow-up；保留原实现、测试、迁移、共享路由和历史风险记录，没有重写验证架构或商品 ID。当前 ASC 配置以文首的协调核验事实表为准，不再笼统表述为“目录全部未知”。本轮没有再查询 ASC，也没有发送审核回复或邮件。

### 版本与文案的实际改动

- `ios/Xingya.xcodeproj/project.pbxproj`：仅 App target 的 Debug/Release `CURRENT_PROJECT_VERSION` 从 1 改为 **2**，`MARKETING_VERSION` 保持 **1.0.0**，Bundle 保持 `com.hanwang.xingya`。App 使用 `GENERATE_INFOPLIST_FILE=YES`，构建时由配置生成 `CFBundleVersion=2`；源码中不存在待同步编辑的独立 App Info.plist。测试 target 的原版本设置保持原样。**没有生成/修改任何 Archive，不能把旧 Archive 说成 build 2。**
- `SummarizeClient.sourceLabel(_:)` 与家长面板统一使用 **“远程 AI 家长总结” / “本地免费分析”** 两种结果来源标签，并为来源添加 `parent-summary-source` 可访问性标识。非有效远程结果的 fallback 明示“远程 AI 未返回有效结果”；会员标记、按钮名和本地统计不算远程成功证据。导航提示纠正为实际的「我的 → 账号 → 会员」。
- `AccountView` 成功提示改为“已同步 · 服务端合并结果已应用：N 条学习记录，另含经验与手速阈值”，准确描述已经收到并应用的合并快照。没有增加假的同步开关或虚构独立拉取按钮。
- `ios/APP_STORE.md`、`ios/ASC_SUBMIT.md` 更新为现有 App/订阅的核对流程，加入已保存价格、状态、地域限制、协议状态和 build 1 的拒审事实；不再把已创建商品写成未创建，也不把已保存价格写成已批准售价。营销承诺明确区分会员远程 AI 与免费本地分析。
- 新增 [审核导航与证据草稿](asc-reviewer-notes.md)：按当前 Tab、账号/家长中心及 PIN 流程编写，含同账号两台专用设备验证同步、如何辨认远程 AI、恢复/管理订阅/EULA、账号与后端前提以及证据脱敏要求。它是**未发送草稿**，不是已完成审核演示的声明。

App Apple ID 已记录为 **6793418759**。现有官方 Server API 查询方案使用 Bundle ID 进行 JWT/API 校验，本次不需要为这个数字新增 secret、非官方 API 或改变验签方案；若后续官方验证接口需要应用 Apple ID，应使用这个已核实值。

### 两项会员功能是否真实可测：本次源码复核

| 功能 | 源码中的真实路径 | 结论与限制 |
| --- | --- | --- |
| 云同步 | `AccountView.syncNow()` → `ProgressSync.sync()` → 会员/归属预检 → POST `/api/progress/sync` → D1 batch 合并及 `loadAll` 回传 → `ProgressSync.apply()` | 已有真实请求/写入/回传逻辑，不是占位开关。现有 UI 的「立即同步」同时上传和接收合并快照；`pull()` GET 逻辑存在但无独立 UI 按钮。后端未部署，真实跨设备演示待做。 |
| 远程 AI | `ParentDashboardView.generateSummary()` → `SummarizeClient.summarize()` → 会员/归属预检 → POST `/api/native/summarize` → 服务端会员校验 → 共享远程 AI 生成器 | 只有成功 HTTP、可解析且非空的远程 `summary` 返回值才产生内部 `source="AI"`，UI 将其显示为“远程 AI 家长总结”。缺配置、网络失败、HTML、空摘要/非成功状态均不能产生该标签。没有把本地文案当远程结果的既有漏洞；本轮进一步强化了可见标签并补证据测试。后端/AI secret 未部署验证，不能说已实际可用。 |

本轮没有修改共享 Web AI handler、Web 定价、会员权益规则、商品目录或本地学习存储；之前记录的公开 Web 路径边界仍保留。

### 本次实际验证（与上一轮记录分开）

| 检查 | 本次结果 |
| --- | --- |
| `npx tsc --noEmit` | **退出码 0** |
| `npm test -- --reporter=dot` | **退出码 0，8 个文件、149 项测试通过**；既有会员后端 32 项、账号可靠性 21 项仍通过 |
| `xcrun swiftc -frontend -parse ios/Xingya/Network/SummarizeClient.swift ios/Xingya/Views/ParentDashboardView.swift ios/Xingya/Views/AccountView.swift ios/XingyaTests/MembershipTests.swift` | **退出码 0**，只证明语法解析，不代表完整 scheme 已编译/运行 |
| `plutil` 解析工程 + Python 配置断言 | **退出码 0**；确认 App Debug/Release 都是 1.0.0 (2)、自动生成 Info.plist、Bundle 未变 |
| 文档静态核验 | **通过（当次记录保留）**；当时核验了三份更新文档及新导航草稿中的 ID、CNY 18.00、Prepare for Submission、地区配置及 Sandbox 限制。地区可用性随后由协调进程纠正为 175/175、包含中国大陆；当前状态见文首及文末增量记录 |
| Swift 会员单测 | 原 10 项保留，新增 **1 项** `remoteSummaryEvidence`，现共 **11 项**。新用例覆盖真实接口路径下有效摘要与 HTML/空摘要/缺字段/503/断网的标签与正文区别。**本次未运行 Swift 测试 target**，待协调进程在沙箱外运行 |
| 完整 iPhone/iPad scheme、真实 Sandbox、Archive | **本次均未运行**。上一轮宏插件沙箱限制仍适用，本次没有关闭限制或重复宣称类型检查成功；上一轮独立核心 18 项的记录保留，不算作本次重新执行 |

新增 Swift 用例使用注入的 HTTP 桩，不是实际远程 AI 或真实 Sandbox 证据。协调进程应在原有完整 scheme 中运行它，然后使用新的独立产物目录拍摄真实付费墙/同步/远程 AI 证据，不覆盖 `ios/store` 或旧产物。

### 本次改动文件与仍未解除的阻断

修改：`ios/Xingya.xcodeproj/project.pbxproj`、`ios/Xingya/Network/SummarizeClient.swift`、`ios/Xingya/Views/ParentDashboardView.swift`、`ios/Xingya/Views/AccountView.swift`、`ios/XingyaTests/MembershipTests.swift`、`ios/APP_STORE.md`、`ios/ASC_SUBMIT.md`、`docs/membership-implementation.md`。

新增：`docs/asc-reviewer-notes.md`。

当前仍未解除：商品审核截图缺失；商品尚未提交/批准；后端会员校验与 AI 服务未部署；真实 Sandbox 商品加载/购买及两项功能尚未演示验证；新付费墙截图待协调进程完成。更新：订阅地区已为 175/175、包含中国大陆，完整 build 2 iPhone/iPad scheme 已通过，详见文末协调记录。隐私/支持线上可达性、真实人工联系渠道、历史购买恢复和公开 Web AI 边界沿用此前风险记录。

本次未执行 git 写操作、部署、ASC 查询/写入、真实购买或 Archive；未读取私钥、钥匙串或 `.wrangler` 内容，未输出既有审核凭据。已有脏工作、旧截图/Archive/备份均保留。**CNY 18.00 已保存是配置事实，不是批准/可售事实；不能声称本次已解决 2.3 拒审或可以上传审核。**

## 后续编译修复：StoreKitService 的 deinit 隔离（2026-11-10）

协调进程反馈：沙箱外隔离 DerivedData 的 iPhone `xcodebuild` **退出码 65，编译失败，测试未运行**。已记录的错误是 `StoreKitService.swift:49` 的普通 `deinit` 无法访问 MainActor 隔离的 `updatesTask`。原结果包 `/Users/hanwang/Documents/Codex/2026-11-10/xingya-xcode-20261110-161548/iPhone.xcresult` 保持原样；本轮没有覆盖、删除或重新生成它。协调进程另已确认沙箱外 `tsc` 和 **149 项 npm 测试通过**，这不是本轮重新执行的结果。

### 最小修改与原因

仅将 `ios/Xingya/Store/StoreKitService.swift` 中的 `deinit { updatesTask?.cancel() }` 改为 `isolated deinit { updatesTask?.cancel() }`。类已有 `@MainActor` / `@Observable`；显式隔离让析构体在 MainActor 上访问任务属性，保留对象释放时取消 `Transaction.updates` 监听任务的逻辑。没有移除取消操作、改用不安全隔离豁免或关闭并发检查。普通析构不会默认继承类的 actor 隔离；该显式语法由 [Swift SE-0371](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0371-isolated-synchronous-deinit.md) 定义。当最后一个引用在其他执行器上释放时，析构体可能稍后在 MainActor 上执行，不能假设取消在释放语句处同步完成。

已检索原生 Swift 源码和测试中的 `deinit`；仅发现这一处，无其他同类声明需要修改。权益策略、唯一商品 ID、购买/恢复/绑定流程、既有测试断言和版本号 **1.0.0 (2)** 均保持原样。

### 本轮验证及边界

本机工具链为 Apple Swift **6.4**，工程使用 Swift 6 语言模式、默认 MainActor、严格并发检查，App 最低 iOS 17。验证产物仅写到 `/tmp/xingya-deinit-check-eiz0fg6v/`。

| 检查 | 本轮结果 |
| --- | --- |
| 最小编译复现，使用 MainActor 类、计算属性任务句柄模拟 Observable 生成的隔离访问器 | `before.swift` 普通 `deinit` **退出码 1**，复现协调报告的同一错误；`after.swift` 改为 `isolated deinit` **退出码 0**。两者均使用 `xcrun swiftc -typecheck -swift-version 6 -default-isolation MainActor -strict-concurrency=complete`，iPhoneSimulator SDK、`-target arm64-apple-ios17.0-simulator`、独立模块缓存。这是无宏的最小复现，不是完整 App 类型检查。 |
| 最小运行检查 `runtime.swift` | 使用同样 Swift 6 / MainActor / strict 并发参数、`-parse-as-library` 编译 macOS 检查程序，**编译退出码 0、运行退出码 0**。在 detached task 中释放监听对象的最后引用，验证隔离析构最终取消其任务。无 StoreKit、账号、网络或用户数据操作；不等于实际 App 生命周期测试。 |
| `xcrun swiftc -frontend -parse ios/Xingya/Store/StoreKitService.swift` | **退出码 0**，仅语法解析。 |
| 完整 Xingya scheme / Swift 会员测试 | **本轮未运行**，遵照要求交协调进程在沙箱外复编与运行；不关闭宏沙箱限制，不声称完整构建已通过。 |
| `npx tsc --noEmit` / `npm test -- --reporter=dot` | **本轮未重跑**；未修改 TypeScript 或测试断言，以上保留协调进程提供的通过记录。 |

本次改动文件仅为 `ios/Xingya/Store/StoreKitService.swift` 和本报告。没有 git 写操作、部署、ASC 操作、Archive、真实购买或读取密钥；未触碰旧截图/Archive/备份。当次后续安排是由协调进程重新构建并运行现有会员测试及完整 scheme；其后已通过，结果见下节。地区配置也已由协调进程纠正为 175/175、包含中国大陆；商品截图、后端部署及真实 Sandbox 等阻断仍未解除。


## 付费墙截图测试与可用性收尾（2026-11-10）

### 协调进程提供的测试事实

以下成功结果由协调进程在沙箱外取得，本轮未重新运行或覆盖结果包：

| 设备 | deinit 修复后的完整 scheme | 时间（+0800） | 保留的结果包 |
| --- | --- | --- | --- |
| iPhone 17 | **44 个 Swift Testing + Playthrough 通过，TEST SUCCEEDED**；Playthrough 132.915s | 2026-11-10 16:26:57 | `/Users/hanwang/Documents/Codex/2026-11-10/xingya-xcode-20261110-161548/iPhone-after-deinit-fix.xcresult` |
| iPad Pro 13-inch (M5) | **44 个 Swift Testing + Playthrough 通过，TEST SUCCEEDED**；Playthrough 113.649s | 2026-11-10 16:29:44 | `/Users/hanwang/Documents/Codex/2026-11-10/xingya-xcode-20261110-161548/iPad.xcresult` |

随后单独执行的 `PaywallScreenshotUITests` 曾失败：尚在「正在加载 / 验证会员…」时就截取会员区，断言还使用了界面不存在的「Apple 标准许可协议」。实际入口是「使用条款 · Apple Standard EULA」，位于下方列表。失败结果包 `/Users/hanwang/Documents/Codex/2026-11-10/xingya-paywall-screenshots-20261110-163919/iPhone-paywall.xcresult` 及该目录的 `iphone-paywall-account.png` 保持原样；加载中的截图不是 ASC 终稿。本轮只读查看了该截图以核对布局，没有覆盖它。

### 本次最小修改

- 接管并保留协调进程加入的 `ios/XingyaUITests/PaywallScreenshotUITests.swift`；热身 → 我的 → 账号的真实导航及 iPad Tab 唯一叶节点查询保留。
- 在唯一可操作的账号 List 内滚动，等待最多 45 秒：加载提示消失、恢复购买已启用，且出现购买按钮或完整的「订阅商品当前不可用」提示。超时仍失败，不跳过断言。
- 商品分支核对本地配置中的中/英文月订名称、含实际数字的 StoreKit 返回价格及「每月 · per month」周期、当前购买/恢复按钮文案，并检查完整可见。**不写死 18 元，不点击购买/恢复，不发起交易。** 未登录购买按钮可以禁用，这是现有账号绑定策略，不将其作为加载未结束的依据。
- 继续滚动，单独确认完整自动续订说明，以及可用的「管理订阅 · Manage subscriptions」「使用条款 · Apple Standard EULA」。按真实完整文案查询 Link/Button，要求唯一可见目标，不再以任意包含 EULA 的祖先节点代替入口。
- 依次保存 `paywall-account`（商品名、价格/周期、购买和恢复入口）、`paywall-renewal`（自动续订说明）、`paywall-terms`（管理与 EULA）三个 xcresult 截图附件。小屏采用分屏证据，避免把折叠下方内容称为已露出。
- 空目录是明确的失败展示状态，允许测试核验其文案与条款，但附件全部改名为 `paywall-unavailable-*`；它们**不能作为商品加载成功或 ASC 就绪的终稿**。仅商品分支才断言价格，绝不为不可用商品伪造价格。
- 已核对并保留 scheme **TestAction** 对 `../../Xingya/Configuration.storekit` 的引用；本轮没有修改 scheme 或 StoreKit 配置。该测试使用本地模拟目录，本地示例价不是 ASC 已批准价，也不证明真实 Sandbox 加载/购买成功。

### 当前 ASC 状态及剩余事项

协调进程新核实：订阅可用性已纠正为 **175/175，包含中国大陆**。本报告与 `docs/asc-reviewer-notes.md` 中旧的未勾选表述均已更新。App `6793418759`、组 `22563981`、唯一月订 `com.hanwang.xingya.premium.monthly` / `6832887439`、中国大陆基准价 **CNY 18.00 已保存**、家庭共享关闭、无介绍优惠保持不变。

商品仍为 **Prepare for Submission**；商品审核截图仍缺、尚未提交；真实 Sandbox 商品加载/购买仍未验证。地区配置纠正不等于可售或审核通过。后端部署、真实两项会员功能演示、隐私/支持线上可达性与此前记录的支持/迁移边界继续保留，未因本地截图测试修正而解除。

### 本轮验证与文件清单

实际执行 `xcrun swiftc -typecheck -swift-version 6 -default-isolation nonisolated -strict-concurrency=complete`，指定 iPhoneSimulator SDK、`-target arm64-apple-ios17.0-simulator`、平台 XCTest framework/import 路径和独立 `/tmp/xingya-paywall-typecheck-f0r7ki4b/module-cache`，对完整 `ios/XingyaUITests/PaywallScreenshotUITests.swift` 做类型检查：**退出码 0**。这不是 UI 运行结果；本轮不运行完整 scheme，也不运行专项模拟器测试。TypeScript 与会员逻辑均未改，本轮未重跑 `tsc` / `npm test`；既有通过记录保留。

两份文档静态检查确认当前可用性为 175/175、包含中国大陆，同时保留 Prepare for Submission、截图缺失、Sandbox 未验证等限制；旧实现/测试历史章节保留。

本次仅修改三份文件：

1. `ios/XingyaUITests/PaywallScreenshotUITests.swift`
2. `docs/membership-implementation.md`
3. `docs/asc-reviewer-notes.md`

协调进程下一步在沙箱外分别对 iPhone/iPad 重跑 `-only-testing:XingyaUITests/PaywallScreenshotUITests`，使用新的 DerivedData/结果目录，确认商品分支或如实记录空目录分支，再导出新的截图。没有 git 写操作、部署、ASC 调用/写入、Archive、真实购买或读取密钥；未改权益架构、商品 ID、既有成功结果包、`ios/store`、旧 Archive/截图或备份。

2026-11-10 联系信息增量：用户已核实并授权支持/隐私邮箱 [cswanghan@gmail.com](mailto:cswanghan@gmail.com)，已补入 privacy.html、app-support.html、原生账号/会员区及上架/审核文档；隐私与支持 URL 已可达，线上仍为 2026-07 旧稿且尚无此邮箱，源码更新待部署。本条更新此前“无联系渠道/可达性待核验”的当前状态；本轮未部署、未写入 ASC，未改会员权益或 API。


## 官方 Production → Sandbox 环境发现增量（2026-11-10，源码待部署）

本次仅修改后端及相关测试/文档。用户确认线上 `APPLE_IAP_ENVIRONMENT=Production`；本轮没有读取或改变运行时配置、生产 JWT 或私钥，没有迁移 D1、部署、改账号、真实购买、上传或重建 IPA。旧归档 `/Users/hanwang/Documents/Codex/2026-11-10/xingya-archives/20261110-171145/export/Xingya.ipa` 未触碰。

### 环境发现路径与失败关闭（含后续 401 / fetch 抛错兼容修正）

- `verifyAppleMembership` 在发现模式（`expectedOriginal === undefined`）且配置为 Production 时，先查询 Production；**HTTP 404 的可解析 JSON 对象中，`errorCode` 严格等于数字 `4040010` 或字符串 `"4040010"`、HTTP 401（不依赖 body），或 fetch 在取得响应前抛错**，才查询 Sandbox。上架前兼容取舍见文末；401 或 fetch 抛错本身都不是订阅证明。普通/其他错误码 404、非精确匹配的字符串错误码、HTML/空/数组 404 错误体、403、5xx、响应体解析或成功响应中的校验失败都不会触发环境回退。Sandbox 返回精确 4040010 时，POST 返回 403「未找到可验证的订阅；本地模拟购买不授予云端会员。」，不写绑定；环境回退最多一次，不循环，每个环境另允许一次受限重定向。
- 保留当前固定 `https://api.storekit.apple.com` 和 `https://api.storekit-sandbox.apple.com` 主机、每次请求十秒超时；重定向改为 manual，仅允许这两个 origin 一次，细则见文末。本次没有另造服务地址。[官方环境发现规则](https://developer.apple.com/documentation/appstoreserverapi)、[官方域名更新记录](https://developer.apple.com/documentation/appstoreserverapi/app-store-server-api-changelog)
- 两个环境都继续检查 Bundle、唯一商品、自动续订/购买所有权、原交易编号、撤销/升级/有效期或宽限期，以及当前原生账号的 appAccountToken。只有完成验证后才写入 Apple 确认的环境；既有数据库唯一约束继续防止同一环境的原交易编号被其他账号占用。
- `currentMembership` 按数据库保存的环境复核，不再按用户 ID 名单选环境。若同一账号保存了 Production 与 Sandbox 两个绑定，确定性优先 Production；该绑定过期、撤销、未找到或服务失败时，不改用 Sandbox 来掩盖失败。403 对状态查询表现为 inactive；服务/配置错误仍为失败响应。记录保留，不删除或迁移绑定。
- POST 若提交的是已保存的原交易编号，也按该绑定环境复核且禁止环境发现，Production 401 返回 503；客户端提交的其他新交易编号尚无服务端环境记录，仍按上述发现流程验证。客户端 body/header/query 中的环境或会员声明均不作为授权依据。
- 移除此前 `environmentForMember` 用户名单切换路径。旧变量即使残留也不再影响路由；没有新增、填写或修改线上名单，不需要编造审核用户 ID。

### 响应兼容及测试权益边界

`/api/native/membership` 保留 `ok/accountToken/active/expiresAt/environment` 和原有失败形状，仅新增 `entitlement`：有效 Production 为 `production_paid`，有效 Sandbox 为 `sandbox_test`，无有效权益为 null。`environment` 来自验证后的 Apple 结果及其持久化绑定，不来自客户端声明。Sandbox 测试权益能测试现有会员接口，但不能作为生产付款、收入或真实可售证明。

现有 `ServerMembership` 使用 Swift Decodable，已解析 environment；会员 UI 已显示“Sandbox 测试权益，不代表生产购买”。本轮用未修改的实际 Swift 解码模型验证新增字段可被兼容忽略。**本次后端契约修改无需新 IPA**；未修改任何原生源码，也未重打包。此结论不代表真实 Sandbox 或线上后端已验证。

### 本次实际测试

| 命令/检查 | 结果 |
| --- | --- |
| `npm test -- src/native-membership.test.ts --reporter=dot` | **退出码 0，72 项通过**；原会员 32 项基础上新增 40 项，更新原先依赖用户名单的断言以对应本次批准的环境发现策略，无 skip |
| `npm test -- --reporter=dot` | **退出码 0，8 个文件、189 项通过**；账号可靠性 21 项和共享 Web 行为回归仍通过 |
| `npx tsc --noEmit` | 首次发现 `appleConfiguration` 返回环境类型被推宽为 string，补充显式返回类型后复跑 **退出码 0**；未改 JWT/Google 校验代码 |
| 现有 Swift 解码器兼容检查 | 用 `APIClient.swift`、`MembershipState.swift` 与临时检查入口，执行 `xcrun swiftc -swift-version 6 -default-isolation MainActor -parse-as-library`，编译与运行均 **退出码 0**；Production / Sandbox / inactive 三种新增字段响应全部通过。产物仅在 `/tmp/xingya-membership-contract-iec111p4/` |
| 完整 Xcode scheme / 真实 Apple Sandbox | **本轮未运行**；测试均为受控 HTTP 桩与内存 SQLite，临时签名测试材料只在内存生成，不是 Apple 签名或真实购买验证成功 |

回归覆盖精确错误码与请求顺序、非匹配 HTTP/错误体及超时拒绝、两环境下错误 Bundle/商品/账号标记/过期/撤销拒绝、A/B 购买隔离与唯一约束冲突、环境持久化与后续刷新、已知绑定不回退、同时有两种绑定时 Production 优先、客户端环境声明和旧名单无法改路由，以及 Sandbox 不标为 Production 付费权益。

### Google-only 原生登录只读诊断

`ios/Xingya/Views/AuthView.swift` 的登录按钮调用 `AuthSession.login(username:password:)`，后者请求 `/api/auth/login`；原生 Swift 树未发现 Google 登录入口。仅有 Google 身份、没有可用用户名密码登录凭据的账号，当前不能直接通过原生 Google 登录。Web 的 Google 路由不等于原生已接入。本轮不改账号、不设置密码、不编造审核账号或 ID。

### 部署前仍须用户授权的事项

1. rocket-math 的生产 JWT 配置及硬编码 fallback 风险需另行处理；本轮未读/改相关值或 `src/env.ts`。是否独立配置新 secret、如何通知重新登录，须用户批准后操作。
2. 先只读核对共享 D1 的真实结构。会员需要 `users` 及两张会员表；同步与删号还需要四张数学表及既有模块的相应列。仅本次环境发现功能**没有新增 schema 或迁移**，已有迁移是否缺失不能由源码推定；任何补迁移须另行授权。
3. 后端 Pages 函数部署、真实 Sandbox 加载/购买/绑定及两项会员功能演示仍待协调进程安排并取得所需授权。本次源码未上线，不能把单测或现有 IPA 当作上线证明。

本次文件清单：`src/apple-subscriptions.ts`、`src/native-membership.ts`、`functions/api/native/membership.ts`、`src/native-membership.test.ts`、`src/test-support/apple-fixture.ts`、`docs/membership-implementation.md`、`docs/asc-reviewer-notes.md`。未改商品 ID、订阅档位、JWT fallback、D1 migration、Web AI 路由或原生源码；既有脏工作和历史测试记录保留。

## 发现模式 Production HTTP 401 兼容修正（2026-11-10，仅本地源码）

本节保留 401 修正时的取舍与测试记录；其中“网络错误不回退”“各一次请求”的历史边界由文末 fetch 抛错与受限重定向增量更新，401 取舍保持。

### 已确认根因与有意取舍

用户已核实：星芽从未有正式上架版本，同一把 IAP 密钥调用 Production StoreKit Server API 得到 HTTP 401、空 body，调用 Sandbox 则能得到 HTTP 404 / 数字 `errorCode=4040010`。这是 Apple 对**从未正式上架版本**的应用调用生产 StoreKit Server API 的已知行为；本轮直接采用该核实结论，没有读取真实密钥、生产 JWT 或重复真实 Apple 探针。

首次正式上架后，Production 应恢复正常的 4040010（交易未找到）/200（正常响应）；届时 Production 401 更可能是令牌或密钥问题。当前兼容分支不会自动判断应用是否已上架，因此发现请求也可能在 Production 认证异常时取得有效 Sandbox 测试权益；这是有意取舍，不能把 401 本身当作“交易未找到”或验证成功。已绑定刷新仍在保存的环境失败关闭，Production 401 返回 503，绝不改查 Sandbox，以免把密钥问题掩盖成沙盒成功。

### 实现及错误边界

- 在现有精确 4040010 分支之后、通用 `!response.ok` 拒绝之前，仅对 `config.environment === 'Production' && expectedOriginal === undefined && response.status === 401` 复用 Sandbox 递归校验；复制环境参数，不修改原配置。线上 `APPLE_IAP_ENVIRONMENT` 仍为 **Production**，没有改默认值、线上配置或固定 host。
- 401 回退不依赖 body；诊断解析失败会被忽略，空 body 不会阻断回退；JSON `{}`、误导性 `errorCode: 4040010`、HTML 等 body 均不影响该 HTTP 状态分支。Sandbox 必须真正返回可验证订阅，并继续通过商品白名单、Bundle、环境、撤销/过期、原交易及 appAccountToken 等完整校验，才以 `sandbox_test` 写入 Sandbox 绑定；后续按保存的 Sandbox 环境刷新。
- 原精确 4040010 路径保持不变。Production 401 或精确 4040010 后，若 Sandbox 也返回 HTTP 404 / 数字或字符串 4040010，POST 均为 **403「未找到可验证的订阅；本地模拟购买不授予云端会员。」**，不是 503，不写绑定。最多请求 Production、Sandbox 各一次。
- 已绑定 Production 的状态查询、原交易恢复和付费访问遇 401 都只查 Production、返回 503，即使同时保存 Sandbox 绑定也不替换；直接配置 Sandbox 时的 401 及回退后的 Sandbox 401 同样返回 503、不再递归。403、非精确 4040010 的 404（含非精确匹配的字符串错误码、HTML/空/null/数组 body）、5xx、超时、网络错误等继续失败关闭、不触发环境回退。

### 本轮实际验证

| 命令 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | **退出码 0** |
| `npm test -- src/native-membership.test.ts --reporter=dot` | **退出码 0，98 项通过**；较上一轮净增 26 项，无 skip |
| `npm test -- --reporter=dot` | **退出码 0，8 个文件、215 项通过**；包含会员 98 项和账号可靠性 21 项，无 skip |

测试只使用内存生成的临时签名 fixture、内存 SQLite 和 HTTP 桩，没有真实网络请求 Apple，也未输出任何密钥。覆盖四种 401 body 的发现成功/精确未找到、Sandbox 401 失败关闭、已绑定 Production 不回退、两环境完整校验及原有错误矩阵；既有 Sandbox fixture 的空 401/畸形响应用例继续为 503，并断言仅一次 Sandbox 请求。

本轮修改：`src/apple-subscriptions.ts`（401 发现分支）、`src/native-membership.ts`（仅更新发现规则注释）、`src/native-membership.test.ts`、本文。未使用 git，保留全部既有脏工作；未改 iOS、JWT、D1 或其他项目，未部署、迁移、归档、上传 IPA、提审或改账号。真实 Sandbox 购买与本轮 IPA 上传均未进行，不能由这些本地测试宣称已完成。

### Pages 不可枚举绑定修正（2026-11-10，仅本地源码）

Cloudflare Pages/Worker 的绑定与密钥可能不可枚举；回退或按已保存绑定覆盖环境时，不能对 `env` 做 object spread，否则会丢失密钥。现已弃用 Proxy/`Reflect.get` 覆盖环境：宿主 env 套 Proxy 后仍可能读不到密钥。两处发现回退及 `environmentForBinding` 共用 `withAppleEnvironment`，通过原始 env 的直接属性访问读取 `APPLE_IAP_ISSUER_ID`、`APPLE_IAP_KEY_ID`、`APPLE_IAP_PRIVATE_KEY`、`APPLE_IAP_BUNDLE_ID`，加上传入的 `APPLE_IAP_ENVIRONMENT` 构造普通对象。该对象仅供 Apple 校验，不含 DB/JWT_SECRET；查库、写绑定和账号校验继续使用原始 env。回退条件、固定 host、默认值及上述上架前 401 取舍保持不变，原配置不变；本轮未部署，不能据此宣称线上已验证成功。

保留并调整既有 11 项不可枚举绑定/helper 回归测试，断言只拷贝 IAP 字段、原环境不变，以及已绑定刷新仍使用原始 env 查库/写库；仅使用内存 fixture 和 HTTP 桩。本轮 `npx tsc --noEmit` 退出码 0；全量 `npm test` 为 8 个文件、226 项通过（会员 109 项），无跳过。

### 4040010 字符串兼容与安全诊断（2026-11-10，仅本地源码）

本节及下节保留当时的四字段诊断与测试记录；最新字段扩展见文末。

HTTP 404 仅精确接受数字 `4040010` 或字符串 `"4040010"`，沿用既有发现回退；不再回退时返回 403，其它失败关闭条件不变。部署后线上每次 Apple 响应会输出一行 JSON，字段仅 `environment/httpStatus/errorCode/fellBackToSandbox`；网络异常状态为 null。JSON body 只解析一次并缓存复用；错误码仅保留非负安全整数或十进制数字字符串，其它为 null，不记录响应正文、交易号、用户信息或凭据。本轮未部署、未做真实 Apple 请求，不代表线上验证成功；上架前 401 取舍及显式字段拷贝保持不变。

本轮 `npx tsc --noEmit` 退出码 0；全量 `npm test` 为 8 个文件、249 项通过（会员 132 项），无跳过。覆盖两种 4040010、已绑定/直接 Sandbox 不回退、非法错误体失败关闭及日志字段白名单；仅使用本地 fixture 与 HTTP 桩。

### 失败 JSON 临时诊断（2026-11-10，仅本地源码）

会员校验失败 JSON 临时包含 `appleDebug` 数组，每次 Apple 请求仅记录 `environment/httpStatus/errorCode/fellBackToSandbox`；递归回退按顺序累积 Production 与 Sandbox，网络失败记录的状态为 null。原有 `ok/error`、状态码及回退条件不变，调用 Apple 前失败可省略该字段，成功 200（含 inactive）不包含该字段。这是上架前诊断，不是稳定 API 契约；本轮未部署、未真实调用 Apple，不代表线上验证成功。

本轮 `npx tsc --noEmit` 退出码 0；全量 `npm test` 为 8 个文件、281 项通过（会员 164 项），无跳过；仅使用内存 fixture 与 HTTP 桩。

## Production fetch 抛错、manual 重定向与安全诊断（2026-11-10，仅本地后端）

用户提供的线上失败诊断为 Production `httpStatus: null`，说明 fetch 在取得 HTTP 响应前抛错；这不是已确认的 401 空 body。本轮未重复真实 Apple 探针，也不能由本地测试判定是重定向、TLS/连接还是其它 fetch 失败。

上架前 Workers 可能无法访问生产 StoreKit 接口，因此仅在 `expectedOriginal === undefined` 且当前配置环境为 Production 的发现模式下，fetch 抛错也通过 `withAppleEnvironment(env, 'Sandbox')` 显式回退，以便沙盒校验能进行。Production 的异常诊断先记录 `httpStatus: null`、`fellBackToSandbox: true`，随后累积 Sandbox 结果。Sandbox 精确数字/字符串 4040010 返回 403「未找到可验证的订阅；本地模拟购买不授予云端会员。」；只有完整订阅校验通过才能绑定 `sandbox_test`。已绑定刷新/恢复/付费访问遇 fetch 抛错始终 503，不切换环境；配置为 Sandbox 或回退后的 Sandbox 抛错同样 503、不再回退。响应体解析失败、任意 404/3xx 或其它已绑定失败均不新增环境切换。

这是有意的上架前取舍：首次正式上架后，生产网络失败更应返回 503，以免生产故障被沙盒结果掩盖；当前代码不会自动判断是否已上架，需要届时另行收紧。既有 401 兼容取舍、数字及字符串精确 4040010 路径保持。`withAppleEnvironment` 继续通过原始 env 的直接属性访问显式拷贝 IAP 字段，不使用 Proxy 或 `{...env}`；固定 host、环境默认值及线上配置均未改变。

所有请求改为 `redirect: 'manual'`。仅对 301/302/307/308 检查 Location：必须是合法绝对 HTTPS URL，origin 严格为 `https://api.storekit.apple.com` 或 `https://api.storekit-sandbox.apple.com`；缺失、相对、其它 host、HTTP、含用户凭据或畸形地址均 503。每次环境校验只跟随一次，第二次请求仍为 manual；再次重定向记录状态后 503。两个环境最多各两次 HTTP 请求，不循环跟随。诊断保留 3xx 及后续最终状态，完全不记录 Location（连 host 也不记录）。重定向只改变请求地址，后续响应仍按当前配置环境校验并执行既有 401/4040010 处理；即使 Location 指向 Sandbox host，也不会暗中切换环境。

临时 `appleDebug` 与现有安全 console JSON 使用相同对象：保留 `environment/httpStatus/errorCode/fellBackToSandbox`，仅 fetch 抛错记录新增 `errorName/errorMessage`。名称只保留标准错误类白名单；消息先移除 URL、长数字串、已知交易/账号标记、Authorization/Bearer/JWT、密钥/PEM 及凭据或用户信息标记后的内容，并清除无标签的 JWT/长编码片段、邮箱和控制字符；仅保留首行、最多 240 字符，不读取或记录堆栈，清洗后无有效文字为 null。不可读属性不影响安全失败/回退；无可用名称或消息为 null。禁止记录原始错误对象、未清洗消息、Apple 完整 body、交易号或用户资料；成功 200（含 inactive）继续不带 `appleDebug`。

本轮仅修改 `src/apple-subscriptions.ts`、`src/native-membership.ts`（发现规则注释）、`src/native-membership.test.ts` 和本文。只使用内存签名 fixture、内存 SQLite 与 HTTP 桩；没有读取真实密钥、生产 JWT 或调用真实 Apple，没有 git、部署、迁移 D1、iOS 修改、上传 IPA、提审、改账号或其它项目变更。既有脏工作保留；不代表线上已验证成功。

最终验证：`npx tsc --noEmit` **退出码 0**；全量 `npm test` **退出码 0，8 个文件、334 项通过（会员 217 项），无跳过**。覆盖 Production fetch 抛错后的 Sandbox 数字/字符串 4040010 与成功绑定、已绑定和直接 Sandbox 抛错不回退、不可枚举绑定、允许 origin 的四种重定向状态与一次上限、非法 Location/其它 3xx 拒绝、重定向后仍按当前环境校验和显式发现、诊断清洗及字段白名单、成功响应不带诊断；既有 401/精确 4040010 回归保持通过。
