# 星芽 · App Store 上架材料（P4）

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


> 填写 App Store Connect 时直接复制。版本：`1.0.0`（Build 1）  
> Bundle ID：`com.hanwang.xingya` · Team：`QY29J9ZMPU`  
> 主语言：**简体中文**  
> **完整提交步骤见 `ios/ASC_SUBMIT.md`**

---

## 1. 基本信息

| 字段 | 内容 |
|------|------|
| **名称**（30 字内） | 星芽 - 数学口算与练习 |
| **副标题**（30 字内） | 3–9 年级 · 本地优先 · 家长可看 |
| **推广文本**（170 字，可随时改） | 口算与知识地图练习免费，离线也能学。家长区免费看错题和本地分析；月度会员登录后可手动云同步与使用 AI 家长总结。 |
| **类别** | 教育（主） / 儿童（副类可空，**暂不进 Kids 类目**） |
| **内容版权** | © 2026 星芽 |
| **年龄分级** | **4+**（无不当内容；有账号可选） |
| **加密** | 仅使用 HTTPS / 标准加密 → 已设 `ITSAppUsesNonExemptEncryption = NO` |

---

## 2. 关键词（100 字符内，英文逗号分隔）

```
数学,口算,小学数学,初中数学,竖式,练习,错题本,人教版,三年级,计算流畅
```

（计数约 45 字，可按审核反馈微调，勿堆竞品名。）

---

## 3. 描述（4000 字内）

```
星芽是一款面向 3–9 年级学生的数学练习应用：限时口算练流畅度，知识地图练概念与竖式，家长可查看错题本。

【为什么用星芽】
• 本地优先：不登录也能完整练习，进度保存在本机
• Rocket Math 式掌握循环：起飞 → 轨道 → 宇宙，答错立即重教再重测
• 知识地图：按上/下册单元组织，口算、竖式、概念分题型练习
• 家长区（PIN）：错题本、偏慢题与免费本地分析；会员可主动请求 AI 家长总结
• 健康使用：连续练习约 15 分钟后强制休息，避免刷太久
• 可选账号：会员登录后可手动同步约定范围的进度，完整报告和本机设置不在同步范围

【适合谁】
小学 3–6 年级与初中 7–9 年级学生；家长可一起看错题与建议。

【隐私】
默认学习数据保存在本机。登录会员主动同步时才上传约定范围的进度；主动请求 AI 时发送错题样例。我们不做广告追踪。详见应用内与官网隐私政策。

【订阅说明】
首版仅一个月度自动续订：口算、练习与本地分析免费且可离线；登录并拥有有效会员后可使用云同步和远程 AI 家长总结；远程失败时会明确显示本地免费分析，不冒充会员云端结果。ASC 中国大陆基准价 CNY 18.00 已保存，其他地区由 Apple 自动换算；商品尚未提交/批准且中国大陆未勾选，本地 StoreKit 18 仅示例，均不能称为已批准上架价。订阅按月自动续订，可在 Apple 订阅设置中管理/取消。
```

---

## 4. 更新说明（“此版本的新内容”）

```
首发版本：
• 3–9 年级知识地图与练习
• 限时口算（起飞/轨道/宇宙）与竞速
• 错题本与家长 PIN
• 可选登录与云同步
• 经验等级与健康时间锁
```

---

## 5. URL

| 用途 | URL |
|------|-----|
| **隐私政策**（必填） | https://rocket-math-4kg.pages.dev/privacy.html |
| **支持网址**（必填） | https://rocket-math-4kg.pages.dev/app-support.html |
| **支持/隐私联系邮箱** | [cswanghan@gmail.com](mailto:cswanghan@gmail.com)（已授权用于发布材料；网页源码更新待部署） |
| **营销网址**（可选） | https://rocket-math-4kg.pages.dev/ |

---

## 6. App 审核备注（Review Notes）

```
【演示说明】
1. 打开 App → 选择「三年级」（或任意年级）
2. 首次进入会有「热身」手速探针，按屏幕提示数字完成即可
3. 知识地图点任意未锁 topic 即可练习；口算类进限时训练，竖式/概念类进非限时练习
4. 家长区：右上角「…」→「家长」→ 设置 4 位 PIN → 可查看错题本
5. 账号（可选）：「…」→「账号」→ 登录/注册。演示账号见下
6. 删除账号：账号页 →「删除账号…」→ 确认（Guideline 5.1.1v）
7. 订阅：「我的 → 账号 → 会员」；1.0 必须完成真实目录与会员验证。商品不可用为错误/待配置状态，不能以占位交付；核心练习免费。

【无需特殊硬件】
【登录】非强制。演示账号：
  用户名：appstore_review
  密码：[stored only in App Store Connect]

【内购】
产品 ID：com.hanwang.xingya.premium.monthly（商品已创建、Prepare for Submission，1.0 仍须完成审核关联/提交；Sandbox 加载/购买未验证）
核心练习始终免费。
```

---

## 7. 年龄分级问卷建议

- 卡通暴力 / 写实暴力：**无**
- 色情 / 恐怖 / 酒精赌博：**无**
- 未受限制的网页访问：**无**
- 用户生成内容公开分享：**无**（错题仅本机/账号私有）
- 赌博：**无**
- **账号**：可选（可选择「应用内可创建账号」）
- **频繁 / 强烈成人/性内容** 等：全否
- 结论倾向 **4+**

