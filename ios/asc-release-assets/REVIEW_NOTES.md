# App Review Notes — 1.0.0 (6), internal draft

**Not submitted. Physical-device validation is partial; Apple sign-in still fails against the old live backend.** See `docs/asc-reviewer-notes.md` for current evidence and open checks. The backend fixes have not been deployed and no build has been uploaded in this work.

## Draft text

This change contains source fixes for the Sign in with Apple and in-app purchase failures reported for Xingya 1.0.0 (5) under Guidelines 2.1(a) and 2.1(b). It is not yet evidence of a complete fix in the live review environment.

In the recovered local source, a Sign in with Apple challenge expired five minutes after the user began authorization. Slow first-time consent could therefore be rejected. The updated backend source allows a 30-minute authorization window while retaining one-use challenges, cryptographic nonce checks and token validation. It removes an additional token-age limit and adds categorized failure diagnostics without credentials or raw Apple responses. **These backend changes are not deployed: the live challenge still lasts 300 seconds and the server still returns the old generic expiry message.** Client state retention across delayed/background callbacks is covered by injected regression tests; cancellation has also been observed to return silently on the physical iPhone described below. The immediate physical-device retry still failed, so the five-minute window cannot explain every failure. The exact live rejection reason remains unknown.

The previous product-loading path did not retry an empty StoreKit catalog and could show raw purchase errors. Build 6 retries temporary failures and empty results with bounded backoff, requests the catalog again when the Account screen reappears, and offers a localized Retry action. Purchase cancellation returns silently. Successful server entitlement binding is preserved without a redundant second status request turning a completed purchase into a reported failure.

Review paths:

1. Free practice: choose a grade, finish the initial warm-up if shown, then open Home. Free practice and on-device reports do not require an account or subscription.
2. Apple sign-in: Me → Account → Sign in / Create account → Continue with Apple. This is separate from the username/password review-account path.
3. Subscription: sign in with the review account from the controlled App Review Information fields, then open Me → Account → Monthly membership. The product is `com.hanwang.xingya.premium.monthly`. Name and price come from StoreKit. If temporarily unavailable, choose Retry or revisit Account.
4. Complete a Sandbox purchase and confirm active membership after server verification. Canceling should produce no error. To restore, use the original Xingya account and tap Restore purchases.
5. Account → Sync now performs manual server-verified cloud sync. Me → Parent → remote AI parent summary requires valid membership and an actual server response. Local analysis is free and is not proof of a remote result.
6. The membership section includes Manage subscriptions, renewal terms, privacy policy and the Apple Standard EULA. Deleting a Xingya account does not cancel its Apple subscription.

## Actual validation and evidence still required

Automated validation passed: 400 Vitest tests, TypeScript checking, Vite build, 90 unit tests plus 3 login UI tests on each iPhone/iPad simulator (iOS 26.5), and an unsigned generic iOS Release build with CFBundleVersion 6. Full commands and evidence boundaries are documented in the repository. Simulator injection tests and the local StoreKit configuration do not establish availability in App Review's storefront.

On November 17, a development-signed Build 6 from source commit `7bbffa4` was installed as an **in-place upgrade** on an **iPhone 16 Pro Max running iOS 27.3**, preserving existing data. It was launched independently with `devicectl`, without an Xcode StoreKit configuration. The device's primary Apple ID was not changed. This was not a fresh-install, TestFlight, or App Review distribution test, and no physical iPad has been tested.

| Physical-device check | Observed result |
| --- | --- |
| Real StoreKit catalog | **Passed for loading/display only:** the monthly product showed **US$2.99**. This does not prove Sandbox tester identity, a successful purchase, or server entitlement binding. |
| Cancel the first Apple authorization sheet | **Passed:** returned silently with no error. |
| Subsequent first completed Apple authorization | **Failed:** the old live backend returned `apple_invalid` and its generic expiry message. No successful login. |
| Fresh Apple authorization retried within one minute | **Failed again:** no successful login; an expired five-minute challenge is not established as the cause of this immediate failure. |

Read-only backend checks found a live challenge TTL of **300 seconds**. The newest production deployment was listed as three days old, branch `main`, source marker `2a02449`, from the earlier upload of uncommitted source; that marker does not prove byte-for-byte source identity. A bounded aggregate query of the preceding 20 minutes found six challenges across the observed attempt time buckets, all unconsumed. No challenge IDs, nonce hashes, user records or credentials were read. Under the recovered old route's ordering, this narrows the rejection to before successful challenge consumption/code exchange, but cannot identify the exact claims, nonce, JWKS network or challenge-validation cause. The old server has no categorized diagnostics for these attempts.

**Still unverified or unsuccessful:** successful Apple login on fresh physical iPhone/iPad installations; delayed authorization and actual background/foreground recovery; Sandbox tester/team and transaction-environment confirmation; a completed Sandbox purchase, server entitlement binding, purchase cancellation and restore; and offline restart retaining login with working free practice. The user reports a Sandbox account on the device, while the ASC team tester list inspected in this run was empty, so tester identity is not recorded as verified. Further acceptance work is in progress and results may be added only after observation. Do not claim complete end-to-end acceptance from the catalog or cancellation results.

According to the November 17 Issue #2 comment, the subscription is Ready for Review and currently unattached to a submission. The account holder must recheck the current state and include the subscription with build 6 in a later authorized submission. No deployment, upload or resubmission was performed here.
