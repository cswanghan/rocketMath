# 星芽原生 StoreKit / 订阅事实审计

审计日期：2026-11-10。工作区：`/Users/hanwang/Documents/workspaces/rocketMath`；分支 `feat/ios-native-app`，HEAD `2a02449`，依据当前包含未提交/未跟踪文件的工作树。用户已决定 **1.0 配置真实订阅后再上线**；本文不替用户选价格、商品 ID 或权益政策。

**结论：当前实现只有一个月度自动续订商品。商品 ID 在代码、本地配置和文档中一致，但订阅带来的功能差异尚未接线，交易监听也存在权益撤销/过期后的状态缺口。本轮无法判断 ASC 是否已有该商品，更不能确认价格、可售状态或审核状态。**

## 1. 先确认的最小商业决策

下面都是待用户决定的事项，没有默认批准项。无需为当前实现另行设计年订、多档或一次性商品。

| 待决定事项 | 已有事实 | 需要用户明确的结果 |
| --- | --- | --- |
| **1.0 实际付费权益** | 文案承诺“云同步增强与 AI 家长总结”；当前同步和 AI 都没有会员门闸，购买仅改变账号页会员状态显示。 | **路径 A：兑现文案**，明确免费与会员在现有同步/AI 能力上的具体差异，再单独授权后续客户端及服务端接线；核心口算/练习保持免费。**路径 B：先调整文案**，如实说明当前“核心功能免费、会员区可购买”的状态，删除未兑现的能力承诺。但 B 本身并未定义付费价值，不能据此宣布满足真实订阅上线条件。 |
| 商品 ID | `com.hanwang.xingya.premium.monthly`，唯一现有 ID。 | 沿用完整 ID，还是另行指定 ID。若改动，需要同步修改代码常量、本地配置、文档和 ASC 配置，并核查是否已有购买记录；本轮不知道 ASC 现状。 |
| 时长/商品数量 | 本地配置为 `P1M`，一个月自动续订；只有一个商品。 | 确认 1.0 是否就这一个月订。当前没有已实现或已写明的年订/终身档位需要一并决定。 |
| **ASC 价格档** | `.storekit` 的 `displayPrice` 为字符串 `18`；文档写过“¥18”示例；JSON 本身没有显式币种字段。 | 用户明确要在 ASC 设置的价格档及对应基准地区/币种。**本地示例不是 ASC 批准价，也不是本轮建议价或已定价。** |
| 显示名称/描述与语言 | 本地已有简体中文及英文；两份中文文档的描述略有差异，详见下表。 | 确认中文显示名与符合最终权益的描述；确认 1.0 是否使用现有英文。权益先定，描述随后对齐。 |

