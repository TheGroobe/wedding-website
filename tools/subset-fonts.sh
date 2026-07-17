#!/usr/bin/env bash
# Subsets the wedding fonts to Latin-basic + punctuation and emits woff2.
# Display face: Playfair Display VARIABLE fonts (weights 400-700 in one file each,
# roman + italic) -- the client rejected the brand kit's Bodoni Moda as too thin.
# Text face: Jost 400 + 500 statics.
# Budget: TOTAL < 160KB (variable display fonts cost more than statics; enforced below).
#
# PREREQ (already in repo workflow): sources live in src-assets/fonts/
#   Playfair/PlayfairDisplay[wght].ttf   Playfair/PlayfairDisplay-Italic[wght].ttf
#   Jost/static/Jost-Regular.ttf         Jost/static/Jost-Medium.ttf
set -euo pipefail
cd "$(dirname "$0")/.."

# Install the subsetter only if it's missing (avoids a network round-trip on re-runs).
python3 -c "import fontTools, brotli" 2>/dev/null || pip3 install --quiet fonttools brotli

# Glyph coverage must include every special char the site actually uses, or it renders
# as tofu. Beyond Basic Latin: Latin-1 Supplement (nbsp, middot, degree, accents),
# General Punctuation (curly quotes, ellipsis, bullet), rupee, arrows, almost-equal.
UNICODES="U+0020-007E,U+00A0-00FF,U+2010-2027,U+20B9,U+2190-2199,U+2248"

sub() {  # sub <src.ttf> <out.woff2>
  python3 -m fontTools.subset "src-assets/fonts/$1" \
    --unicodes="$UNICODES" \
    --layout-features="kern,liga" \
    --flavor=woff2 \
    --output-file="site/fonts/$2"
}

sub "Playfair/PlayfairDisplay[wght].ttf"        "playfair-display.woff2"
sub "Playfair/PlayfairDisplay-Italic[wght].ttf" "playfair-display-italic.woff2"
sub "Jost/static/Jost-Regular.ttf"              "jost-regular.woff2"
sub "Jost/static/Jost-Medium.ttf"               "jost-medium.woff2"

TOTAL=$(du -ck site/fonts/playfair-display.woff2 site/fonts/playfair-display-italic.woff2 site/fonts/jost-regular.woff2 site/fonts/jost-medium.woff2 | tail -1 | cut -f1)
echo "Font payload: ${TOTAL}KB (budget: 160KB)"
[ "$TOTAL" -lt 160 ] || { echo "OVER FONT BUDGET"; exit 1; }
