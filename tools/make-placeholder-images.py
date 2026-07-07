#!/usr/bin/env python3
"""
TEMPORARY placeholder-image generator.

Produces on-brand AVIF + WebP + JPEG stand-ins for the hero, the four route photos,
and the OG card, so the site deploys and lays out correctly before real photography
exists. Everything is in the wedding palette (Blossom canvas, Cherry ink, Brass rule).

DELETE this file and its output once tools/convert-images.sh has processed real photos
into src-assets/images/. This is scaffolding, not the real pipeline.

Run:  python3 tools/make-placeholder-images.py   (from the project root)
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "site", "images")
os.makedirs(OUT, exist_ok=True)

BLOSSOM = (245, 239, 226)
CHERRY = (107, 29, 40)
BRASS = (169, 135, 63)
PEPPERCORN = (35, 41, 31)

BODONI = os.path.join(ROOT, "src-assets/fonts/Bodoni_Moda/static/BodoniModa_28pt-Regular.ttf")
JOST = os.path.join(ROOT, "src-assets/fonts/Jost/static/Jost-Medium.ttf")


def font(path, size):
    return ImageFont.truetype(path, size)


def centered(draw, cx, y, text, fnt, fill, tracking=0):
    if tracking:
        # manual letter-spacing for the small caps subtitle
        widths = [draw.textbbox((0, 0), ch, font=fnt)[2] for ch in text]
        total = sum(widths) + tracking * (len(text) - 1)
        x = cx - total / 2
        for ch, w in zip(text, widths):
            draw.text((x, y), ch, font=fnt, fill=fill)
            x += w + tracking
    else:
        b = draw.textbbox((0, 0), text, font=fnt)
        draw.text((cx - (b[2] - b[0]) / 2 - b[0], y), text, font=fnt, fill=fill)


def save_all(img, base, formats=("jpg", "webp", "avif")):
    for fmt in formats:
        path = os.path.join(OUT, base + "." + fmt)
        if fmt == "jpg":
            img.convert("RGB").save(path, "JPEG", quality=82, optimize=True)
        elif fmt == "webp":
            img.save(path, "WEBP", quality=80, method=6)
        elif fmt == "avif":
            img.save(path, "AVIF", quality=58)
    print("  wrote", base, "->", ", ".join(formats))


def scene(base, w, h, title, subtitle, formats=("jpg", "webp", "avif")):
    img = Image.new("RGB", (w, h), BLOSSOM)
    d = ImageDraw.Draw(img)
    # thin brass inner rule — the "candlelight glint", never a wall
    m = int(min(w, h) * 0.05)
    d.rectangle([m, m, w - m, h - m], outline=BRASS, width=2)
    title_size = int(h * 0.16)
    sub_size = max(14, int(h * 0.035))
    centered(d, w / 2, h * 0.40, title, font(BODONI, title_size), CHERRY)
    centered(d, w / 2, h * 0.62, subtitle, font(JOST, sub_size), PEPPERCORN, tracking=int(sub_size * 0.18))
    save_all(img, base, formats)


# Hero (1600w, preloaded above the fold)
scene("hero", 1600, 900, "COORG", "PLACEHOLDER  ·  WESTERN GHATS PHOTO GOES HERE")

# Four route photos (1200w, lazy)
for base, city in [("route-dubai", "DUBAI"), ("route-bangkok", "BANGKOK"),
                   ("route-tokyo", "TOKYO"), ("route-delhi", "DELHI")]:
    scene(base, 1200, 800, city, "PLACEHOLDER  ·  REPLACE WITH PHOTO")

# OG share card (1200x630, JPEG only — this is what shows in the WhatsApp bubble)
img = Image.new("RGB", (1200, 630), BLOSSOM)
d = ImageDraw.Draw(img)
d.rectangle([40, 40, 1160, 590], outline=BRASS, width=3)
centered(d, 600, 150, "ALEX & MEGANA", font(BODONI, 96), CHERRY)
centered(d, 600, 320, "JANUARY 5–6, 2027", font(JOST, 44), PEPPERCORN, tracking=6)
centered(d, 600, 400, "COORG, INDIA", font(JOST, 44), PEPPERCORN, tracking=6)
img.convert("RGB").save(os.path.join(OUT, "og-preview.jpg"), "JPEG", quality=82, optimize=True)
print("  wrote og-preview -> jpg")
