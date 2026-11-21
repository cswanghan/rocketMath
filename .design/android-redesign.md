# Android redesign — 2026-11-18

Mode: redesign. Existing reports/brief: none. Product: 星芽, a Chinese-language learning app for children and parents. Primary job: choose a subject/grade, start a short exercise, understand the result, and keep progress offline.

Confirmed Build 1 findings from emulator screenshots: web-style floating account links; overlarge equal-weight subject cards; no persistent app navigation; overly large typography and shadows; inconsistent iframe language modules; login leaves the learning shell; variable action placement. Keep all curriculum, engines, local storage keys, optional account API, native TTS and the 1-second oral-answer rule.

Direction: Material 3-inspired Android learning workspace. Three persistent destinations (学习/进度/我的), 64dp app bars, 48dp minimum control targets, full-screen focused exercises, semantic green action color, neutral surfaces, 4/8dp spacing, 12/16/24dp shapes, system typography, bottom-sheet grade selection, account forms inside the app, phone/tablet recomposition and dark theme. Learning has subject tabs and concise activity/course lists. Progress uses actual local records; no invented stats. Parent controls stay behind the existing PIN.

Implementation keeps React/Capacitor and replaces the Android product shell; it does not claim a Kotlin/Compose rewrite. Web and iOS routes stay separate. Native header/footer and legacy learning module styles use one Android token system.

References: https://m3.material.io/components/navigation-bar/guidelines ; https://developer.android.com/develop/ui/compose/designsystems/material3 ; https://support.google.com/accessibility/android/answer/7101858 .

Verification: record actual final results in docs/android; no claim of TalkBack or physical-device testing without running it.

Final verification: Android build 2 delivered. Actual emulator flows and five viewport/theme configurations passed; reviewed rendered learning, grade sheet, progress, account, reading, characters, vocabulary, question and keypad screenshots. Adjusted settings placement, hidden word-definition spacing, large-font week labels and dark language surfaces after inspection. TypeScript, 546 regression tests, 5 content tests, Android build/lint and read-only native HTTP smoke test passed. See docs/android/acceptance-build2-2026-11-18.md for exact evidence and untested real-device/TalkBack/account cases. Main interaction targets are at least 48dp; full accessibility certification is not claimed.
