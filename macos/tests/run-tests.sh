#!/bin/bash

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
NODE="${NODE:-/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node}"
[ -x "$NODE" ] || { printf 'Codex bundled Node.js was not found: %s\n' "$NODE" >&2; exit 1; }

while IFS= read -r file; do /bin/bash -n "$file"; done < <(
  /usr/bin/find "$ROOT" -type f \( -name '*.sh' -o -name '*.command' \) \
    ! -path '*/release/*' ! -path '*/app/node_modules/*' -print
)
while IFS= read -r file; do "$NODE" --check "$file" >/dev/null; done < <(
  /usr/bin/find "$ROOT/scripts" "$ROOT/assets" -type f \( -name '*.mjs' -o -name '*.js' \) -print
)
"$NODE" --test "$ROOT/tests/"*.test.mjs
[ -x "$ROOT/scripts/engine-cli-macos.sh" ] || {
  printf 'The machine-readable engine CLI wrapper is missing or not executable.\n' >&2
  exit 1
}

if /usr/bin/grep -R -n -E 'dream-skin-skin|DREAM_SKIN_SKIN|1\.0\.0-rc2' \
  "$ROOT/scripts" "$ROOT/assets" >/dev/null; then
  printf 'Legacy release-candidate identifiers remain in runtime files.\n' >&2
  exit 1
fi
if /usr/bin/grep -R -n -E '(writeFile|rename|copyFile|rm).*app\.asar' "$ROOT/scripts" >/dev/null; then
  printf 'A runtime script appears to mutate app.asar.\n' >&2
  exit 1
fi
if /usr/bin/sed -n '/verified_cdp_endpoint()/,/^}/p' "$ROOT/scripts/common-macos.sh" \
  | /usr/bin/grep -E '\*ChatGPT\*|\*Codex\*|\*codex\*|Fallback|accept loopback' >/dev/null; then
  printf 'verified_cdp_endpoint still contains a process-name ownership fallback.\n' >&2
  exit 1
fi
if /usr/bin/sed -n '/if ! wait_for_cdp/,/^fi/p' "$ROOT/scripts/start-dream-skin-macos.sh" \
  | /usr/bin/grep -q 'cdp_http_ready'; then
  printf 'start still accepts an unverified CDP HTTP endpoint.\n' >&2
  exit 1
fi
if /usr/bin/sed -n '/hot_reapply_theme()/,/^}/p' "$ROOT/scripts/common-macos.sh" \
  | /usr/bin/grep -q 'cdp_http_ready'; then
  printf 'hot reapply still accepts an unverified CDP HTTP endpoint.\n' >&2
  exit 1
fi
if /usr/bin/sed -n '/hot_reapply_theme()/,/^}/p' "$ROOT/scripts/common-macos.sh" \
  | /usr/bin/grep -E 'stop_recorded_injector.*\|\| true|kill -TERM.*old' >/dev/null; then
  printf 'hot reapply still ignores injector identity or kills an untracked process.\n' >&2
  exit 1
fi
if /usr/bin/sed -n '/stop_recorded_injector()/,/^}/p' "$ROOT/scripts/common-macos.sh" \
  | /usr/bin/grep -E 'Soft identity|still stop by cmdline' >/dev/null; then
  printf 'recorded injector takeover still contains a soft PID identity fallback.\n' >&2
  exit 1
fi
if /usr/bin/grep -q 'stop_recorded_injector || true' \
  "$ROOT/scripts/pause-dream-skin-macos.sh"; then
  printf 'pause still ignores a rejected injector identity check.\n' >&2
  exit 1
fi
for packager in \
  "$ROOT/scripts/install-dream-skin-macos.sh" \
  "$ROOT/scripts/build-client-release.sh"; do
  /usr/bin/grep -q -- "--exclude 'app/'" "$packager" || {
    printf 'Legacy engine packaging must exclude the Electron app tree: %s\n' "$packager" >&2
    exit 1
  }
done

"$NODE" "$ROOT/scripts/injector.mjs" --check-payload >/dev/null

TMP="$(/usr/bin/mktemp -d /tmp/codex-dream-skin-tests.XXXXXX)"
trap '/bin/rm -rf "$TMP"' EXIT
/bin/mkdir -p "$TMP/theme"
/bin/cp "$ROOT/assets/portal-hero.png" "$TMP/theme/background.png"
"$NODE" "$ROOT/scripts/write-theme.mjs" custom --output-dir "$TMP/theme" \
  --image background.png --name '测试主题' --tagline '测试口号' --quote 'TEST' \
  --accent '#11aa55' --secondary '#22bbcc' --highlight '#663399' >/dev/null
"$NODE" -e '
  const fs = require("node:fs");
  const value = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (value.schemaVersion !== 2 || value.imageSettings?.focalX !== 0.72) process.exit(1);
' "$TMP/theme/theme.json"
PAYLOAD_JSON="$("$NODE" "$ROOT/scripts/injector.mjs" --check-payload --theme-dir "$TMP/theme")"
"$NODE" -e '
  const value = JSON.parse(process.argv[1]);
  if (!value.pass || value.themeName !== "测试主题" || value.themeSchemaVersion !== 2 ||
      value.imageSettings?.overlayOpacity !== 0.38 || value.imageBytes < 1) process.exit(1);
