# Device-reviewed baseline (pre mid-flight) — Account / Auth / Membership

These are the SwiftUI sources the user reviewed on device (1.0.0 build 2). The copies now in `ios/Xingya/Views/AccountView.swift`, `AuthView.swift`, and `MembershipSection.swift` are an incomplete Codex rewrite and may not compile. Do not treat the mid-flight disk files as ground truth. Do not implement code in this design pass.

Problems in this baseline: system `List`/`Form`; bilingual stacked labels (会员 · Monthly membership, displayPrice / 每月 · per month, 订阅月度会员 · Subscribe, 恢复购买 · Restore purchases, legal links with English); pink text links as primary CTAs; sparse login form with weak button and empty chrome; instruction-manual footnotes.

Preserve product logic and meaning: login required before purchase; membership is monthly cloud-sync + AI parent summaries; practice stays free; price is StoreKit `displayPrice`; restore/refresh secondary; legal URLs unchanged; sandbox caption meaning retained; identifiers membership-purchase, membership-restore, account-login, account-sync, account-delete, auth-username, auth-password, auth-email, auth-error, auth-submit.

## AccountView.swift (baseline)

```swift
// 账号中心：登录态、云同步、订阅（StoreKit 2）。
// NavigationStack + List sections: 账号, 云同步 (if logged in), MembershipSection, 关于.
// Logged out: helper text + Button "登录 / 注册" (account-login).
// Logged in: username, 退出登录, 删除账号… (account-delete).
// Sync button account-sync. Links: privacy, app-support, mailto:cswanghan@gmail.com.
// Close toolbar "完成". Presents AuthView.
```

## MembershipSection.swift (baseline)

```swift
// Section title: "会员 · Monthly membership" (MUST become Chinese-only 会员 in the redesign).
// Benefit copy in Chinese then a second English paragraph (remove English in redesign).
// States: canUseCloud → "月度会员有效"; Sandbox hint; Apple purchase found but unverified; loading; empty catalog message.
// Product row: displayName, description, "\(displayPrice) / 每月 · per month", Button "订阅月度会员 · Subscribe" (membership-purchase).
// Disabled when not logged in, busy, loading, already premium/entitled.
// "请先登录…" when logged out.
// Button "恢复购买 · Restore purchases" (membership-restore); "刷新商品与权益".
// Renewal legal copy in Chinese + English; links "管理订阅 · Manage subscriptions", "使用条款 · Apple Standard EULA", "隐私政策 · Privacy", support email bilingual.
// URLs: https://apps.apple.com/account/subscriptions ; https://www.apple.com/legal/internet-services/itunes/dev/stdeula/ ; https://rocket-math-4kg.pages.dev/privacy.html ; mailto:cswanghan@gmail.com
```

## AuthView.swift (baseline)

```swift
// NavigationStack + Form. Segmented 登录 / 注册. Fields: 用户名, 密码, 邮箱 (register).
// Identifiers: auth-username, auth-password, auth-email, auth-error, auth-submit.
// Footer one line. Submit "登录" or "注册并登录", disabled when invalid/busy.
// Title "登录星芽" / "注册星芽". Toolbar 关闭. Sparse system Form with little visual weight.
```
