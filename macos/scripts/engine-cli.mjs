import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildInvocation,
  errorCodeFor,
  operationResult,
  parseCliArgs,
} from "./engine-cli-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

function emit(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function parseOutput(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return { output: trimmed };
  }
}

function run(executable, args) {
  return new Promise((resolve) => {
    const child = spawn(executable, args, {
      cwd: root,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => resolve({ code: 1, stdout, stderr: `${stderr}${error.message}` }));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

try {
  const request = parseCliArgs(process.argv.slice(2));
  const invocation = buildInvocation(request.command, request.options, root);
  emit(operationResult({
    ...request,
    success: true,
    stage: "started",
    message: `${request.command} started.`,
  }));
  const completed = await run(invocation.executable, invocation.args);
  if (completed.code !== 0) {
    const message = completed.stderr.trim() || completed.stdout.trim() || `${request.command} failed.`;
    emit(operationResult({
      ...request,
      success: false,
      stage: "failed",
      errorCode: errorCodeFor(message),
      message,
      data: { exitCode: completed.code },
    }));
    process.exitCode = completed.code;
  } else {
    emit(operationResult({
      ...request,
      success: true,
      stage: "completed",
      message: `${request.command} completed.`,
      data: parseOutput(completed.stdout),
    }));
  }
} catch (error) {
  emit(operationResult({
    operationId: "unparsed",
    command: process.argv[2] || "unknown",
    success: false,
    stage: "failed",
    errorCode: error.code || errorCodeFor(error.message),
    message: error.message,
  }));
  process.exitCode = 1;
}
