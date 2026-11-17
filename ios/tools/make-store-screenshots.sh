#!/usr/bin/env bash
# 从 UI 测试结果生成 ASC 全尺寸 + 营销成片
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SHOT="$ROOT/ios/store/screenshots"
VENV="$ROOT/.venv-screens"

mkdir -p "$SHOT"

export_device() {
  local dest_name="$1"
  local simulator="$2"
  local xcresult="$SHOT/Playthrough-${dest_name}.xcresult"
  local exported="$SHOT/exported-${dest_name}"
  local named="$SHOT/named-${dest_name}"

  echo "→ UI 测试 ($simulator)…"
  rm -rf "$xcresult" "$exported"
  xcodebuild -project "$ROOT/ios/Xingya.xcodeproj" -scheme Xingya \
    -destination "platform=iOS Simulator,name=$simulator" \
    -resultBundlePath "$xcresult" \
    -only-testing:XingyaUITests test

  echo "→ 导出 $dest_name 附件…"
  xcrun xcresulttool export attachments --path "$xcresult" --output-path "$exported"

  python3 - <<PY
import json, shutil
from pathlib import Path
root = Path("$SHOT")
exported = root / "exported-${dest_name}"
named = root / "named-${dest_name}"
named.mkdir(exist_ok=True)
man = json.load(open(exported / "manifest.json"))
for entry in man:
    for a in entry.get("attachments", []):
        src = exported / a["exportedFileName"]
        name = a["suggestedHumanReadableName"].split("_0_")[0] + ".png"
        if src.exists():
            shutil.copy2(src, named / name)
            print(" ", name)
PY
}

# iPhone 原始目录沿用 named/（无 -iphone 后缀，兼容旧路径）
echo "======== iPhone ========"
export_device "iphone" "iPhone 17"
rm -rf "$SHOT/named"
mv "$SHOT/named-iphone" "$SHOT/named"

echo "======== iPad ========"
export_device "ipad" "iPad Pro 13-inch (M5)"
# named-ipad already correct name from dest_name ipad

# 缩放 raw → ASC 尺寸
echo "→ 缩放 ASC 尺寸…"
python3 - <<PY
import subprocess
from pathlib import Path
root = Path("$SHOT")
jobs = [
    ("named", "asc-iphone-6.7", 2796, 1290),
    ("named", "asc-iphone-6.9", 2868, 1320),
    ("named", "asc-iphone-6.5", 2688, 1242),
    ("named-ipad", "asc-ipad-13", 2732, 2048),
]
for src_name, dest_name, h, w in jobs:
    src = root / src_name
    dest = root / dest_name
    dest.mkdir(exist_ok=True)
    if not src.exists():
        print("skip missing", src)
        continue
    for f in src.glob("*.png"):
        subprocess.run(["sips", "-z", str(h), str(w), str(f), "--out", str(dest / f.name)],
                       capture_output=True)
    print(dest_name, "ok")
PY

# 营销成片
if [[ ! -x "$VENV/bin/python" ]]; then
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q pillow
fi

echo "→ 营销成片…"
"$VENV/bin/python" "$ROOT/ios/tools/compose_store_frames.py"

echo "完成。上传目录:"
echo "  $SHOT/final-iphone-6.7/"
echo "  $SHOT/final-ipad-13/"
