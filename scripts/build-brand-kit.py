#!/usr/bin/env python3
"""Trace the existing OBT wordmark and write SVG masters for the brand kit.

The wordmark is a contour trace of Logo/OBT Thin Logo White.png — the live
site mark — so the kit follows that artwork instead of redrawing it.
The symbol is the O measured from the same file (circle fit), closed so it
can stand alone at favicon size. The bar that leaves the O is part of the
wordmark only.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from skimage.measure import approximate_polygon, find_contours

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "Logo" / "OBT Thin Logo White.png"
OUT = ROOT / "brand-kit" / "masters"
INK = "#0E0E0E"
BONE = "#F3EFE7"
WHITE = "#FFFFFF"

# Circle fit of the O in source-image pixels (see measurement notes in the kit).
O_CX, O_CY, O_RO, O_RI = 188.0, 193.63, 172.9, 141.3


def path_from_contour(contour, tol):
    simple = approximate_polygon(contour, tolerance=tol)
    if len(simple) < 3:
        return ""
    # contour rows are (y, x)
    parts = [f"M {simple[0, 1]:.2f} {simple[0, 0]:.2f}"]
    for y, x in simple[1:]:
        parts.append(f"L {x:.2f} {y:.2f}")
    parts.append("Z")
    return " ".join(parts)


def trace_mask(mask, tol):
    contours = find_contours(np.pad(mask.astype(float), 2), 0.5)
    # padding shifts coordinates by 2
    pieces = []
    for c in contours:
        c = c - 2
        d = path_from_contour(c, tol)
        if d:
            pieces.append(d)
    return " ".join(pieces)


def svg_doc(viewbox, body, title):
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" role="img" aria-labelledby="title">\n'
        f"  <title>{title}</title>\n"
        f"{body}\n"
        "</svg>\n"
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    im = Image.open(SRC).convert("RGBA")
    alpha = np.array(im)[:, :, 3]
    mask = alpha > 96
    word_d = trace_mask(mask, tol=0.35)
    w, h = im.size
    word = svg_doc(
        f"0 0 {w} {h}",
        f'  <path fill="{INK}" fill-rule="evenodd" d="{word_d}"/>',
        "One Body Temple wordmark",
    )
    (OUT / "obt-wordmark.svg").write_text(word)
    (OUT / "obt-wordmark-white.svg").write_text(word.replace(f'fill="{INK}"', f'fill="{WHITE}"'))

    # Symbol: the measured O, nothing else.
    pad = 24
    vb_x = O_CX - O_RO - pad
    vb_y = O_CY - O_RO - pad
    side = (O_RO + pad) * 2
    symbol_body = (
        f'  <path fill="{INK}" fill-rule="evenodd" '
        f'd="M {O_CX + O_RO:.2f} {O_CY:.2f} '
        f'A {O_RO:.2f} {O_RO:.2f} 0 1 0 {O_CX - O_RO:.2f} {O_CY:.2f} '
        f'A {O_RO:.2f} {O_RO:.2f} 0 1 0 {O_CX + O_RO:.2f} {O_CY:.2f} Z '
        f'M {O_CX + O_RI:.2f} {O_CY:.2f} '
        f'A {O_RI:.2f} {O_RI:.2f} 0 1 1 {O_CX - O_RI:.2f} {O_CY:.2f} '
        f'A {O_RI:.2f} {O_RI:.2f} 0 1 1 {O_CX + O_RI:.2f} {O_CY:.2f} Z"/>'
    )
    symbol = svg_doc(f"{vb_x:.2f} {vb_y:.2f} {side:.2f} {side:.2f}", symbol_body, "One Body Temple symbol")
    (OUT / "obt-symbol.svg").write_text(symbol)
    (OUT / "obt-symbol-white.svg").write_text(symbol.replace(f'fill="{INK}"', f'fill="{WHITE}"'))

    # App tile: white O on ink.
    tile = svg_doc(
        "0 0 256 256",
        f'  <rect width="256" height="256" rx="58" fill="{INK}"/>\n'
        + "  "
        + symbol_body.replace(
            f'fill="{INK}"',
            f'fill="{BONE}" transform="translate(128 128) scale(0.52) translate({-O_CX:.2f} {-O_CY:.2f})"',
        ),
        "One Body Temple app icon",
    )
    # transform on path via group is cleaner
    tile = svg_doc(
        "0 0 256 256",
        f'  <rect width="256" height="256" rx="58" fill="{INK}"/>\n'
        f'  <g transform="translate(128 128) scale(0.52) translate({-O_CX:.2f} {-O_CY:.2f})">\n'
        f"{symbol_body.replace(INK, BONE)}\n"
        f"  </g>",
        "One Body Temple app icon",
    )
    (OUT / "obt-symbol-on-tile.svg").write_text(tile)

    # Stacked lockup: wordmark + outlined descriptor.
    desc = render_descriptor()
    desc_mask = np.array(desc)[:, :, 3] > 96
    desc_d = trace_mask(desc_mask, tol=0.6)
    # Place descriptor under the wordmark. Wordmark content is roughly y 21–368.
    gap = 56
    desc_h, desc_w = desc_mask.shape
    # scale descriptor to 78% of wordmark width
    target_w = 921 * 0.72
    scale = target_w / desc_w
    tx = (w - desc_w * scale) / 2
    ty = 368 + gap
    total_h = ty + desc_h * scale + 24
    stacked = svg_doc(
        f"0 0 {w} {total_h:.2f}",
        f'  <path fill="{INK}" fill-rule="evenodd" d="{word_d}"/>\n'
        f'  <g transform="translate({tx:.2f} {ty:.2f}) scale({scale:.4f})">\n'
        f'    <path fill="{INK}" fill-rule="evenodd" d="{desc_d}"/>\n'
        f"  </g>",
        "One Body Temple stacked lockup",
    )
    (OUT / "obt-stacked.svg").write_text(stacked)
    (OUT / "obt-stacked-white.svg").write_text(stacked.replace(f'fill="{INK}"', f'fill="{WHITE}"'))
    print("wrote masters to", OUT)


def render_descriptor():
    text = "ONE BODY TEMPLE"
    font = ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", 86, index=10)
    # measure with tracking
    tracking = 18
    dummy = Image.new("RGBA", (10, 10), (0, 0, 0, 0))
    draw = ImageDraw.Draw(dummy)
    widths = []
    for ch in text:
        box = draw.textbbox((0, 0), ch, font=font)
        widths.append(box[2] - box[0])
    total = sum(widths) + tracking * (len(text) - 1)
    ascent = font.getmetrics()[0]
    canvas_h = 120
    img = Image.new("RGBA", (total + 8, canvas_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    x = 4
    for ch, cw in zip(text, widths):
        draw.text((x, 8), ch, font=font, fill=(14, 14, 14, 255))
        x += cw + tracking
    # crop to ink
    arr = np.array(img)[:, :, 3]
    ys, xs = np.where(arr > 10)
    img = img.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    return img


if __name__ == "__main__":
    main()
