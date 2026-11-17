#!/usr/bin/env bash
# Release Archive 星芽 → 产出 .xcarchive，便于上传 App Store Connect
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PROJ="$ROOT/ios/Xingya.xcodeproj"
SCHEME="Xingya"
OUT="$ROOT/ios/build"
ARCHIVE="$OUT/Xingya.xcarchive"
EXPORT_PLIST="$OUT/ExportOptions.plist"

mkdir -p "$OUT"

cat > "$EXPORT_PLIST" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>app-store-connect</string>
	<key>destination</key>
	<string>upload</string>
	<key>signingStyle</key>
	<string>automatic</string>
	<key>teamID</key>
	<string>QY29J9ZMPU</string>
	<key>uploadSymbols</key>
	<true/>
	<key>manageAppVersionAndBuildNumber</key>
	<false/>
</dict>
</plist>
EOF

echo "→ Clean + Archive (generic iOS device)…"
rm -rf "$ARCHIVE"
xcodebuild \
  -project "$PROJ" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  clean archive \
  DEVELOPMENT_TEAM=QY29J9ZMPU \
  CODE_SIGN_STYLE=Automatic \
  | tee "$OUT/archive.log" | grep -E 'error:|warning:|ARCHIVE|Succeeded|failed|Signing' | tail -40

if [[ ! -d "$ARCHIVE" ]]; then
  echo "❌ Archive 失败。完整日志: $OUT/archive.log"
  echo "常见原因：未在 Xcode 登录 Apple ID / Bundle ID 未在开发者账号注册。"
  exit 1
fi

echo "✅ Archive 完成: $ARCHIVE"
echo ""
echo "上传方式二选一："
echo "  1) 打开 Xcode → Window → Organizer → 选中 Archive → Distribute App"
echo "  2) 命令行导出并上传："
echo "     xcodebuild -exportArchive -archivePath \"$ARCHIVE\" \\"
echo "       -exportOptionsPlist \"$EXPORT_PLIST\" -exportPath \"$OUT/export\""
echo ""
echo "版本应为 1.0.0 (1)。详见 ios/ASC_SUBMIT.md"