Apple 对自动续订要求持续提供价值。因此，如果最终只是出售会员标记，需要继续明确可持续交付的订阅价值，不能把删除不实文案视为已经解决该问题。[Apple App Review Guidelines 3.1.2(a)](https://developer.apple.com/app-store/review/guidelines/#subscriptions)

若选择把订阅用于云同步/AI，另一个随之产生的决策是：Apple 购买如何关联原生登录账号、换账号如何处理。当前购买不要求原生登录，也没有 `appAccountToken` 或服务端订阅绑定；本轮不代定绑定/迁移规则。

## 2. 商品、价格和本地化：三处证据对照

| 字段 | Swift 代码 | `Configuration.storekit` | 文档草稿 |
| --- | --- | --- | --- |
| 商品数量 | `StoreProductID.all` 只有一个成员 | `subscriptionGroups` 一个组、其中一个订阅；`products`、`nonRenewingSubscriptions` 均为空 | 仅描述这一个月订，未找到年订/一次性档位 |
| 完整 ID | `com.hanwang.xingya.premium.monthly` | 相同 | 两份文档相同 |
| 类型与周期 | 常量名 `premiumMonthly`；请求商品时没有额外验证类型/周期 | `RecurringSubscription`、`P1M`：一个月自动续订 | 写“1 个月” |
| 群组/参考名称 | 没有群组业务判断 | 群组“星芽会员”；参考名 `Premium Monthly` | 相同 |
| 中文显示名 | UI 使用 `product.displayName` | `zh_CN`：“星芽高级会员（月）” | 相同 |
| 中文描述 | UI 使用 `product.description` | `zh_CN`：“云同步 + AI 家长总结” | `APP_STORE.md` 相同；`ASC_SUBMIT.md` 为“云同步增强与 AI 家长总结等能力” |
| 英文显示名 | 没有硬编码英文 UI 商品标题 | `en_US`：`Xingya Premium Monthly` | 相关配置段只列中文，并不证明 ASC 已有英文 |
| 英文描述 | 从 StoreKit 商品读取 | `en_US`：`Cloud sync and AI parent summary` | 未在上述文档配置段列出 |
| 价格 | UI 使用 `product.displayPrice`；没有把 `18` 硬编码进购买按钮 | `displayPrice: "18"`，**仅本地示例，非 ASC 批准价** | `APP_STORE.md` 写本地调试 ¥18 可参考；`ASC_SUBMIT.md` 写自定、如 ¥18；**均非已批准价格** |
| 家庭共享/优惠 | 未见家庭所有权专门处理 | `familyShareable: false`；`introductoryOffer: null`，其他优惠列表为空 | 不能据此判断 ASC 开关/优惠现状 |

证据：

- [StoreKitService.swift:8](/Users/hanwang/Documents/workspaces/rocketMath/ios/Xingya/Store/StoreKitService.swift:8)：ID 常量及请求列表；`loadProducts()`（29–40 行）从 StoreKit 获取商品。
- [Configuration.storekit:15](/Users/hanwang/Documents/workspaces/rocketMath/ios/Xingya/Configuration.storekit:15)：唯一订阅组；30–54 行包含价格、共享、两种语言、ID、周期及类型。
- [AccountView.swift:90](/Users/hanwang/Documents/workspaces/rocketMath/ios/Xingya/Views/AccountView.swift:90)：商品列表展示 `displayName`、`description`、`displayPrice`。
- [APP_STORE.md:149](/Users/hanwang/Documents/workspaces/rocketMath/ios/APP_STORE.md:149)、[ASC_SUBMIT.md:44](/Users/hanwang/Documents/workspaces/rocketMath/ios/ASC_SUBMIT.md:44)：订阅配置草稿。

配置标识 `XingyaLocal`，组 ID `21500001`、内部商品 ID `21500002` 只是本地配置中的数值，不能当作已经存在的 ASC 记录。Swift 文件第 9 行“改这里一处”的注释也不能理解为改 ID 只需要改常量：本地配置、文档和 ASC 仍需保持一致。

`ASC_SUBMIT.md:44–46` 仍写订阅可选、可首发后再做；这已经不符合用户本次确定的 1.0 计划。它是旧草稿，不能据此继续采用“即将上线”作为正式订阅交付方案。本轮只记录，未改原文。

## 3. 实际权益门闸与文案差距

对原生 Swift 源码全量查找 `isPremium`、购买、恢复及权益引用后，`isPremium` 的业务使用点只有 `AccountView` 会员区。

| 能力/界面 | 当前控制条件 | 未订阅的现状与证据 |
| --- | --- | --- |
| 核心口算、练习、知识地图 | 内容路线及学习流程，不读取 StoreKit 会员状态 | 仍可使用。`KnowledgeMapView.swift:93–108` 对已实现口算/练习路线使用 `locked: false`；`comingSoon` 内容锁与订阅无关。未发现订阅题量上限或“10 次试用”门闸。 |
| 账号页会员区 | `StoreKitService.isPremium` 等于已购买 ID 集合非空 | `AccountView.swift:81–113`：会员显示“已开通高级会员”；否则商品已加载时可购买，空列表时显示“即将上线”；恢复购买按钮一直存在。会员区未被原生登录条件包住。 |
| 云同步 | 原生登录、会话可用、本机数据归属匹配 | `AccountView.swift:53–64、159–174`、`ProgressSync.swift:100–105`；没有会员判断，也没有“会员增强”分支。服务端 `functions/api/progress/sync.ts:56–87` 验证账号状态，没有 Apple 付费权益验证。 |
| AI 家长总结 | 原生登录且本机数据归属匹配时尝试远程总结，否则本地分析 | `ParentDashboardView.swift:213–228`、`SummarizeClient.swift:73–96`；不要求会员，网络/服务不可用时可回退本地结果。 |
| AI 服务端 | 提供 Authorization 时验证账号状态；保留既有无 Authorization 的 Web 路径 | `functions/api/summarize.js:14–22`；没有订阅判断。本轮未改变匿名路径或 Web 产品行为。 |

因此，购买后的**现有可见差异是会员状态标签**，并没有解锁额外题量、另一个同步范围或专属 AI 服务。不能把现有云同步/AI 的存在等同于“已经交付会员专属权益”。

文案差距在 `Configuration.storekit:37、42`、`APP_STORE.md:53–54、155`、`ASC_SUBMIT.md:58`。账号页 `AccountView.swift:121` 及支持页 `public/app-support.html:65` 又说明登录即可同步/AI，未要求订阅。后续必须按用户批准的实际权益对齐这些表述，不能本轮顺手把免费功能改成付费墙。

## 4. 交易、权益、恢复购买：已实现与缺口

以下是源码审计结论，并非已经在 Sandbox 或生产复现的测试结果。核心代码均在 `ios/Xingya/Store/StoreKitService.swift`。

| 项目 | 已实现 | 缺口/影响 |
| --- | --- | --- |
| 购买验证与 `finish` | `purchase()` 48–53 行只在验证成功后记录 ID，再 `finish()`；验证失败进入错误分支，不授予权益 | 当前“交付”只有内存会员标记。如果后续需要服务端权益交付，应另行设计持久交付与完成交易的顺序，不能把当前流程视为已完成云端权益发放。 |
| 启动监听 | `init()` 25–26 行启动 `Transaction.updates`；`XingyaApp.swift:8` 持有应用级实例 | 早启动是正确基础；但监听不等于初次完整恢复当前权益。 |
| **撤销/退款/过期** | `refreshEntitlements()` 76–83 行重建集合，并排除 `revocationDate != nil` | **`listenForTransactions()` 88–94 行仅 insert，不检查撤销/到期、不移除或重建。已验证的撤销交易也可能使标记保留/被加入。订阅到期后也没有时钟/前台刷新机制，会员 UI 可能过时，直到下次完整刷新。** |
| 初始及离线权益刷新 | 商品请求成功（含正常返回空数组）后刷新权益；恢复购买成功后刷新 | 商品获取抛错时不刷新；应用初始化也不直接刷新。`AccountView.swift:152–154` 先等待 `auth.refreshMe()`，再加载商品。未找到 `scenePhase` 前台刷新，已有购买者在未打开账号页/目录请求失败时可能仍显示非会员。 |
| 商品白名单 | 目录请求仅包含已知月订 ID | 三处集合写入都未过滤 `StoreProductID.all`；`isPremium` 只判断集合非空。若同一 App 日后存在其他已购商品，也可能被误当作这项会员。不是任意伪造 ID 能绕过 Apple 验证。 |
| 待批准/取消 | `.pending`、`.userCancelled` 不立即授予权益；后续成功可经 updates 到达 | 两种情况目前都静默结束，没有待批准提示。后续更新处理仍受上面权益判断缺口影响。 |
| 恢复购买 | `restore()` 64–73 行由用户按钮触发 `AppStore.sync()`，再刷新当前权益；异常显示 `lastError` | 没有区分“恢复成功”“没有可恢复的购买”的反馈；没有对应回归测试。 |
| 购买中/错误 UI | 服务维护 `isLoading`、`lastError`；账号页显示错误 | 账号页没有消费 `isLoading`，未提供购买/恢复中的禁用或进度反馈，允许重叠任务。仅指出状态竞争/体验风险，不声称会实际重复扣款。初始加载、目录失败和真正空目录也没有清晰区分。 |
| 未完成交易/监听错误 | 已验证 updates 会 `finish()`；Apple updates 可在启动时发送未完成交易 | 不能说完全没有未完成交易补偿。但监听使用 `try?` 吞掉验证失败，未向 UI 提供该错误；也未测试中断后恢复。 |
| 续期、宽限期、账单重试 | 完整刷新使用 Apple `currentEntitlements`，可据其结果恢复适用权益 | 没有订阅状态/到期时间/续费状态展示，也没有专门处理这些生命周期变化的测试。不能把“取消自动续费”直接当作立即失权；当前有效期内仍应按有效权益处理。 |
| 家庭共享 | 本地配置明确关闭；没有按 `ownershipType` 区分的代码 | ASC 是否开启未知；未验证共享授予或撤销。如果最终保持不共享，不需要为当前一个月订另造家庭套餐。 |
| 原生账号与 Apple 账号 | 应用级 StoreKit 状态，不依赖原生登录 | 未使用 `appAccountToken`；原生退出登录不会重建 StoreKit 服务。Apple 购买与原生账号是两套身份，这本身不证明错误；若后续给云端账号发权益，则绑定/切换/恢复规则与服务端验证仍为空缺。 |
| 服务端订阅权威状态 | 现有数学 API 有登录/账号状态校验 | 在 `functions/`、`src/` 未找到 StoreKit 交易验证、App Store Server 通知或订阅映射实现。当前未付费的同步/AI 不是绕过了已有门闸，而是根本没有这套门闸。是否需要服务端接入取决于批准的权益。 |
| 生命周期管理 | `updatesTask` 保存在服务实例中 | Task 捕获服务，未见取消路径，可能影响实例释放/测试隔离；当前为应用级单实例，未证实用户可见崩溃。优先级低于权益正确性。 |

需要特别区分：`currentEntitlements` 本身提供当前可用权益；对自动续订包括已订阅及宽限期状态，并排除已退款/撤销交易。因此，**不能仅凭 `refreshEntitlements()` 没写 `expirationDate` 就断言它必然保留过期订阅**。这里明确的缺口是更新路径只增加，以及没有在适当时机重新求当前权益。[Apple currentEntitlements](https://developer.apple.com/documentation/storekit/transaction/currententitlements)、[Apple RenewalState](https://developer.apple.com/documentation/storekit/product/subscriptioninfo/renewalstate)

Apple 建议启动时监听交易更新，交付内容/服务后完成交易；pending 后的成功可由更新流送达。现有代码具备这些基本入口，但真实性验证不等于“这条交易此刻仍应授予会员”。[Apple Transaction.updates](https://developer.apple.com/documentation/storekit/transaction/updates)、[Apple finish()](https://developer.apple.com/documentation/storekit/transaction/finish())、[Apple pending](https://developer.apple.com/documentation/storekit/product/purchaseresult/pending)

**本轮无代码改动。** 即使发现上述技术缺口，本轮优先完成用户要求的只读审计；没有改变任何人的可用功能、价格、交易完成行为或账号关联。后续权益实现应在商业决策明确后单独修复并回归。

## 5. 本地模拟、Sandbox 与生产分别能说明什么

| 场景 | 当前配置/应有数据来源 | 本轮可确认与不能确认的边界 |
| --- | --- | --- |
| Xcode 本地 Debug Run | 共享 `Xingya.xcscheme` 的 `LaunchAction` 使用 Debug，73–75 行挂 `../../Xingya/Configuration.storekit` | 可用该模拟商品在模拟器/开发设备调试，不要求事先存在 ASC 商品。本轮仅验证配置文件及引用，未实际发起模拟购买。 |
| scheme 测试 | `TestAction` 25–29 行为 Debug，并使用 Launch 的参数/环境；现有单元/UI target 在该 scheme | 不能把配置引用或普通学习流程测试当作订阅场景已测试。未找到 `SKTestSession`、`StoreKitTest` 或直接针对 `StoreKitService` 的回归测试。 |
| 真机开发运行，未启用本地 StoreKit 配置 | 对本 App 从 Apple Sandbox 获取 ASC 商品资料 | 必须核对 ASC 中该 App 的产品及相应协议、商品资料、可用范围等。源码写了 ID 不会自动创建商品。不能以“真机”二字判断是生产交易。 |
| TestFlight | 使用 Apple Sandbox 和 ASC 真实商品资料 | 不是本地 `.storekit` 商品，也不是生产扣款；测试购买不产生实际收费。仍需真实商店配置，不代表生产已获批。 |
| 正式 App Store 版本 | 从生产商店获取适用于该 App/环境/地区的商品 | `Product.products(for:)` 请求既有完整 ID；只可能返回商店认识且对该 App 可用的商品，并可能返回空结果/错误。当前商店侧可用性未知，必须由用户在 ASC 核对。 |

依据：[Apple 本地 StoreKit 测试](https://developer.apple.com/documentation/xcode/setting-up-storekit-testing-in-xcode)、[Apple Sandbox 测试](https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox)、[Apple 商品可用性排查 TN3186](https://developer.apple.com/documentation/technotes/tn3186-troubleshooting-in-app-purchases-availability-in-the-sandbox)、[Apple In-App Purchase](https://developer.apple.com/in-app-purchase/)。本轮只访问公开 Apple 文档，没有登录、查询或写入 ASC。

App target 的 Debug/Release Bundle ID 均为 `com.hanwang.xingya`（`ios/Xingya.xcodeproj/project.pbxproj:367、397`）。共享 scheme 的 `ProfileAction:77`、`ArchiveAction:97` 为 Release，未配置 StoreKit 文件引用。即使项目中存在 `.storekit`，也不能据此声称 TestFlight/生产会采用其本地示例价。

`AccountView.swift:85–88` 空商品时显示“订阅商品即将上线（需在 App Store Connect 配置产品）”。这是当前的容错占位，不是商店检测结果：初次加载、请求出错、ID/地区不匹配等也可能导致空列表。`lastError` 可另外显示错误，但空目录文案本身未区分原因。按照“1.0 真实订阅”的既定目标，发布前仍须验证真实目录能返回正确产品。

## 6. 隐私、支持和订阅说明

- 原生“关于”已有隐私与支持链接：`https://rocket-math-4kg.pages.dev/privacy.html`、`https://rocket-math-4kg.pages.dev/app-support.html`。`AccountView.swift:117–121` 同时显示 **“线上可达性待核验”** 及本地说明。本轮未核验这两个地址的 DNS/线上可达性，不声称已上线；没有替换或发明 URL。
- `public/privacy.html:51、60、69` 写明 Apple 处理交易、应用处理订阅及恢复购买、不接收完整银行卡信息。实际代码会读取并验证 Apple Transaction，并在内存保存 product ID 集合；未找到把交易上传本项目服务器的流程。因此“我们仅收到是否已购买的权益状态”是简化说法，不宜据此断言代码仅接触一个布尔值。如果后续新增账号绑定或服务端验证，需要按真实数据范围更新披露。
- `public/app-support.html:69` 提供系统设置中的取消订阅路径；`74–75` 明示尚无可用人工联系渠道。本轮没有编造邮箱、联系人，也未把网站打印版商业支持页 `support.html` 当作隐私联系入口。
- 当前购买区显示商品名称、描述、StoreKit 本地化价格，但未见使用条款/EULA 链接、独立自动续订说明、按订阅周期生成的说明或 App 内管理订阅入口。月度字样来自当前商品名称；若商店本地化改名，不应假定它永久充分说明周期。正式购买披露与支持入口完整性仍待后续核对，不能把本地商品弹窗当作全部信息已准备好。[Apple 订阅说明要求](https://developer.apple.com/app-store/review/guidelines/#subscriptions)

## 7. 后续阻断项及验证顺序（本轮未执行）

1. **用户确认实际权益、月订范围、ID、ASC 价格及名称/描述。** 当前仅有会员标记，持续付费价值尚未明确；先解决这一点，再授权对应门闸与必要服务端实现。
2. **修复并测试权益状态更新。** 覆盖有效购买、撤销/退款、到期、取消续费但尚在有效期、重启和前台恢复、目录加载失败时仍能恢复有效权益；未知 product ID 不应误授会员。
3. **验证交易流程。** 覆盖成功验证后交付/完成、验证失败、取消、pending 后批准/拒绝、恢复有购买/无购买、交易中断后启动补偿，以及购买/恢复并发时 UI 状态。家庭共享仅按最终实际启用状态测试。
4. **用户在 ASC 核对真实配置，再由协调进程进行 Sandbox/TestFlight 验证。** 核对 App/Bundle、完整 product ID、一个月周期、价格/币种/可售地区、两种语言取舍及商品状态；准备与实际权益一致的说明。此步骤是未来工作，不是本轮已完成的线上操作。
5. **补齐准确购买披露、可用隐私/支持页面及人工支持途径。** 不提前宣称链接可达、权益上线或审核可提交。

## 8. 本轮实际操作与产物

- 只读检查 Store 目录（仅 `StoreKitService.swift`）、本地 StoreKit JSON、共享 scheme、App 配置、账号页、全部原生会员/购买/恢复引用、同步/AI 客户端和对应服务端入口，以及两份上架文档的相关段落、隐私/支持页。
- 使用 `rg` 搜索原生源码与测试 target 的 `isPremium`、`Transaction`、购买/恢复、`StoreKitTest`/`SKTestSession` 等引用；在 `functions/`、`src/` 查找 StoreKit/App Store Server 交易关联实现，未发现匹配。搜索结论仅针对当前工作树，不代表部署或商店状态。
- 执行内联 Python 静态检查，解析 JSON 和 scheme XML，断言商品数量为一、ID 与常量一致、类型为 `RecurringSubscription`、周期 `P1M`、其他产品列表为空、LaunchAction 挂现有配置、ArchiveAction 为 Release。**退出码 0，全部断言通过。** 这不是购买/权益行为测试。
- 未运行 Xcode 构建、StoreKit 购买、Sandbox/TestFlight 交易、`npm test` 或 `tsc`；本轮没有代码修改，不把此前普通测试通过作为 StoreKit 已可靠的证据。
- 未读取私钥文件、钥匙串或 `.wrangler` 内容；未使用凭据请求 ASC。调查文档时，一次输出筛选意外包含既有审核密码行，已向用户说明；未使用该值，本文不收录。此事不能表述为本轮从未发生凭据输出。
- 未执行 git 写操作、部署、Archive 创建/上传；未覆盖旧 Archive、截图、备份，未修改其他 worktree 产品代码。

**本轮文件清单：仅新增 `docs/storekit-subscription-audit.md`；无代码改动。** 指定的外部报告目录不在本轮可写根目录内，因此按用户允许的回退路径落盘：`/Users/hanwang/Documents/workspaces/rocketMath/docs/storekit-subscription-audit.md`。全部已有脏/未跟踪工作保留。本报告不构成可以上传审核的结论。
