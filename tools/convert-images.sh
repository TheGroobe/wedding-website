#!/usr/bin/env bash
# Emits AVIF + WebP + JPEG fallback for every source image.
# Hero: 1600w (preloaded, above the fold). Routes: 1200w (lazy). Budget < 200KB each.
#
# PREREQ (human step): drop source photos into src-assets/images/ named:
#   hero-src.jpg  dubai-src.jpg  bangkok-src.jpg  tokyo-src.jpg  delhi-src.jpg  og-src.png
# (No singapore image -- the Singapore sidebar in index.html is text-only by design.)
set -euo pipefail
cd "$(dirname "$0")/.."

emit() {  # emit <src> <base> <width> <quality>
  local src="src-assets/images/$1" base="site/images/$2" w="$3" q="$4"
  magick "$src" -resize "${w}x>" -strip -quality "$q" "${base}.jpg"
  magick "$src" -resize "${w}x>" -strip -quality "$q" "${base}.webp"
  magick "$src" -resize "${w}x>" -strip png:- | avifenc --min 22 --max 34 -s 6 - "${base}.avif"
}

emit hero-src.jpg      hero            1600 62
emit dubai-src.jpg     route-dubai     1200 60
emit bangkok-src.jpg   route-bangkok   1200 60
emit tokyo-src.jpg     route-tokyo     1200 60
emit delhi-src.jpg     route-delhi     1200 60

# OG preview: 1200x630 JPEG, < 300KB (WhatsApp/iMessage card).
# Compose og-src.png first (hero image + Blossom band + "ALEX & M / JAN 5-6 2027 / COORG, INDIA"
# in the wedding type & colors), then this crops/exports it:
magick src-assets/images/og-src.png -resize 1200x630^ -gravity center -extent 1200x630 -strip -quality 72 site/images/og-preview.jpg

echo "--- sizes ---"; ls -lk site/images/ | awk '{print $5, $9}'
oversize=$(find site/images -type f -size +200k ! -name 'og-preview.jpg' | wc -l | tr -d ' ')
[ "$oversize" = "0" ] || { echo "OVER IMAGE BUDGET:"; find site/images -type f -size +200k ! -name 'og-preview.jpg'; exit 1; }
