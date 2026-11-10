#!/usr/bin/env python3
"""Flat 1024 icon for the 星芽 iOS shell. Not a third-party logo."""
import struct
import zlib
from pathlib import Path

W = H = 1024


def px(x: int, y: int) -> bytes:
    cx, cy = x - 511.5, y - 511.5
    r = (cx * cx + cy * cy) ** 0.5
    # Opaque paper. App Store icons cannot use a transparent background.
    red, green, blue = 252, 251, 249
    if r > 470:
        return bytes((red, green, blue))
    # stem
    if abs(cx) < 16 and -40 < cy < 220:
        red, green, blue = 196, 132, 74
    # two leaves
    for ox, oy, rx, ry, col in (
        (-70, -30, 150, 70, (61, 168, 96)),
        (78, -80, 130, 62, (43, 178, 76)),
    ):
        nx, ny = (cx - ox) / rx, (cy - oy) / ry
        if nx * nx + ny * ny <= 1:
            red, green, blue = col
    return bytes((red, green, blue))


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


raw = bytearray()
for y in range(H):
    raw.append(0)
    for x in range(W):
        raw += px(x, y)

png = b"\x89PNG\r\n\x1a\n"
png += chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0))
png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
png += chunk(b"IEND", b"")

out = Path(__file__).resolve().parents[1] / "resources" / "AppIcon-1024.png"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_bytes(png)
print(out, len(png))
