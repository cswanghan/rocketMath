星芽原生 UI 测试与 Google 验签类型修复 · 2026-11-10

已在 `/Users/hanwang/Documents/workspaces/rocketMath` 直接修改源码与测试，分支 `feat/ios-native-app`、HEAD `2a02449` 保持不变。保留上一轮可靠性修复以及用户所有其他脏/未跟踪工作。未暂存或提交，未部署、操作 ASC、上传、生成 Archive 或写入旧截图目录。

本轮权限仅允许工作区和临时目录写入，指定的 `/Users/hanwang/Documents/Codex/2026-11-10/xingya-native-fix/uitest-tsc-summary.md` 不在可写范围内。因此实际报告为 **`/Users/hanwang/Documents/workspaces/rocketMath/docs/uitest-tsc-summary.md`**；没有修改上一轮 summary.md。

**只读核对与根因**

只读查看了当前 RootView、PlayView、NumpadView、PracticeView、RaceView、ProbeView、报告/我的/家长/账号页面、相关模型和三年级题库配置，以及协调进程日志目录 `xingya-xcode-20261110-135129`。没有修改原日志或 xcresult。

- `iphone-test.log:5058` 和 `ipad-test.log:5949` 均记录 **33 个单元测试、9 个 suite 通过**。这是协调进程已执行的结果，不是本轮重新运行结果。
- iPhone 失败位于旧测试第 223 行。日志在输入两位数后（约 55.79 秒）尝试点击“确定”，随后只剩“我记住了，再来一次”纠错按钮。核对源码后确认：**“确定”并未被产品移除或改名**，它仅在题面状态存在；超时后 stage 隐去键盘并呈现纠错层。旧测试把“刚才有题”当成“现在仍能提交”，并把点击次数当作成功答题数。
- iPad 失败位于旧测试第 53 行。日志显示 `chart.bar.fill` / `报告` 两层嵌套 Button，并有 `_UIFloatingTabBarItemCell` 的自动化类型映射提示。全局 `app.buttons["报告"]` 因多匹配无法点击。
- 旧测试还存在热身/报告缺失时直接返回、竞速读不到题就 continue，以及家长错题断言末尾 `|| true`。本轮移除这些可掩盖失败的路径，未使用 skip。

**现在的真实端到端断言**

| 步骤 | 当前测试要求 |
| --- | --- |
| 热身 → 地图 | UITEST_MEMORY 下必须出现热身，逐一读取“请按 N”，完成 10 次真实按键，并确认每次试次推进、最终出现地图。不能因探针缺失直接通过。 |
| 报告初始值 | 从 Tab 打开报告，确认唯一的总题数值为 0，再返回首页。 |
| 非限时练习 | 从地图进入三位数加法竖式；读取并计算实际题干，输入“正确答案 + 1”和“正确答案 + 2”两个必错值，验证第一次尝试提示、第二次揭示及正确答案。重试前明确清空保留的旧输入。 |
| 下一题答对 | 点击下一题，确认题干改变，计算并提交实际答案；必须出现“一次就对”反馈和经验奖励。 |
| 家长区与落盘 | 经真实 PIN 设置门进入家长面板，核对刚才的原题干、首次错误作答和正确答案；不再以“面板存在”替代错题保存检查。PIN 仅是测试固定值，不是用户或演示账号凭据。 |
| 口算纠错与重测 | 停止输入触发真实超时，读取纠错等式并验证答案；点击重教按钮后，必须出现“再试一次”且题目与刚才相同，随后必须成功通过至少一次重测。 |
| 持续答题与阶段推进 | 至少完成 14 次非重测正确作答。以进度文字变化或阶段完成状态确认结果，超时不计成功；要求实际出现起飞通过反馈，继续后进入环绕阶段。持续纠错超过上限会失败。 |
| 竞速 | 选择现有挑战档，读取实际题目并显式点击确定，逐题验证“已答对 1…6 题”计数；读题或提交失败不跳过。测试不等待完整 60 秒结算，不声称覆盖了结算。 |
| 学习结果与导航 | 真实逐层返回地图；报告总口算题数至少 16（超时 + 成功重测 + 14 次普通命中），正确率介于 0 与 100，且存在练习统计。我的页答对成就至少 15，并保留家长中心/账号入口，最后切回首页。 |

