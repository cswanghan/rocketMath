# App Review Notes（版本审核备注，粘贴到 App Review Information）

**本稿不是已经提交的审核回复，也不是发布完成。** 只给协调进程粘贴到 ASC。
针对 Guideline 2.3 Accurate Metadata：被拒的是 1.0.0 **build 1**。请将本备注与即将上传的 **build 2** 以及下方会员真实界面截图一起使用。
演示账号：用户名 `appstore_review`。密码请从仓库已有文档 `ios/ASC_SUBMIT.md` 复制，不要另设新密码。

```
This resubmission is Xingya 1.0.0 build 2 (App Apple ID 6793418759, bundle com.hanwang.xingya). The previous rejected binary was 1.0.0 build 1 (Guideline 2.3 Accurate Metadata). That rejection said premium cloud sync and AI parent summaries described in the metadata could not be found. This build includes the real monthly-membership UI and flows described below. Practice, fluency, and on-device analysis remain free and work offline without an account or subscription.

How to review the free core
1. Open the app, choose Grade 3 (or any grade 3–9), complete the first-run warm-up probe if it appears, then use the Home tab.
2. Open an unlocked knowledge-map topic. Fluency items use a timer; written-calculation and concept items are untimed practice.
3. After feedback, tap Continue (or the English equivalent). The app does not auto-advance.
4. The Report tab shows on-device results. These features work without sign-in and without a subscription.

How to review membership (cloud sync + remote AI parent summaries)
5. Open the Me tab → Account (账号 / Account).
6. Sign in with the review account if you need to test sync or membership binding. Sign-in is optional for practice.
7. Scroll to Monthly membership. The app loads the auto-renewable product com.hanwang.xingya.premium.monthly (subscription group 22563981, product Apple ID 6832887439). You should see the StoreKit display name, description, displayPrice, a monthly period, Subscribe, and Restore. The price is not hard-coded in the UI.
8. Please complete a Sandbox purchase or restore with this review account. After server validation, the app should show that membership is active. Sandbox entitlements are labeled as sandbox test access, not a production payment.
9. Cloud sync: on the Account screen, use Sync now. It is a manual action (not a silent toggle). Success applies the server merge. Failures say so and leave offline practice available.
10. Remote AI parent summary: Me tab → Parent, set a 4-digit PIN on first use (device-local; we do not prescribe a PIN). In the parent mistake book, a signed-in, validated member can request a remote AI parent summary. A successful remote result is labeled as a remote AI parent summary. If the remote service fails, the app labels the result as free local analysis and does not present it as a cloud AI result. Local analysis is always available without a membership and is not evidence of the remote feature.

Account deletion and subscriptions
11. Account → Delete account, then confirm (Guideline 5.1.1(v)). Deleting the Xingya account does not cancel the Apple subscription; use Manage subscriptions first.
12. The membership section includes auto-renewal terms, Manage subscriptions, the Apple Standard EULA, and the privacy policy.

Other notes
- No special hardware. No advertising identifier.
- This is the app’s first subscription; it should be submitted together with this app version. The product is still Prepare for Submission until you attach it to the version.
- In-app prices come from StoreKit displayPrice. A saved China baseline in App Store Connect is not an approved live price.
- Privacy and support URLs: https://rocket-math-4kg.pages.dev/privacy.html and https://rocket-math-4kg.pages.dev/app-support.html (reachable). Contact: cswanghan@gmail.com. The live pages are still a July 2026 draft; an email update is pending deploy.
- We have not completed a real Sandbox purchase/restore in this session while the account holder is away. Please use the review account and Sandbox to verify purchase, restore, sync, and the remote summary. If a product catalog cannot load, the app shows that it is temporarily unavailable and free practice continues; that empty state is not a successful membership demo.
```
