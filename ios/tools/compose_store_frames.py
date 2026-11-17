#!/usr/bin/env python3
"""把 UI 截图合成带营销顶栏的 ASC 成片。"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import subprocess

ROOT = Path(__file__).resolve().parents[1] / "store" / "screenshots"

SLIDES = [
    ("02-知识地图首页.png", "按单元学", "上册下册一目了然 · 3–9 年级"),
    ("04-答题进行中.png", "限时口算", "起飞连对 · 答错马上重教"),
    ("07-竖式练习.png", "竖式与概念", "基础 → 夯实 → 拔高"),
    ("05-竞速选速度.png", "竞速挑战", "一分钟能对几道？"),
    ("09-家长错题本.png", "家长错题本", "PIN 保护 · 错题与偏慢都看得到"),
]


def find_font(size: int):
    for path in (
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Songti.ttc",
    ):
        p = Path(path)
        if not p.exists():
            continue
        try:
            if path.endswith(".ttc"):
                return ImageFont.truetype(path, size=size, index=0)
            return ImageFont.truetype(path, size=size)
        except Exception:
            continue
    return ImageFont.load_default()


def make_set(src_dir: Path, out_dir: Path, canvas_w: int, canvas_h: int, banner_h: int):
    out_dir.mkdir(parents=True, exist_ok=True)
    title_font = find_font(int(banner_h * 0.38))
    sub_font = find_font(int(banner_h * 0.22))
    for i, (fname, title, sub) in enumerate(SLIDES, 1):
        src = src_dir / fname
        if not src.exists():
            print("missing", src)
            continue
        shot = Image.open(src).convert("RGB")
        content_h = canvas_h - banner_h
        scale = canvas_w / shot.width
        new_h = int(shot.height * scale)
        shot = shot.resize((canvas_w, new_h), Image.Resampling.LANCZOS)
        if new_h >= content_h:
            shot = shot.crop((0, 0, canvas_w, content_h))
        else:
            pad = Image.new("RGB", (canvas_w, content_h), (245, 247, 252))
            pad.paste(shot, (0, 0))
            shot = pad

        canvas = Image.new("RGB", (canvas_w, canvas_h), (15, 18, 34))
        draw = ImageDraw.Draw(canvas)
        for y in range(banner_h):
            t = y / max(banner_h - 1, 1)
            r = int(91 * (1 - t) + 138 * t)
            g = int(140 * (1 - t) + 123 * t)
            b = 255
            draw.line([(0, y), (canvas_w, y)], fill=(r, g, b))

        overlay = Image.new("RGBA", (canvas_w, banner_h), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.ellipse([canvas_w - 180, -40, canvas_w + 40, 180], fill=(255, 255, 255, 28))
        top = canvas.crop((0, 0, canvas_w, banner_h)).convert("RGBA")
        canvas.paste(Image.alpha_composite(top, overlay).convert("RGB"), (0, 0))

        draw = ImageDraw.Draw(canvas)
        draw.text((int(canvas_w * 0.06), int(banner_h * 0.22)), title, font=title_font, fill=(255, 255, 255))
        draw.text((int(canvas_w * 0.06), int(banner_h * 0.58)), sub, font=sub_font, fill=(230, 236, 255))
        canvas.paste(shot, (0, banner_h))
        out = out_dir / f"{i:02d}-{title}.png"
        canvas.save(out, "PNG", optimize=True)
        print("wrote", out.relative_to(ROOT), canvas.size)


def curated(src: Path, dest: Path):
    dest.mkdir(exist_ok=True)
    for i, (fname, title, _) in enumerate(SLIDES, 1):
        s = src / fname
        if s.exists():
            Image.open(s).save(dest / f"{i:02d}-{title}.png", "PNG")
            print("curated", dest.name, f"{i:02d}-{title}.png")


def main():
    make_set(ROOT / "named", ROOT / "final-iphone-6.7", 1290, 2796, 420)
    make_set(ROOT / "named-ipad", ROOT / "final-ipad-13", 2048, 2732, 380)
    curated(ROOT / "asc-iphone-6.7", ROOT / "upload-iphone-6.7")
    curated(ROOT / "asc-ipad-13", ROOT / "upload-ipad-13")

    # 6.9" from marketing 6.7
    out69 = ROOT / "final-iphone-6.9"
    out69.mkdir(exist_ok=True)
    for f in (ROOT / "final-iphone-6.7").glob("*.png"):
        subprocess.run(
            ["sips", "-z", "2868", "1320", str(f), "--out", str(out69 / f.name)],
            capture_output=True,
        )
    print("final-iphone-6.9 ok")


if __name__ == "__main__":
    main()
