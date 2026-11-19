#!/bin/sh
# Renders tools/og-image.html to og-image.jpg (1200x1200) with headless Chrome. macOS (uses sips).
# Run after changing the share image text or design: npm run og-image
set -e
cd "$(dirname "$0")/.."
CHROME="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
tmp=$(mktemp -d "${TMPDIR:-/tmp}/og-image.XXXXXX")
trap 'rm -rf "$tmp"' EXIT
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,1200 --virtual-time-budget=3000 \
  --screenshot="$tmp/og.png" "file://$PWD/tools/og-image.html" >/dev/null 2>&1
sips -s format jpeg -s formatOptions 85 "$tmp/og.png" --out og-image.jpg >/dev/null
sips -g pixelWidth -g pixelHeight og-image.jpg | tail -2
