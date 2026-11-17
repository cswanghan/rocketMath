# 星芽 · App Store Connect 提交手册（1.0.0）

> 历史操作记录。Build 6 的当前修复、实际测试结果和未完成验收以 [Issue #2 审核草稿](../docs/asc-reviewer-notes.md) 为准。本次未部署、上传或重新提审。

## 2026-11-10 协调进程核实的 ASC 状态（本轮未访问 ASC）

本节事实来自用户转述的协调进程浏览器核验；不是本次代码检查推断，也不是本轮 API 查询。

| 项目 | 精确状态 |
| --- | --- |
| 应用 | 星芽；Apple ID `6793418759`；Bundle `com.hanwang.xingya` |
| 已提交旧版本 | iOS 1.0.0 **build 1**：Rejected / Unresolved Issues；最近反馈 7 月 29 日，Guideline **2.3 Accurate Metadata**，尚无开发者回复 |
| 拒审原因 | 找不到元数据所描述的高级会员云同步增强和 AI 家长总结。新版本必须实际交付并可演示，不能以占位或本地分析代替远程结果 |
| 订阅组 | `22563981`（真实 ASC 组 ID，不是本地 StoreKit 配置内的模拟组编号） |
| 商品 | `com.hanwang.xingya.premium.monthly`；Apple ID `6832887439`；一个月自动续订；**Prepare for Submission**，尚未提交 |
| 价格及本地化 | 中国大陆基准价 **CNY 18.00 已保存**；其他地区由 Apple 自动换算；中英文已保存；本地 `.storekit` 的 18 仍仅本地示例，两者都不代表已获批上架价 |
| 共享/优惠 | 家庭共享关闭，无介绍优惠 |
| 可用性 | 订阅 **174/175，中国大陆未勾选**；应用本身 175/175。原因由协调进程调查，不能声称大陆已可购买/目录已就绪 |
| 审核材料 | 商品审核截图缺失；订阅尚未提交；真实 Sandbox 商品加载/购买未验证 |
| 协议/银行税务 | Paid Apps 协议、银行与税务均为 Active；不等于商品已批准或已可售 |
| 新源码版本 | App Debug/Release：1.0.0 **build 2**；未构建/归档/上传，旧 Archive 保持不动 |

[已核实商品页（仅供人工导航，本轮未打开）](https://appstoreconnect.apple.com/apps/6793418759/distribution/subscriptions/6832887439)

后端会员校验与 AI 服务仍未部署，审核路径尚不能宣称已实测成功。导航和证据草稿见 `docs/asc-reviewer-notes.md`，仅文档，未发送回复或邮件。


> 按顺序做。预计 **30–45 分钟**（首次建 App 略久）。  
> Bundle ID：`com.hanwang.xingya` · Team：`QY29J9ZMPU` · 版本：**1.0.0** · Build：**1**

---

## 0. 提交前自检（本机）

| # | 项 | 状态 |
|---|-----|------|
| 1 | 隐私政策 URL 已核实可达 | https://rocket-math-4kg.pages.dev/privacy.html （线上旧稿，邮箱更新待部署） |
| 2 | 支持 URL 已核实可达 | https://rocket-math-4kg.pages.dev/app-support.html （线上旧稿，邮箱更新待部署） |
| 3 | 截图成片 | `ios/store/screenshots/final-iphone-6.7/` + `final-ipad-13/` |
| 4 | 审核账号 | `appstore_review` / `[stored only in App Store Connect]` |
| 5 | 账号删除 | App 内「账号 → 删除账号」（Guideline 5.1.1v） |
| 6 | 加密声明 | `ITSAppUsesNonExemptEncryption = NO` |
| 7 | 类目 | Education |
| 8 | Xcode 已登录 Apple ID（含 Team QY29J9ZMPU） | **你确认** |
| 9 | ASC 已创建 App + 首版必需的唯一月订产品 | **你确认** |

重新 Archive：

```bash
./ios/tools/archive-for-asc.sh
# 或在 Xcode：Product → Archive
```

---

## 1. App Store Connect 创建 App（仅首次）

1. 打开 https://appstoreconnect.apple.com → **我的 App** → **+** → **新建 App**
2. 平台：**iOS**
3. 名称：`星芽 - 数学口算与练习`（商店显示名，可后改）
4. 主要语言：**简体中文**
5. Bundle ID：选择 **`com.hanwang.xingya`**  
   - 若列表没有：先到 [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) → Identifiers → **+** → App IDs → 注册 `com.hanwang.xingya`（Capabilities 默认即可；若用 IAP 勾选 In-App Purchase）
6. SKU：`xingya-ios-001`（任意内部标识，不公开）
7. 用户访问权限：完全访问

---

## 2. 订阅产品（1.0 必须完成真实月订）

1.0 已确定提供真实月订阅，不能跳过本节或用占位文案交付。核心口算/练习离线免费；云同步与 AI 家长总结需要有效会员。ASC 商品与基准价已保存，但审核截图缺失、中国大陆未勾选，商品尚未提交/批准；后端未部署，Sandbox 加载/购买未验证。

由用户/协调进程在 ASC 核对并配置（本轮未操作）：

1. App → **盈利** → **订阅** → 打开已有订阅群组 `22563981`（星芽会员）
2. 核对已创建订阅（商品 Apple ID `6832887439`）：
   - 产品 ID（**必须一字不差**）：`com.hanwang.xingya.premium.monthly`
   - 参考名称：Premium Monthly
   - 时长：1 个月
   - 订阅价格：ASC 中国大陆基准价 CNY 18.00 已保存，其他地区由 Apple 自动换算；本地 StoreKit 18 仍仅示例，商品尚未提交/批准，不能称为已批准上架价
3. 本地化（简体中文）：
   - 显示名称：`星芽高级会员（月）`
   - 描述：`云同步 + AI 家长总结`
4. 当前为 **Prepare for Submission**；先补商品审核截图、查明中国大陆未勾选问题，再完成版本关联与审核提交。当前不可称为可售/已批准

审核备注中已说明：核心练习不强制订阅。

---

## 3. App 隐私问卷（必填）

路径：App → **App 隐私** → 开始/编辑

按本 App 实际勾选（与 `PrivacyInfo.xcprivacy` 对齐）：

| 数据类型 | 是否收集 | 关联用户 | 用于追踪 | 用途 |
|----------|----------|----------|----------|------|
| 电子邮件地址 | 是（注册时） | 是 | 否 | App 功能 |
| 用户 ID | 是（账号 id） | 是 | 否 | App 功能 |
| 产品交互 | 是（学习进度，登录后同步） | 是 | 否 | App 功能 |
| 其他用户内容 | 是（错题文本，登录后同步） | 是 | 否 | App 功能 |
| 购买项目 | 是（若启用 IAP） | 是 | 否 | App 功能 |

- **是否用于追踪**：**否**
- **是否与第三方共享用于追踪**：**否**
- 未登录用户：数据仅本机，可不计入「收集」——但因提供可选账号，问卷按「有账号路径」勾选更安全。

隐私政策 URL（问卷里也要填）：

```
https://rocket-math-4kg.pages.dev/privacy.html
```

---

## 4. 版本页元数据（复制粘贴）

路径：App → **iOS App** → **1.0.0 准备提交**

### 名称
```
星芽 - 数学口算与练习
```

### 副标题
```
3–9 年级 · 本地优先 · 家长可看
```

### 类别
- 主：**教育**
- 副：（可空）

### 内容版权
```
© 2026 星芽
```

### 年龄分级
按问卷全否倾向 **4+**。  
**不要**勾选 Made for Kids（除非已准备好 COPPA 材料）。

### 推广文本（可随时改，不随版本审）
```
口算与知识地图练习免费，离线也能学。家长区免费看错题和本地分析；月度会员登录后可手动云同步与使用 AI 家长总结。
```

### 描述
```
星芽是一款面向 3–9 年级学生的数学练习应用：限时口算练流畅度，知识地图练概念与竖式，家长可查看错题本。

【为什么用星芽】
• 本地优先：不登录也能完整练习，进度保存在本机
• Rocket Math 式掌握循环：起飞 → 轨道 → 宇宙，答错立即重教再重测
• 知识地图：按上/下册单元组织，口算、竖式、概念分题型练习
• 家长区（PIN）：错题本、偏慢题与免费本地分析；会员可主动请求 AI 家长总结
• 健康使用：连续练习约 15 分钟后强制休息，避免刷太久
• 可选账号：会员登录后可手动同步约定范围的进度，完整报告和本机设置不在同步范围
• 可在应用内删除账号（账号 → 删除账号）

【适合谁】
小学 3–6 年级与初中 7–9 年级学生；家长可一起看错题与建议。

【隐私】
默认学习数据保存在本机。登录会员主动同步时才上传约定范围的进度；主动请求 AI 时发送错题样例。我们不做广告追踪。详见隐私政策。

【订阅说明】
首版仅一个月度自动续订：口算、练习与本地分析免费且可离线；登录并拥有有效会员后可使用云同步和远程 AI 家长总结；远程失败时会明确显示本地免费分析，不冒充会员云端结果。ASC 中国大陆基准价 CNY 18.00 已保存，其他地区由 Apple 自动换算；商品尚未提交/批准且中国大陆未勾选，本地 StoreKit 18 仅示例，均不能称为已批准上架价。订阅按月自动续订，可在 Apple 订阅设置中管理/取消。
```

### 关键词
```
数学,口算,小学数学,初中数学,竖式,练习,错题本,人教版,三年级,计算流畅
```

### 支持 URL
```
https://rocket-math-4kg.pages.dev/app-support.html
```

### 营销 URL（可选）
```
https://rocket-math-4kg.pages.dev/
```

### 隐私政策 URL
```
https://rocket-math-4kg.pages.dev/privacy.html
```

### 此版本的新内容
```
首发版本：
• 3–9 年级知识地图与练习
• 限时口算（起飞/轨道/宇宙）与竞速
• 错题本与家长 PIN
• 可选登录、云同步与应用内删除账号
• 经验等级与健康时间锁
```

---

## 5. 截图上传

### iPhone（若 ASC 提示 1242×2688 / 1284×2778）

**用这个目录（精确 1242×2688）：**

```
ios/store/screenshots/final-iphone-6.5/
```

备选（1284×2778）：`ios/store/screenshots/final-iphone-6.5-alt/`

按文件名顺序 **01 → 05**：

1. 01-按单元学.png  
2. 02-限时口算.png  
3. 03-竖式与概念.png  
4. 04-竞速挑战.png  
5. 05-家长错题本.png  

> 不要往「6.5"」位拖 `final-iphone-6.7/`（1290×2796），会报尺寸错误。

### iPad 13"

拖入：`ios/store/screenshots/final-ipad-13/`（同样 01–05，2048×2732）

---

## 6. App 审核信息

### 联系信息

支持/隐私联系邮箱：[cswanghan@gmail.com](mailto:cswanghan@gmail.com)。此邮箱已获用户授权用于星芽源码与发布材料；本轮未写入 ASC。隐私/支持 URL 已可达，线上 2026-07 旧稿尚无该邮箱，网页源码更新待部署。

### 登录信息（需要）
勾选 **需要登录信息**（方便测云同步 / 删号），填写：

```
用户名：appstore_review
密码：[stored only in App Store Connect]
```

### 备注（完整粘贴）
```
【演示说明】
1. 打开 App → 选择「三年级」（或任意年级）
2. 首次进入会有「热身」手速探针，按屏幕提示数字完成即可
3. 知识地图点任意未锁 topic 即可练习；口算类进限时训练，竖式/概念类进非限时练习
4. 家长区：右上角「…」→「家长」→ 设置 4 位 PIN → 可查看错题本
5. 账号（可选）：「…」→「账号」→ 登录/注册
6. 删除账号：账号页 →「删除账号…」→ 确认（Guideline 5.1.1v）
7. 订阅：「我的 → 账号 → 会员」；1.0 必须完成真实目录与会员验证。商品不可用为错误/待配置状态，不能以占位交付；核心练习免费。

【演示账号】
用户名：appstore_review
密码：[stored only in App Store Connect]

【无需特殊硬件】
【内购】产品 ID com.hanwang.xingya.premium.monthly（商品已创建、Prepare for Submission，1.0 仍须完成审核关联/提交；Sandbox 加载/购买未验证）；核心练习始终免费。
```

### 出口合规
选择 **否**（App 仅使用 HTTPS / 系统加密；已在 Info 声明 Non-Exempt Encryption = NO）。

### 广告标识符
**否**（未使用 IDFA / ATT）。

---

## 7. Xcode 上传构建（「缺少构建版本」必做）

> ASC 里 **构建版本 / App 图标** 都来自你上传的包。  
> 本地已有 Archive 与 Icon，但 **还没上传成功** 时，版本页会一直显示缺少构建、没有图标。

### 7.0 先登录 Xcode（否则 export 报 No Accounts）

1. 打开 **Xcode → Settings…（或 Preferences）→ Accounts**
2. 点 **+** → **Apple ID** → 登录（Team 需含 `QY29J9ZMPU`）
3. 选中该账号 → **Manage Certificates…** → 若没有 **Apple Distribution**，点 **+** 添加一条
4. 确认 [Developer Identifiers](https://developer.apple.com/account/resources/identifiers/list) 里已有 **`com.hanwang.xingya`**

### 方式 A：图形界面（推荐）

1. 打开 `ios/Xingya.xcodeproj`
2. 顶部运行目标选 **Any iOS Device (arm64)**（不要选模拟器）
3. 菜单 **Product → Archive**（约 1–2 分钟）
4. 自动打开 **Organizer**（或 **Window → Organizer → Archives**）
5. 选中最新 **Xingya 1.0.0 (1)** → **Distribute App**
6. 选 **App Store Connect** → **Upload** → Next
7. 保持 **Automatically manage signing** → Upload
8. 成功后到 ASC → 你的 App → 版本 1.0.0 → **构建版本** 点 **+** 选中包  
   （处理中可能要 **5–30 分钟**，状态从 Processing → 可用）

### 方式 B：命令行 Archive + Organizer 上传

```bash
./ios/tools/archive-for-asc.sh
# 然后 Xcode → Window → Organizer → Distribute App
```

CLI 直接 export 在未登录账号时会失败（`No Accounts` / `No profiles`），属预期，请用 Organizer。

### Icon 说明

- 工程内已有 **1024×1024 RGB、无透明**：`ios/store/AppIcon-1024.png`
- 构建包内已含 `AppIcon`（Archive 里可验证）
- **不必在 ASC 单独上传图标**；选中构建后商店图标会从构建里带出  
- 若仍提示缺图标：确认选中了构建，且重新 Archive 时 `ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon`

---

## 8. 提交审核

1. 构建处理完成（ASC 显示「可用」，可能需 5–15 分钟）
2. 版本页选择该构建
3. 确认截图、描述、隐私、审核备注均已填
4. **添加以供审核** → 提交

---

## 9. 常见拒审与应对

| 原因 | 预防 |
|------|------|
| 5.1.1(v) 无法删除账号 | 已实现：账号 → 删除账号 |
| 缺少隐私政策 | privacy.html 已可达；线上仍为 2026-07 旧稿，需部署并核对包含联系邮箱的源码修订 |
| 登录墙挡核心功能 | 未登录可完整练习 |
| 内购未配置/验证不可用 | 1.0 发布阻断：须完成真实目录、后端 Apple 验证与购买/恢复测试；核心练习仍免费 |
| 截图含调试 UI | 使用 `final-*` 成片，勿用 Simulator 状态条异常图 |
| 演示账号无效 | 已创建 `appstore_review`；提交前再登录测一次 |

快速验证演示账号：

```bash
curl -s -X POST https://rocket-math-4kg.pages.dev/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"appstore_review","password":"[stored only in App Store Connect]"}'
```

---

## 10. 一页速查（URL / 账号）

```
Bundle:     com.hanwang.xingya
Version:    1.0.0 (1)
Team:       QY29J9ZMPU
Privacy:    https://rocket-math-4kg.pages.dev/privacy.html
Support:    https://rocket-math-4kg.pages.dev/app-support.html
Review user: appstore_review
Review pass: [stored only in App Store Connect]
IAP id:     com.hanwang.xingya.premium.monthly
Screens:    ios/store/screenshots/final-iphone-6.7/ + final-ipad-13/
Full copy:  ios/APP_STORE.md
```


## 2026-11-10 月订实施与发布前提（以文首已核实状态为准）

首版仅一个月度自动续订：口算、练习与本地分析免费且可离线；登录并拥有有效会员后可使用云同步和远程 AI 家长总结；远程失败时会明确显示本地免费分析，不冒充会员云端结果。ASC 中国大陆基准价 CNY 18.00 已保存，其他地区由 Apple 自动换算；商品尚未提交/批准且中国大陆未勾选，本地 StoreKit 18 仅示例，均不能称为已批准上架价。订阅按月自动续订，可在 Apple 订阅设置中管理/取消。

原生会员使用 Apple 交易账号标记及服务端官方 API 验证；未配置验证服务时拒绝云同步/AI，不影响离线练习。需先应用 `src/db/migrations/native_membership.sql` 并配置后端验证环境；具体 secret 名、迁移兼容风险和测试范围见 `docs/membership-implementation.md`。无账号标记的历史购买不可自动认领；删除星芽账号不会取消 Apple 订阅。

中文：星芽高级会员（月）／云同步 + AI 家长总结。英文沿用：Xingya Premium Monthly／Cloud sync and AI parent summary。商店价格与周期由 StoreKit 返回并展示。Apple 标准 EULA：https://www.apple.com/legal/internet-services/itunes/dev/stdeula/ 。隐私与支持沿用 privacy.html、app-support.html，两个 URL 已核实可达；线上仍为 2026-07 旧稿，尚未包含本次邮箱，源码更新待部署。支持/隐私联系：[cswanghan@gmail.com](mailto:cswanghan@gmail.com)。本轮未部署，也未写入 ASC。
