# English membership review screenshots

Captured 2026-11-11 on iPhone 17 Pro / iOS 26.5. Original PNGs: 1206×2622.

- `05-membership-paywall.png`: signed-out Account screen, monthly membership, free practice explanation, product name, monthly price, disabled Subscribe button, and Restore purchases.
- `06-membership-terms.png`: auto-renewal terms, Manage subscription, Apple standard EULA, privacy/support contact, and the local StoreKit debug disclosure.

The shown price is StoreKit `Product.displayPrice` returned from the attached `ios/Xingya/Configuration.storekit` catalog. It is not a verified Sandbox/live price or an approved selling price.

The Debug-only `UITEST_SECURE_MEMORY` argument selects empty token storage and isolated account defaults. The app is signed out; no premium entitlement is fabricated. Subscribe is disabled by the real authentication requirement. Restore remains available but was not tapped. No purchase or restore was performed. No secure-storage error appears.

English launch settings: `AppleLanguages=(en)`, `AppleLocale=en_US`, `appLanguage=en`. No status-bar date override was used.

Exported directly into this directory from `ios/build/codex-release-fix/Paywall-Final.xcresult` with official `xcrun xcresulttool export object --legacy`. No temporary screenshot copies, cropping, or image edits.
