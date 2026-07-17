#!/usr/bin/env python3
"""
Image pipeline: src-assets/images/*-src.jpg -> site/images/{name}.{avif,webp,jpg}

Pillow-based (no ImageMagick/avifenc needed). Budgets enforced:
  hero 1600w, routes 1200w, every file < 200KB; og-preview.jpg 1200x630 < 300KB.
AVIF/WebP quality auto-steps down until each file fits its budget.

Current photography (Unsplash License: free to use, no attribution required
https://unsplash.com/license). Source photo IDs, for future reference:
  hero-src.jpg     photo-1663597675816-9b5d68952f42  (plantation hills at dawn, Western Ghats)
  dubai-src.jpg    photo-1623725259601-b8c41ad6a532  (Dubai skyline at dusk)
  bangkok-src.jpg  photo-1714672709462-de21a12a1339  (Wat Arun at dusk)
  tokyo-src.jpg    photo-1573455494060-c5595004fb6c  (lantern alley at night, Tokyo)
  delhi-src.jpg    photo-1597040663342-45b6af3d91a5  (Humayun's Tomb, Delhi)

Run from anywhere:  python3 tools/process-images.py
Swap any source photo by replacing its *-src.jpg and re-running.
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src-assets', 'images')
OUT = os.path.join(ROOT, 'site', 'images')
BUDGET = 200 * 1024          # per image file
OG_BUDGET = 300 * 1024       # WhatsApp/iMessage card

JOBS = [  # (source, output base, target width)
    ('hero-src.jpg',    'hero',          1600),
    ('dubai-src.jpg',   'route-dubai',   1200),
    ('bangkok-src.jpg', 'route-bangkok', 1200),
    ('tokyo-src.jpg',   'route-tokyo',   1200),
    ('delhi-src.jpg',   'route-delhi',   1200),
]


def fit_quality(img, path, fmt, start_q, floor=30, step=6, **kw):
    """Save at decreasing quality until under budget; return final size."""
    q = start_q
    while True:
        img.save(path, fmt, quality=q, **kw)
        size = os.path.getsize(path)
        if size <= BUDGET or q <= floor:
            return size, q
        q -= step


def process(src_name, base, width):
    img = Image.open(os.path.join(SRC, src_name)).convert('RGB')
    if img.width > width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    results = []
    s, q = fit_quality(img, os.path.join(OUT, base + '.jpg'), 'JPEG', 78, optimize=True)
    results.append(('jpg', s, q))
    s, q = fit_quality(img, os.path.join(OUT, base + '.webp'), 'WEBP', 76, method=6)
    results.append(('webp', s, q))
    s, q = fit_quality(img, os.path.join(OUT, base + '.avif'), 'AVIF', 62)
    results.append(('avif', s, q))
    for fmt, size, q in results:
        print(f'  {base}.{fmt:<5} {size//1024:>4}KB  (q={q})')
    return all(size <= BUDGET for _, size, _ in results)


def og_card():
    """1200x630 share card: hero photo full-bleed + centered Blossom panel."""
    BLOSSOM, CHERRY, PEPPERCORN, LATERITE = (245, 239, 226), (107, 29, 40), (35, 41, 31), (182, 92, 56)
    img = Image.open(os.path.join(SRC, 'hero-src.jpg')).convert('RGB')
    # cover-crop to 1200x630
    target = 1200 / 630
    if img.width / img.height > target:
        w = round(img.height * target)
        img = img.crop(((img.width - w) // 2, 0, (img.width - w) // 2 + w, img.height))
    else:
        h = round(img.width / target)
        img = img.crop((0, (img.height - h) // 2, img.width, (img.height - h) // 2 + h))
    img = img.resize((1200, 630), Image.LANCZOS)
    # soft scrim so the panel pops
    overlay = Image.new('RGB', img.size, PEPPERCORN)
    img = Image.blend(img, overlay, 0.18)
    d = ImageDraw.Draw(img)
    # centered Blossom panel
    pw, ph = 760, 350
    px, py = (1200 - pw) // 2, (630 - ph) // 2
    d.rounded_rectangle([px, py, px + pw, py + ph], radius=10, fill=BLOSSOM,
                        outline=(169, 135, 63), width=2)
    bodoni = ImageFont.truetype(os.path.join(ROOT, 'src-assets/fonts/Bodoni_Moda/static/BodoniModa_28pt-Regular.ttf'), 84)
    jost = ImageFont.truetype(os.path.join(ROOT, 'src-assets/fonts/Jost/static/Jost-Medium.ttf'), 30)

    def center(y, text, font, fill, tracking=0):
        if tracking:
            widths = [d.textbbox((0, 0), ch, font=font)[2] for ch in text]
            total = sum(widths) + tracking * (len(text) - 1)
            x = 600 - total / 2
            for ch, w in zip(text, widths):
                d.text((x, y), ch, font=font, fill=fill)
                x += w + tracking
        else:
            b = d.textbbox((0, 0), text, font=font)
            d.text((600 - (b[2] - b[0]) / 2 - b[0], y), text, font=font, fill=fill)

    center(py + 48, 'ALEX & MEGANA', jost, LATERITE, tracking=7)
    center(py + 110, 'Two days in the', bodoni, CHERRY)
    center(py + 196, 'Western Ghats', bodoni, CHERRY)
    center(py + 296, 'JANUARY 5-6, 2027  ·  COORG, INDIA', jost, PEPPERCORN, tracking=4)
    path = os.path.join(OUT, 'og-preview.jpg')
    q = 82
    while True:
        img.save(path, 'JPEG', quality=q, optimize=True)
        if os.path.getsize(path) <= OG_BUDGET or q <= 40:
            break
        q -= 6
    print(f'  og-preview.jpg {os.path.getsize(path)//1024:>4}KB  (q={q})')
    return os.path.getsize(path) <= OG_BUDGET


def main():
    os.makedirs(OUT, exist_ok=True)
    ok = True
    for src, base, width in JOBS:
        print(base + ':')
        ok = process(src, base, width) and ok
    print('og:')
    ok = og_card() and ok
    if not ok:
        print('OVER BUDGET'); sys.exit(1)
    print('all files within budget')


if __name__ == '__main__':
    main()
