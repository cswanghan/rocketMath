# 简体中文会员审核截图

2026-11-11，iPhone 17 Pro / iOS 26.5，原始 PNG 1206×2622。

- `05-membership-paywall.png`：未登录账号页、月度会员、免费练习说明、商品名、每月价格、禁用的订阅按钮、恢复购买，以及续订说明。
- `06-membership-terms.png`：续订说明、管理订阅与 Apple 标准 EULA。同一屏已能展示这些内容，因此本语言的两张截图相同。

价格是 StoreKit 从测试方案附带的 `ios/Xingya/Configuration.storekit` 目录返回的 `Product.displayPrice`。此目录在本次会话返回英文商品名/描述；它们保留了 StoreKit 返回的内容。该价格不是已验证的 Sandbox / 正式目录价格，也不代表已批准的售价。

截图使用 Debug 专用 `UITEST_SECURE_MEMORY` 空白安全存储及独立账号偏好设置。未登录，未创建会员权益；订阅按钮按实际逻辑禁用，恢复购买入口可用但未点击。没有进行购买或恢复购买。画面无安全登录存储错误。

从 `ios/build/codex-release-fix/Paywall-Final.xcresult` 使用官方 `xcrun xcresulttool export object --legacy` 直接导出至本目录，无临时截图复制、裁切或修改。
