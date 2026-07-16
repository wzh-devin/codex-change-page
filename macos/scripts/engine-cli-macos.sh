#!/bin/bash

set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common-macos.sh"

discover_codex_app
require_macos_runtime
exec "$NODE" "$SCRIPT_DIR/engine-cli.mjs" "$@"
