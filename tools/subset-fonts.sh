#!/usr/bin/env bash
# Subsets the four wedding fonts to Latin-basic + punctuation and emits woff2.
# Budget: each file ~15-25KB, TOTAL < 100KB (enforced below).
#
# PREREQ (human step): download the family ZIPs for "Bodoni Moda" and "Jost" from
# fonts.google.com and unzip into src-assets/fonts/ (gitignored). This script reads the
# nested layout the Google ZIP produces: Bodoni_Moda/static/ and Jost/static/.
# Display face = Bodoni Moda 28pt optical cut (elegant hairlines at 22-56px heading sizes).
set -euo pipefail
cd "$(dirname "$0")/.."

# Install the subsetter only if it's missing (avoids a network round-trip on re-runs).
python3 -c "import fontTools, brotli" 2>/dev/null || pip3 install --quiet fonttools brotli

# Glyph coverage must include every special char the site actually uses, or it renders
# as tofu. Beyond Basic Latin: Latin-1 Supplement (U+00A0-00FF -> nbsp, middot B7,
# degree B0, times D7, accents), General Punctuation (U+2010-2027 -> en/em dash, curly
# quotes, ellipsis, bullet), rupee (20B9), arrows (2190-2199 -> the -> in every route
# path), and almost-equal (2248 -> the ~$60 figures).
UNICODES="U+0020-007E,U+00A0-00FF,U+2010-2027,U+20B9,U+2190-2199,U+2248"

sub() {  # sub <src.ttf> <out.woff2>
  python3 -m fontTools.subset "src-assets/fonts/$1" \
    --unicodes="$UNICODES" \
    --layout-features="kern,liga" \
    --flavor=woff2 \
    --output-file="site/fonts/$2"
}

sub "Bodoni_Moda/static/BodoniModa_28pt-Regular.ttf" "bodoni-moda-regular.woff2"
sub "Bodoni_Moda/static/BodoniModa_28pt-Italic.ttf"  "bodoni-moda-italic.woff2"
sub "Jost/static/Jost-Regular.ttf"                   "jost-regular.woff2"
sub "Jost/static/Jost-Medium.ttf"                    "jost-medium.woff2"

TOTAL=$(du -ck site/fonts/*.woff2 | tail -1 | cut -f1)
echo "Font payload: ${TOTAL}KB (budget: 100KB)"
[ "$TOTAL" -lt 100 ] || { echo "OVER FONT BUDGET"; exit 1; }
