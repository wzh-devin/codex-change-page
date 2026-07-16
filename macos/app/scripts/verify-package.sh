#!/bin/bash

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
VERSION="$(/usr/bin/plutil -extract version raw -o - "$ROOT/package.json" 2>/dev/null || \
  /usr/bin/python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["version"])' "$ROOT/package.json")"
DMG="$ROOT/release/Codex-Change-Page-$VERSION-arm64.dmg"
[ -f "$DMG" ] || { printf 'DMG missing: %s\n' "$DMG" >&2; exit 1; }

MOUNT="$(/usr/bin/mktemp -d /tmp/codex-change-page-mount.XXXXXX)"
cleanup() {
  /usr/bin/hdiutil detach "$MOUNT" -quiet >/dev/null 2>&1 || true
  /bin/rmdir "$MOUNT" >/dev/null 2>&1 || true
}
trap cleanup EXIT
/usr/bin/hdiutil attach "$DMG" -nobrowse -readonly -mountpoint "$MOUNT" -quiet
APP="$MOUNT/Codex 换肤助手.app"
[ -d "$APP" ] || { printf 'App missing in DMG.\n' >&2; exit 1; }
PLIST="$APP/Contents/Info.plist"
[ "$(/usr/bin/plutil -extract CFBundleIdentifier raw -o - "$PLIST")" = "com.devin.codex-change-page" ]
[ "$(/usr/bin/plutil -extract LSMinimumSystemVersion raw -o - "$PLIST")" = "13.0" ]
/usr/bin/file "$APP/Contents/MacOS/Codex 换肤助手" | /usr/bin/grep -q arm64
/usr/bin/codesign --verify --deep --strict "$APP"
[ -f "$APP/Contents/Resources/engine/engine-manifest.json" ]
printf 'PASS: arm64 DMG, bundle id, minimum macOS, code signature, and engine resources.\n'
