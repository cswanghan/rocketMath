#!/usr/bin/env bash
# Capture brand-new sunny-v3 store/review screenshots via official simctl / UI tests.
# Writes FIRST into this authorized repo directory. Do not copy /tmp/xingya-codex-v3 shots.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ASSET="$(cd "$(dirname "$0")" && pwd)"
OUT="$ASSET/screenshots"
DERIVED="$ROOT/ios/build/asc-screenshots-derived"
RESULT="$ASSET/xcresults"
mkdir -p "$OUT" "$DERIVED" "$RESULT"

# Device map: official 2026 ASC sizes
# medium Dynamic Island required: 1206x2622 (iPhone 17 Pro)
# large Dynamic Island optional: 1320x2868 (iPhone 17 Pro Max)
# iPad 13 required if iPadOS: 2048x2732 (iPad Pro 13-inch M5)
DEST_MEDIUM="platform=iOS Simulator,name=iPhone 17 Pro"
DEST_LARGE="platform=iOS Simulator,name=iPhone 17 Pro Max"
DEST_IPAD="platform=iOS Simulator,name=iPad Pro 13-inch (M5)"

echo "This script should be run only when no conflicting codex exec is editing the tree."
echo "Preferred configuration: Release, so DEBUG StoreKit disclaimer is absent."
echo "Output: $OUT"
echo "DerivedData: $DERIVED"
echo "Destinations: medium=$DEST_MEDIUM large=$DEST_LARGE ipad=$DEST_IPAD"
echo "UI tests to run: XingyaUITests/PaywallScreenshotUITests and SunnyUITests/Playthrough as available."
echo "After xcodebuild, export attachments with xcresulttool directly into $OUT. Do not read or copy /tmp/xingya-codex-v3/sim-shots."
