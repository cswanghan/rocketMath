# App Review Notes — 1.0.0 (6), internal draft

**Not submitted. Not ready to claim physical-device or Sandbox acceptance.** See `docs/asc-reviewer-notes.md` for current evidence and open checks. The backend has not been deployed and no build has been uploaded in this work.

## Draft text

This change addresses the Sign in with Apple and in-app purchase failures reported for Xingya 1.0.0 (5) under Guidelines 2.1(a) and 2.1(b).

In the recovered local source, a Sign in with Apple challenge expired five minutes after the user began authorization. Slow first-time consent could therefore be rejected. Build 6 allows a 30-minute authorization window while retaining one-use challenges, cryptographic nonce checks and token validation. Authorization state survives waiting and app background/foreground transitions. Cancellation returns silently. Verification errors no longer all claim that authorization expired. The server records categorized failure reasons without credentials or raw Apple responses. These are source-confirmed defects; we have not reproduced the rejection on Apple's review devices.

The previous product-loading path did not retry an empty StoreKit catalog and could show raw purchase errors. Build 6 retries temporary failures and empty results with bounded backoff, requests the catalog again when the Account screen reappears, and offers a localized Retry action. Purchase cancellation returns silently. Successful server entitlement binding is preserved without a redundant second status request turning a completed purchase into a reported failure.

Review paths:

1. Free practice: choose a grade, finish the initial warm-up if shown, then open Home. Free practice and on-device reports do not require an account or subscription.
2. Apple sign-in: Me → Account → Sign in / Create account → Continue with Apple. This is separate from the username/password review-account path.
3. Subscription: sign in with the review account from the controlled App Review Information fields, then open Me → Account → Monthly membership. The product is `com.hanwang.xingya.premium.monthly`. Name and price come from StoreKit. If temporarily unavailable, choose Retry or revisit Account.
4. Complete a Sandbox purchase and confirm active membership after server verification. Canceling should produce no error. To restore, use the original Xingya account and tap Restore purchases.
5. Account → Sync now performs manual server-verified cloud sync. Me → Parent → remote AI parent summary requires valid membership and an actual server response. Local analysis is free and is not proof of a remote result.
6. The membership section includes Manage subscriptions, renewal terms, privacy policy and the Apple Standard EULA. Deleting a Xingya account does not cancel its Apple subscription.

## Evidence required before submission

Automated validation passed: 400 Vitest tests, TypeScript checking, Vite build, 90 unit tests plus 3 login UI tests on each iPhone/iPad simulator (iOS 26.5), and an unsigned generic iOS Release build with CFBundleVersion 6. Full commands and evidence boundaries are documented in the repository. **Fresh-install Sign in with Apple on physical iPhone/iPad and real Sandbox product loading, purchase and restore have not been performed in this task.** Neither simulator injection tests nor the local StoreKit configuration establishes availability in App Review's storefront. Do not remove this limitation or claim end-to-end verification until those runs are actually completed and recorded.

According to the November 17 Issue #2 comment, the subscription is Ready for Review and currently unattached to a submission. The account holder must recheck the current state and include the subscription with build 6 in a later authorized submission. No deployment, upload or resubmission was performed here.
