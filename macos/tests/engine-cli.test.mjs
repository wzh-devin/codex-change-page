import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";

import {
  buildInvocation,
  errorCodeFor,
  operationResult,
  parseCliArgs,
} from "../scripts/engine-cli-lib.mjs";

const root = "/tmp/codex-dream-skin-studio";

test("parseCliArgs accepts a supported command and typed options", () => {
  assert.deepEqual(
    parseCliArgs(["apply", "--operation-id", "op-1", "--restart-existing", "--port", "9442"]),
    {
      command: "apply",
      operationId: "op-1",
      options: { restartExisting: true, port: 9442 },
    },
  );
});

test("parseCliArgs rejects unsupported commands", () => {
  assert.throws(
    () => parseCliArgs(["destroy"]),
    (error) => error.code === "ENGINE_MISMATCH",
  );
});

test("buildInvocation maps restore to the complete official-appearance restore", () => {
  assert.deepEqual(buildInvocation("restore", {}, root), {
    executable: path.join(root, "scripts", "restore-dream-skin-macos.sh"),
    args: ["--restore-base-theme", "--restart-codex"],
  });
});

test("buildInvocation installs in place without legacy desktop launchers", () => {
  assert.deepEqual(buildInvocation("install", {}, root), {
    executable: path.join(root, "scripts", "install-dream-skin-macos.sh"),
    args: ["--no-launch", "--no-launchers", "--in-place"],
  });
});

test("buildInvocation maps apply restart and port options without shell interpolation", () => {
  assert.deepEqual(buildInvocation("apply", { restartExisting: true, port: 9442 }, root), {
    executable: path.join(root, "scripts", "start-dream-skin-macos.sh"),
    args: ["--port", "9442", "--restart-existing"],
  });
});

test("buildInvocation maps migrate to the state migration tool", () => {
  assert.deepEqual(buildInvocation("migrate", {}, root), {
    executable: path.join(root, "scripts", "migrate-engine-state.mjs"),
    args: [],
  });
});

test("errorCodeFor maps known engine failures to stable error codes", () => {
  assert.equal(errorCodeFor("Could not find the official Codex app bundle"), "CODEX_NOT_FOUND");
  assert.equal(errorCodeFor("explicit restart authorization is required"), "RESTART_REQUIRED");
  assert.equal(errorCodeFor("No selective pre-install theme backup is available"), "BACKUP_MISSING");
  assert.equal(errorCodeFor("Port 9341 is not a verified Codex loopback CDP endpoint"), "CDP_UNVERIFIED");
});

test("operationResult always returns the public machine-readable contract", () => {
  assert.deepEqual(operationResult({
    operationId: "op-2",
    command: "inspect",
    success: true,
    stage: "completed",
    message: "Inspection completed.",
    data: { platform: "darwin-arm64" },
  }), {
    operationId: "op-2",
    command: "inspect",
    success: true,
    stage: "completed",
    errorCode: null,
    message: "Inspection completed.",
    data: { platform: "darwin-arm64" },
  });
});
