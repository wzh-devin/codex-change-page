# Codex 换肤助手

Apple Silicon macOS 13+ graphical manager for Codex Dream Skin Studio.

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

The app uses a sandboxed Electron renderer. Filesystem, process, theme, restore,
and external-link operations are exposed only through typed preload IPC.

## Build the arm64 DMG

```bash
pnpm package:mac
pnpm verify:package
```

Artifacts:

- `release/Codex-Change-Page-1.2.0-arm64.dmg`
- `release/SHA256SUMS.txt`
- `release/build-info.json`

Without a Developer ID identity the build hook applies an ad-hoc signature for
local testing. Testers may need to right-click the app and choose Open.

## Runtime paths

- Engine: `~/.codex/codex-dream-skin-studio`
- Themes, logs, and engine state: `~/Library/Application Support/CodexDreamSkinStudio`
- App preferences and operation journal: Electron `userData` for
  `com.devin.codex-change-page`

The manager never patches the official Codex application or `app.asar`.