暂不勾选 **Made for Kids**（需额外 COPPA 与隐私政策审查；P3 有账号后更合适再评估）。

---

## 8. 截图（已完成，直接上传）

### 推荐上传目录

| ASC 展示位 | 目录 | 尺寸 | 张数 |
|------------|------|------|------|
| iPhone 6.7" | `ios/store/screenshots/final-iphone-6.7/` | 1290×2796 | 5 |
| iPhone 6.9" | `ios/store/screenshots/final-iphone-6.9/` | 1320×2868 | 5 |
| iPad 13" | `ios/store/screenshots/final-ipad-13/` | 2048×2732 | 5 |

文件顺序（已编号）：

1. `01-按单元学.png`
2. `02-限时口算.png`
3. `03-竖式与概念.png`
4. `04-竞速挑战.png`
5. `05-家长错题本.png`

成片含蓝紫营销顶栏 + 真机 UI。若 ASC 要求纯 UI，改用 `upload-iphone-6.7/` 与 `upload-ipad-13/`。

### 重新生成

```bash
./ios/tools/make-store-screenshots.sh
```

---

## 9. 订阅（StoreKit）在 ASC 的配置

1. 打开现有 App（Apple ID `6793418759`）→ App 内购买项目 → 订阅  
2. 已创建订阅群组：`22563981`（星芽会员）  
3. 产品 ID（必须一致）：`com.hanwang.xingya.premium.monthly`  
4. 时长：1 个月自动续订；ASC 中国大陆基准价 CNY 18.00 已保存；其他地区由 Apple 自动换算。本地 StoreKit 18 仅示例。商品尚未提交/批准，审核截图缺失，中国大陆未勾选；真实 Sandbox 商品加载/购买未验证  
5. 本地化：显示名称「星芽高级会员（月）」；描述「云同步 + AI 家长总结」  
6. App 隐私问卷与本仓库 `PrivacyInfo.xcprivacy`、线上隐私政策对齐  

---

## 10. 提交前检查表

- [x] 协调已确认现有 App：Apple ID `6793418759`，Bundle `com.hanwang.xingya`
- [x] 隐私政策与支持 URL 已核实可达（线上仍为 2026-07 旧稿）
- [ ] 部署更新后的 privacy.html / app-support.html，并核对两页均显示支持/隐私邮箱 cswanghan@gmail.com
- [x] 协调已确认商品为 Prepare for Submission（已创建，未提交/未批准）
- [ ] 补齐商品审核截图，解决中国大陆未勾选（174/175）
- [ ] 后端部署完成，真实 Sandbox 加载/购买与两项会员功能通过
- [ ] 截图已上传（iPhone + 建议 iPad）
- [ ] 审核备注已填；演示账号已创建（如需）
- [ ] Xcode Archive → Distribute → App Store Connect
- [ ] 出口合规：否（已 Info.plist 声明）
- [ ] 内容版权与年龄分级已保存

---

## 11. 英文副文本（可选副语言 en-US）

**Name:** Xingya Math  
**Subtitle:** Fluency & practice, grades 3–9  
**Keywords:** math,fluency,elementary,practice,times tables,workbook  

**Description (short):**  
Xingya helps grades 3–9 build math fluency with timed drills and a knowledge-map practice path. Local-first (works offline). Optional sign-in for cloud sync. Parent PIN unlocks a mistake book and summaries.


## 2026-11-10 月订实施与发布前提（以文首已核实状态为准）

首版仅一个月度自动续订：口算、练习与本地分析免费且可离线；登录并拥有有效会员后可使用云同步和远程 AI 家长总结；远程失败时会明确显示本地免费分析，不冒充会员云端结果。ASC 中国大陆基准价 CNY 18.00 已保存，其他地区由 Apple 自动换算；商品尚未提交/批准且中国大陆未勾选，本地 StoreKit 18 仅示例，均不能称为已批准上架价。订阅按月自动续订，可在 Apple 订阅设置中管理/取消。

原生会员使用 Apple 交易账号标记及服务端官方 API 验证；未配置验证服务时拒绝云同步/AI，不影响离线练习。需先应用 `src/db/migrations/native_membership.sql` 并配置后端验证环境；具体 secret 名、迁移兼容风险和测试范围见 `docs/membership-implementation.md`。无账号标记的历史购买不可自动认领；删除星芽账号不会取消 Apple 订阅。

中文：星芽高级会员（月）／云同步 + AI 家长总结。英文沿用：Xingya Premium Monthly／Cloud sync and AI parent summary。商店价格与周期由 StoreKit 返回并展示。Apple 标准 EULA：https://www.apple.com/legal/internet-services/itunes/dev/stdeula/ 。隐私与支持沿用 privacy.html、app-support.html，两个 URL 已核实可达；线上仍为 2026-07 旧稿，尚未包含本次邮箱，源码更新待部署。支持/隐私联系：[cswanghan@gmail.com](mailto:cswanghan@gmail.com)。本轮未部署，也未写入 ASC。
