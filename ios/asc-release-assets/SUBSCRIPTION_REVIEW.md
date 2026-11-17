# 订阅商品审核材料

商品：`com.hanwang.xingya.premium.monthly`  
组：`22563981`（星芽会员）  
商品 Apple ID：`6832887439`

首个订阅须关联 App 版本后一起提交。ASC 当前商品状态、可用地区、价格设置及版本关联由协调者在提交前核对；本次仅更新本地材料，未上传或提交。

## 商品本地化

中文显示名：星芽高级会员（月）  
中文描述：云同步 + AI 家长总结  
英文显示名：Xingya Premium Monthly  
英文描述：Cloud sync and AI parent summary

时长：1 个月自动续订。应用内金额取自 StoreKit `Product.displayPrice`，不能把本地测试目录的示例金额写成已批准或已验证的正式售价。

## 本次可用的干净截图

以下文件已于 2026-11-11 从 `ios/build/codex-release-fix/Paywall-Final.xcresult` 直接导出，均为 iPhone 17 Pro 原始 1206×2622 PNG：

- [简体中文会员页](screenshots/subscription-review/zh-Hans/05-membership-paywall.png)：未登录状态、免费练习说明、商品名、StoreKit 价格与月度周期、订阅和恢复购买入口。
- [简体中文续订条款](screenshots/subscription-review/zh-Hans/06-membership-terms.png)：续订说明、管理订阅、Apple 标准 EULA；中文一屏可同时展示，因此与会员页截图相同。
- [English membership](screenshots/subscription-review/en-US/05-membership-paywall.png)：对应英文会员页。
- [English renewal terms](screenshots/subscription-review/en-US/06-membership-terms.png)：续订条款、管理订阅、标准 EULA 和支持邮箱。

详见各目录的 [中文说明](screenshots/subscription-review/zh-Hans/CAPTION.md) / [English caption](screenshots/subscription-review/en-US/CAPTION.md)。旧的 Keychain 错误状态会员页已替换。

本次为 Debug UI 测试截图，使用明确的 `UITEST_SECURE_MEMORY` 启动参数隔离安全存储，起始未登录且没有伪造会员权益。生产构建继续使用 Keychain。订阅按钮因未登录而禁用；恢复购买按钮按实际逻辑可用，但未点击。

商品和价格来自测试方案附带的 `Configuration.storekit`，显示的是 StoreKit `displayPrice`。中文界面中本次目录返回的商品名/描述为英文，截图保留返回值。截图不是 Sandbox/正式商品可购买、真实交易验证或商品已批准的证明。没有执行购买或恢复购买。

## 给商品页的简短说明

```
Open Me → Account → Monthly membership.
Core practice and on-device analysis are free. Monthly membership adds manual cloud sync and remote AI parent summaries after sign-in and membership validation.
The screen shows the StoreKit product, displayPrice, monthly period, Subscribe, Restore purchases, auto-renewal terms, Manage subscription, and the Apple standard EULA.
These screenshots show a signed-out session. Subscribe is disabled until sign-in. No purchase was performed.
The displayed price comes from the attached local StoreKit catalog and is not a verified Sandbox/live or approved price.
```