为减少 XCTest 多次取快照/点击产生的额外延迟，热身按键使用明确的 **3 秒输入节奏**。它仍走生产探针的“中位数 × 2.5，再夹到 2–6 秒”逻辑，使本次测试获得既有 6 秒上限；没有改 App 的倒计时、规则、题库、进度或新增跳过逻辑。随后刻意等待真实超时，确保时间限制和纠错仍被测试。正常界面等待使用条件等待，不用固定睡眠冒充状态同步。

在输入每个数字和提交前检查纠错状态及控件可点击性；若题目已经超时，回到重教路径，不虚增正确计数。有限次数内仍无法完成学习会保留失败截图及元素树，不降低断言来变绿。

**iPad 多匹配处理**

Tab 查询同时限定现有 SF Symbol identifier 和中文 label。先在 `app.tabBars.buttons` 中定位；若浮动栏不暴露在 TabBar 节点内，再使用相同的精确二元条件查询按钮。对候选项按结构排除仍包含同名按钮后代的外层包装，只保留可点击的叶节点，并要求数量严格等于 1。仅在唯一性已断言后使用 `[0]` 点击，绝不直接使用全局 firstMatch 或碰运气的固定索引。

每次点击后还必须验证对应页面内容：首页 home-menu、报告数值、我的页资料与成就。测试不依赖 `_UIFloatingTabBarItemCell` 等私有类名，也未改变 TabBar 产品布局。

为读取真实结果，仅给现有题面、纠错按钮、进度、练习输入/提交、竞速速度/计数、报告 KPI 数值添加 accessibilityIdentifier。未改变可见文案、VoiceOver 标签、计算逻辑或会员逻辑。本轮未确认需要额外修复的产品功能 bug；更强的状态和结果断言若暴露运行时问题，应按新的 xcresult 继续定位，不应删断言。

**Google 类型修复**

`src/google.ts` 的 RSASSA-PKCS1-v1_5 verify 调用只将签名字节参数从 `sig` 改为 `new Uint8Array(sig)`，使拷贝明确由 ArrayBuffer 支撑。没有改算法、公钥获取、签名内容、audience、issuer、iat/exp 或 Google 登录产品行为。

**本轮实际执行的验证**

以下两条均在仓库根目录执行，各自工具返回的退出码均为 **0**：

```sh
npx tsc --noEmit
npm test -- --reporter=dot
```

全仓 tsc 没有剩余错误。npm test 为 **7 文件、117 项测试通过**（含上一轮 21 项后端可靠性测试），未新增与字节拷贝实现重复的机械测试；未安装依赖。

另外实际执行并通过（退出 0）：

```sh
xcrun swiftc -frontend -parse \
  ios/XingyaUITests/PlaythroughUITests.swift \
  ios/Xingya/Views/PlayView.swift ios/Xingya/Views/PracticeView.swift \
  ios/Xingya/Views/RaceView.swift ios/Xingya/Views/ReportView.swift

xcrun swiftc -typecheck -swift-version 6 -strict-concurrency=complete \
  -target arm64-apple-ios17.0-simulator \
  -sdk /Applications/Xcode-27.1.0.app/Contents/Developer/Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator27.1.sdk \
  -F /Applications/Xcode-27.1.0.app/Contents/Developer/Platforms/iPhoneSimulator.platform/Developer/Library/Frameworks \
  -I /Applications/Xcode-27.1.0.app/Contents/Developer/Platforms/iPhoneSimulator.platform/Developer/usr/lib \
  -module-cache-path /private/tmp/xingya-uitest-tsc-module-cache \
  ios/XingyaUITests/PlaythroughUITests.swift
```

第二条是针对 UI 测试源码及 XCTest/XCUIAutomation API 的独立类型检查，不是 App 链接、启动或模拟器测试。未关闭宏沙箱或任何安全限制。六个本轮修改文件的定向 `git diff --check` 也退出 0。

**没有执行更新后的完整 iPhone/iPad scheme**；仍须由协调进程分别在所列 iPhone 17 和 iPad Pro 13-inch 模拟器上复跑，使用新的隔离 DerivedData/xcresult。上一轮的 UI 失败日志不能作为本轮成功证据。UI 截图只会随未来测试作为 xcresult attachments 输出，本轮未生成/覆盖旧 ios/store 截图或旧 Archive。

