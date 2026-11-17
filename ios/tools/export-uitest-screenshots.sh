#!/usr/bin/env bash
# 跑 UI 测试并尽量从最新 xcresult 导出截图到 ios/store/screenshots/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/ios/store/screenshots"
DERIVED="${DERIVED_DATA:-$HOME/Library/Developer/Xcode/DerivedData}"
DEST="${DESTINATION:-platform=iOS Simulator,name=iPhone 17}"

mkdir -p "$OUT"
echo "→ 运行 XingyaUITests ($DEST)…"
cd "$ROOT"
xcodebuild -project ios/Xingya.xcodeproj -scheme Xingya \
  -destination "$DEST" \
  -resultBundlePath "$OUT/Playthrough.xcresult" \
  -only-testing:XingyaUITests test || true

if [[ -d "$OUT/Playthrough.xcresult" ]]; then
  echo "→ 导出附件…"
  rm -rf "$OUT/exported"
  xcrun xcresulttool export attachments --path "$OUT/Playthrough.xcresult" --output-path "$OUT/exported" \
    || { echo "请用 Xcode 打开 $OUT/Playthrough.xcresult → Tests → 附件截图"; exit 0; }

  echo "→ 重命名 + 缩放到 1290×2796 (6.7\")…"
  python3 - <<PY
import json, shutil, subprocess
from pathlib import Path
root = Path("$OUT")
man = json.load(open(root / "exported/manifest.json"))
named = root / "named"
asc = root / "asc-iphone-6.7"
named.mkdir(exist_ok=True)
asc.mkdir(exist_ok=True)
for entry in man:
    for a in entry.get("attachments", []):
        src = root / "exported" / a["exportedFileName"]
        name = a["suggestedHumanReadableName"].split("_0_")[0] + ".png"
        if not src.exists():
            continue
        dest = named / name
        shutil.copy2(src, dest)
        subprocess.run(["sips", "-z", "2796", "1290", str(dest), "--out", str(asc / name)],
                       check=False, capture_output=True)
        print(" ", name)
PY
fi

echo "完成。"
echo "  原始: $OUT/named/"
echo "  ASC 6.7\": $OUT/asc-iphone-6.7/"
