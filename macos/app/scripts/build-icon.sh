#!/bin/bash

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
SVG="$ROOT/build/AppIcon.svg"
ICONSET="$ROOT/build/AppIcon.iconset"
OUTPUT="$ROOT/build/AppIcon.icns"

command -v rsvg-convert >/dev/null || {
  printf 'rsvg-convert is required to build the app icon.\n' >&2
  exit 1
}
/bin/rm -rf "$ICONSET"
/bin/mkdir -p "$ICONSET"
for size in 16 32 128 256 512; do
  /opt/homebrew/bin/rsvg-convert -w "$size" -h "$size" "$SVG" -o "$ICONSET/icon_${size}x${size}.png"
  double=$((size * 2))
  /opt/homebrew/bin/rsvg-convert -w "$double" -h "$double" "$SVG" -o "$ICONSET/icon_${size}x${size}@2x.png"
done
/usr/bin/iconutil -c icns "$ICONSET" -o "$OUTPUT"
/bin/rm -rf "$ICONSET"
printf 'Created %s\n' "$OUTPUT"
