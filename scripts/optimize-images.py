#!/usr/bin/env python3
"""
Optimize product images for the Vercel deploy.

For every PNG in public/products/:
  - resize so its longest side ≤ 1200 px (lanczos)
  - re-encode as WebP (lossless=false, quality=82, alpha preserved)
  - write to public/products/<name>.webp alongside the original PNG

Originals are NOT modified. The data files (.png references) still
point at the PNGs until we flip them to .webp.

Usage:
  .venv-rembg/bin/python3 scripts/optimize-images.py
"""

import os
import sys
from pathlib import Path
from PIL import Image

MAX_DIM = 1200
QUALITY = 82
SRC_DIR = Path("public/products")


def human_bytes(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def main() -> int:
    if not SRC_DIR.is_dir():
        print(f"✗ {SRC_DIR} not found", file=sys.stderr)
        return 1

    pngs = sorted(p for p in SRC_DIR.iterdir() if p.suffix.lower() == ".png")
    if not pngs:
        print("✗ no PNGs found", file=sys.stderr)
        return 1

    total_in = 0
    total_out = 0
    failures = []

    for i, src in enumerate(pngs, 1):
        try:
            with Image.open(src) as im:
                # Always keep alpha — these are cut-out product photos on
                # transparent backgrounds and we want the transparency to
                # survive. RGBA → WebP supports alpha losslessly at the
                # bitstream level even with lossy RGB.
                if im.mode != "RGBA":
                    im = im.convert("RGBA")

                # Resize only if needed.
                w, h = im.size
                longest = max(w, h)
                if longest > MAX_DIM:
                    scale = MAX_DIM / longest
                    new_size = (max(1, round(w * scale)), max(1, round(h * scale)))
                    im = im.resize(new_size, Image.Resampling.LANCZOS)

                dst = src.with_suffix(".webp")
                im.save(
                    dst,
                    format="WEBP",
                    quality=QUALITY,
                    method=6,  # best compression (slower but smaller)
                    alpha_quality=100,
                    exact=True,
                )
        except Exception as e:
            failures.append((src.name, str(e)))
            continue

        in_size = src.stat().st_size
        out_size = dst.stat().st_size
        total_in += in_size
        total_out += out_size

        if i % 25 == 0 or i == len(pngs):
            saved = (1 - total_out / total_in) * 100 if total_in else 0
            print(
                f"[{i:>3}/{len(pngs)}] "
                f"running total: {human_bytes(total_in)} → {human_bytes(total_out)} "
                f"({saved:.1f}% saved)"
            )

    print()
    print(f"✓ {len(pngs) - len(failures)}/{len(pngs)} optimized")
    print(f"  before: {human_bytes(total_in)}")
    print(f"  after:  {human_bytes(total_out)}")
    print(
        f"  saved:  {human_bytes(total_in - total_out)} "
        f"({(1 - total_out / total_in) * 100:.1f}%)"
        if total_in
        else ""
    )
    if failures:
        print()
        print(f"✗ {len(failures)} failures:")
        for name, err in failures:
            print(f"  - {name}: {err}")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
