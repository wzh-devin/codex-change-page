import path from "node:path";
import { randomUUID } from "node:crypto";

const SUPPORTED_COMMANDS = new Set([
  "inspect",
  "install",
  "status",
  "apply",
  "pause",
  "verify",
  "restore",
  "uninstall",
  "migrate",
]);

function engineError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw engineError("ENGINE_MISMATCH", `Invalid port: ${value}`);
  }
  return port;
}

export function parseCliArgs(argv) {
  const [command, ...args] = argv;
  if (!SUPPORTED_COMMANDS.has(command)) {
    throw engineError("ENGINE_MISMATCH", `Unsupported engine command: ${command || "missing"}`);
  }
  const options = {};
  let operationId = randomUUID();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--operation-id") operationId = args[++index] || operationId;
    else if (arg === "--restart-existing") options.restartExisting = true;
    else if (arg === "--reload") options.reload = true;
    else if (arg === "--preserve-themes") options.preserveThemes = true;
    else if (arg === "--port") options.port = parsePort(args[++index]);
    else if (arg === "--screenshot") options.screenshot = path.resolve(args[++index]);
    else throw engineError("ENGINE_MISMATCH", `Unsupported engine option: ${arg}`);
  }
  return { command, operationId, options };
}

export function buildInvocation(command, options, root) {
  const script = (name) => path.join(root, "scripts", name);
  const portArgs = options.port ? ["--port", String(options.port)] : [];
  switch (command) {
    case "inspect":
      return { executable: script("doctor-macos.sh"), args: [] };
    case "install":
      return {
        executable: script("install-dream-skin-macos.sh"),
        args: ["--no-launch", "--no-launchers", "--in-place"],
      };
    case "status":
      return { executable: script("status-dream-skin-macos.sh"), args: ["--json", "--deep"] };
    case "migrate":
      return { executable: script("migrate-engine-state.mjs"), args: [] };
    case "apply":
      return {
        executable: script("start-dream-skin-macos.sh"),
        args: [...portArgs, ...(options.restartExisting ? ["--restart-existing"] : ["--prompt-restart"])],
      };
    case "pause":
      return { executable: script("pause-dream-skin-macos.sh"), args: portArgs };
    case "verify":
      return {
        executable: script("verify-dream-skin-macos.sh"),
        args: [
          ...portArgs,
          ...(options.reload ? ["--reload"] : []),
          ...(options.screenshot ? ["--screenshot", options.screenshot] : []),
        ],
      };
    case "restore":
      return {
        executable: script("restore-dream-skin-macos.sh"),
        args: ["--restore-base-theme", "--restart-codex"],
      };
    case "uninstall":
      return {
        executable: script("restore-dream-skin-macos.sh"),
        args: ["--restore-base-theme", "--restart-codex", "--uninstall"],
      };
    default:
      throw engineError("ENGINE_MISMATCH", `Unsupported engine command: ${command}`);
  }
}

export function errorCodeFor(message) {
  const value = String(message || "");
  if (/could not find the official codex|codex app bundle/i.test(value)) return "CODEX_NOT_FOUND";
  if (/architecture|requires macos/i.test(value)) return "UNSUPPORTED_ARCH";
  if (/signature|signing team/i.test(value)) return "SIGNATURE_INVALID";
  if (/node\.js|node runtime|bundled node/i.test(value)) return "NODE_INVALID";
  if (/config.*not found/i.test(value)) return "CONFIG_MISSING";
  if (/restart authorization|close it first|restart.*required/i.test(value)) return "RESTART_REQUIRED";
  if (/not a verified codex|no verified codex|cdp endpoint/i.test(value)) return "CDP_UNVERIFIED";
  if (/backup/i.test(value)) return "BACKUP_MISSING";
  if (/theme|image|payload/i.test(value)) return "THEME_INVALID";
  if (/restore/i.test(value)) return "RESTORE_INCOMPLETE";
  return "ENGINE_MISMATCH";
}

export function operationResult({
  operationId,
  command,
  success,
  stage,
  errorCode = null,
  message,
  data = null,
}) {
  return { operationId, command, success, stage, errorCode, message, data };
}