' "$PAYLOAD_JSON"
"$NODE" "$ROOT/scripts/write-theme.mjs" reset-demo --output-dir "$TMP/theme" >/dev/null
[ ! -e "$TMP/theme" ]

/bin/mkdir -p "$TMP/home/Library/Application Support/CodexDreamSkinStudio/themes/legacy"
/bin/cp "$ROOT/assets/portal-hero.png" \
  "$TMP/home/Library/Application Support/CodexDreamSkinStudio/themes/legacy/background.png"
"$NODE" -e '
  const fs = require("node:fs");
  const file = process.argv[1];
  fs.writeFileSync(file, JSON.stringify({
    schemaVersion: 1,
    id: "legacy",
    name: "Legacy",
    image: "background.png",
    colors: { accent: "#112233" }
  }));
' "$TMP/home/Library/Application Support/CodexDreamSkinStudio/themes/legacy/theme.json"
HOME="$TMP/home" "$NODE" "$ROOT/scripts/migrate-engine-state.mjs" >/dev/null
"$NODE" -e '
  const value = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
  if (value.schemaVersion !== 2 || value.imageSettings?.brightness !== 1) process.exit(1);
' "$TMP/home/Library/Application Support/CodexDreamSkinStudio/themes/legacy/theme.json"

CONFIG="$TMP/config.toml"
BACKUP="$TMP/theme-backup.json"
/usr/bin/printf '%s\n' \
  'model = "gpt-5"' \
  '' \
  '[desktop]' \
  'appearanceTheme = "system"' \
  'appearanceDarkCodeThemeId = "vscode-dark"' \
  'keepMe = true' > "$CONFIG"
/bin/cp "$CONFIG" "$TMP/original.toml"
"$NODE" "$ROOT/scripts/theme-config.mjs" install "$CONFIG" "$BACKUP" >/dev/null
<<<<<<< HEAD
/usr/bin/grep -q 'appearanceTheme = "system"' "$CONFIG"
[ -s "$BACKUP" ]
/usr/bin/sed -i '' \
  -e 's/appearanceTheme = "system"/appearanceTheme = "light"/' \
  -e 's/appearanceDarkCodeThemeId = "vscode-dark"/appearanceDarkCodeThemeId = "codex-dark"/' \
  "$CONFIG"
"$NODE" "$ROOT/scripts/theme-config.mjs" restore "$CONFIG" "$BACKUP" >/dev/null
/usr/bin/cmp -s "$CONFIG" "$TMP/original.toml"

/bin/cp "$TMP/original.toml" "$CONFIG"
"$NODE" "$ROOT/scripts/theme-config.mjs" install "$CONFIG" "$BACKUP" >/dev/null
/usr/bin/sed -i '' -e 's/appearanceTheme = "system"/appearanceTheme = "light"/' "$CONFIG"
"$NODE" "$ROOT/scripts/theme-config.mjs" restore "$CONFIG" "$BACKUP" --keep-backup >/dev/null
/usr/bin/cmp -s "$CONFIG" "$TMP/original.toml"
[ -s "$BACKUP" ]
/bin/rm -f "$BACKUP"

/usr/bin/env -u HOME /bin/bash -c '. "$1/scripts/common-macos.sh"; [ -n "$HOME" ] && [ "$SKIN_VERSION" = "1.2.0" ]' _ "$ROOT"
=======
/usr/bin/cmp -s "$CONFIG" "$TMP/original.toml"
"$NODE" -e '
  const backup = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  if (backup.values.appearanceTheme !== `appearanceTheme = "system"`) process.exit(1);
  if (backup.values.appearanceDarkCodeThemeId !== `appearanceDarkCodeThemeId = "vscode-dark"`) process.exit(1);
' "$BACKUP"
"$NODE" "$ROOT/scripts/theme-config.mjs" restore "$CONFIG" "$BACKUP" >/dev/null
/usr/bin/cmp -s "$CONFIG" "$TMP/original.toml"

NO_DESKTOP_CONFIG="$TMP/config-without-desktop.toml"
NO_DESKTOP_BACKUP="$TMP/theme-backup-without-desktop.json"
/usr/bin/printf '%s\n' 'model = "gpt-5"' 'keepMe = true' > "$NO_DESKTOP_CONFIG"
/bin/cp "$NO_DESKTOP_CONFIG" "$TMP/original-without-desktop.toml"
"$NODE" "$ROOT/scripts/theme-config.mjs" install "$NO_DESKTOP_CONFIG" "$NO_DESKTOP_BACKUP" >/dev/null
"$NODE" "$ROOT/scripts/theme-config.mjs" restore "$NO_DESKTOP_CONFIG" "$NO_DESKTOP_BACKUP" >/dev/null
/usr/bin/cmp -s "$NO_DESKTOP_CONFIG" "$TMP/original-without-desktop.toml"

/usr/bin/env -u HOME /bin/bash -c '. "$1/scripts/common-macos.sh"; [ -n "$HOME" ] && [ "$SKIN_VERSION" = "1.1.2" ]' _ "$ROOT"
>>>>>>> 2f038b5322702cfb248d9c7564b56470a389abc2
"$ROOT/scripts/doctor-macos.sh" >/dev/null

printf 'PASS: syntax, payload, custom-theme, config round-trips, HOME recovery, signature, and doctor checks.\n'