**会员/订阅入口只读结论**

`AccountView` 的会员区并非永远只有占位：未开通且 `store.products.isEmpty` 时显示“订阅商品即将上线”；能加载商品时展示名称、描述和 StoreKit 返回的价格，点击会调用真实 purchase；已有权益则显示已开通，且恢复购买入口始终存在。`StoreKitService` 确有购买/验证/恢复逻辑，scheme 的本地 StoreKit 配置不等于线上 ASC 商品已配置。

核对全原生源码：`isPremium` / 商品权益在账号会员区使用；RootView、知识地图可用口算/练习路由、GameModel、PracticeModel 没有按会员状态阻断核心学习。地图自己的 comingSoon 状态是内容路由状态，不能解释为订阅付费门。当前入口**不挡住核心口算/练习**，但不能将整个会员模块描述为完全无交易能力的占位。本轮未购买、恢复、改价格/商品 ID/权益门闸或进入 ASC 核验，也未替产品方决定会员权益。

**隐私/支持入口只读现状**

账号页“关于”已保留上一轮的隐私政策、App 支持链接（可从首页更多菜单或我的页账号进入）：

- `https://rocket-math-4kg.pages.dev/privacy.html`
- `https://rocket-math-4kg.pages.dev/app-support.html`

界面明确写有 **“线上可达性待核验”**，并保留离线可读的数据、同步、AI 样例发送和支持渠道说明。页面源码也标明待部署核验；尚没有可用的人工联系邮箱/表单。本轮未重新验证上线或可达、未编造联系人，也未把商业 support.html 作为隐私权利联系渠道。

**建议协调进程截图顺序与数据要求**

建议每种设备使用新的输出目录，与旧成片/Archive 分开。先复跑完整 scheme，再选择以下实际界面，不用“可上传”替代人工校稿：

1. 三年级知识地图，保留首页/报告/我的导航，展示当前原生信息架构。
2. 竖式练习题面；可另保留揭示答案作为功能核对，不把它当作已完成整套练习。
3. 口算题面和纠错重教；阶段截图应与实际起飞/环绕状态一致。
4. 竞速速度选择或已实际答题的竞速画面，不把未结算截图标成竞速最终成绩。
5. 使用本轮合成答题记录的学习报告，核对总题数、正确率和排版。
6. 家长错题本，使用合成题目/作答；避开正在输入 PIN 的画面。
7. 我的页，以及账号页隐私/支持说明（可作为审核材料补充）；拍账号页时先确认是退出登录空状态，或由协调进程使用独立非真实账号。

不要出现真实邮箱、用户名、孩子真名、token、演示密码、真实 PIN、真实家庭答题记录或交易信息。优先使用新测试容器和 UITEST_MEMORY 的合成记录；该参数只保证学习库在内存，**不等于自动清空既有 Keychain 登录态**，截图前必须确认账号页实际状态。不要读取/打印凭据来核验。会员页面若显示本地 StoreKit 商品，不能将其价格或可购买状态表述为线上已核验。

**本轮文件清单（未 commit）**

- `ios/XingyaUITests/PlaythroughUITests.swift`：按当前界面改写流程、唯一 Tab 查询、条件等待与结果断言。
- `ios/Xingya/Views/PlayView.swift`：仅补口算进度、题面与纠错/继续控件标识。
- `ios/Xingya/Views/PracticeView.swift`：仅补题面、输入与提交标识。
- `ios/Xingya/Views/RaceView.swift`：仅补速度选择、题面与实际答对计数标识。
- `ios/Xingya/Views/ReportView.swift`：仅补报告数值标识。
- `src/google.ts`：一处 verify 签名字节拷贝。
- `docs/uitest-tsc-summary.md`：本报告（新增，权限限制下的实际路径）。

没有修改 Capacitor 产品代码、IAP、上一轮可靠性修复的业务策略、工程 scheme、旧截图/Archive、备份或协调进程产物。不能据本轮静态检查与 npm 测试声称更新后的 UI 已在两种设备通过，更不能宣称可上传审核。
