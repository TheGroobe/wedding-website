#!/usr/bin/env bash
# Subsets the four wedding fonts to Latin-basic + punctuation and emits woff2.
# Budget: each file ~15-25KB, TOTAL < 100KB (enforced below).
#
# PREREQ (human step): download the family ZIPs for "Bodoni Moda" and "Jost" from
# fonts.google.com, unzip, and copy these four static TTFs into src-assets/fonts/:
#   BodoniModa-Regular.ttf  BodoniModa-Italic.ttf  Jost-Regular.ttf  Jost-Medium.ttf
set -euo pipefail
cd "$(dirname "$0")/.."

pip3 install --quiet fonttools brotli

# Basic Latin + en/em dash, curly quotes, ellipsis, middot, rupee, ampersand accents
UNICODES="U+0020-007E,U+00A0,U+00B7,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2026,U+20B9"

sub() {  # sub <src.ttf> <out.woff2>
  pyftsubset "src-assets/fonts/$1" \
    --unicodes="$UNICODES" \
    --layout-features="kern,liga" \
    --flavor=woff2 \
    --output-file="site/fonts/$2"
}

sub "BodoniModa-Regular.ttf" "bodoni-moda-regular.woff2"
sub "BodoniModa-Italic.ttf"  "bodoni-moda-italic.woff2"
sub "Jost-Regular.ttf"       "jost-regular.woff2"
sub "Jost-Medium.ttf"        "jost-medium.woff2"

TOTAL=$(du -ck site/fonts/*.woff2 | tail -1 | cut -f1)
echo "Font payload: ${TOTAL}KB (budget: 100KB)"
[ "$TOTAL" -lt 100 ] || { echo "OVER FONT BUDGET"; exit 1; }
