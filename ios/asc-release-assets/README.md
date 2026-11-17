# 星芽 1.0.0 build 2 · ASC 资料交接（草稿与截图目录）

**状态：资料草稿已写好，供协调进程在已登录的 ASC 浏览器上传。本目录不是提审，也不是发布完成。不要把旧蓝紫营销截图或 7 月「订阅即将上线」账号页再上传。**

核验基准（2026-11-11，Asia/Shanghai，协调进程只读 ASC，未重复登录）：

- App Apple ID `6793418759`，Bundle `com.hanwang.xingya`，版本 1.0.0。
- 被拒的是 **build 1**，不是 build 2。Guideline **2.3 Accurate Metadata**（记录为 2.3.0）。
- 商店本地化：仅 **zh-Hans**；**en-US 尚未添加**。
- 截图：可选「iPhone with Dynamic Island (large display)」现有 **5/10 张旧图**（旧紫顶栏 UI，不是向阳 v3）；必需的「iPhone with Dynamic Island (medium display)」为 **0/10**。
- 订阅组 `22563981`，商品 `com.hanwang.xingya.premium.monthly` / Apple ID `6832887439`，仍为 **Prepare for Submission**；商品审核截图为空。**首个订阅须随本版本一起提交**。
- 本轮未再次核验中国大陆订阅勾选。仓库里曾分别出现 174/175 与后来纠正为 175/175 的记录，上传前请在商品可用性页再看一眼，不要用本稿断言任一数字。

## 请上传的文案

| 用途 | 文件 |
| --- | --- |
| 简体中文商店文案（名称/副标题/推广/描述/关键词/此版本新内容） | `STORE_LISTING_zh-Hans.md` |
| 英文 en-US 商店文案（添加 en-US 本地化后粘贴） | `STORE_LISTING_en-US.md` |
| 版本审核备注（App Review Information） | `REVIEW_NOTES.md` |
| 订阅商品审核说明与截图用途 | `SUBSCRIPTION_REVIEW.md` |

演示账号用户名仍是仓库已有的 `appstore_review`。密码不要改新的，请从现有 `ios/ASC_SUBMIT.md` / `ios/APP_STORE.md` 复制到 ASC 审核信息字段；本稿不另写一遍密码。

## 截图目录（生成后放这里，勿用 /tmp 旧图）

官方尺寸（Apple Screenshot specifications，本轮查阅）：

- **必需** iPhone with Dynamic Island (medium display)：`1206×2622` 或 `1179×2556`。本机用 iPhone 17 Pro 直出 **1206×2622** → `screenshots/iphone-dynamic-island-medium-1206x2622/{zh-Hans,en-US}/`
- **建议替换旧 5 张** iPhone with Dynamic Island (large display)：`1260×2736` / `1290×2796` / `1320×2868`。本机用 iPhone 17 Pro Max 直出 **1320×2868** → `screenshots/iphone-dynamic-island-large-1320x2868/{zh-Hans,en-US}/`
- **若应用支持 iPad（本应用支持）则也必需** iPad 13-inch：`2048×2732` 或 `2064×2752` → `screenshots/ipad-13-2048x2732/{zh-Hans,en-US}/`
- 订阅商品审核截图（真实会员 UI：商品名、StoreKit `displayPrice`、订阅/恢复/续订说明）→ `screenshots/subscription-review/{zh-Hans,en-US}/`

约定文件名（各语言、各尺寸各一套，生成后才会出现 PNG）：

1. `01-home-knowledge-map.png` 首页知识地图
2. `02-practice.png` 练习/竖式
3. `03-fluency.png` 口算
4. `04-report.png` 报告
5. `05-membership-paywall.png` 会员付费墙（商品名+价格+购买/恢复同屏）
6. `06-membership-terms.png` 自动续订说明 + 管理订阅 + EULA（订阅审核可复用）

规则：全新真实向阳实现；无营销蓝紫顶栏；无调试「本地 StoreKit 示例价」条（优先 Release 模拟器构建）；价格必须是界面上的 `displayPrice`，文案不写死 ¥18；不要搬运 `/tmp/xingya-codex-v3/` 或任何被拒 /tmp 文件。

## 尚未完成（不要当成已提交）

- 题库英文化仍在本机 Codex 进行中，未达可靠覆盖前不宣称英文题库已完成，也不建议把未译应用题拿去当 en-US 商店图。
- 临时 appleDebug / 诊断日志清理、签名 IPA、上传 build 2 尚未做。
- 真实 Sandbox 购买/恢复仍未由用户验证。
- 隐私/支持页 URL 可达，但线上仍为 2026-07 旧稿，邮箱更新待部署。
