import { spawn } from "node:child_process";

import type { SpawnRunner } from "./engineService";

export const spawnRunner: SpawnRunner = (executable, args) =>
  new Promise((resolve) => {
    const child = spawn(executable, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => resolve({
      exitCode: 1,
      stdout,
      stderr: `${stderr}${error.message}`,
    }));
    child.on("close", (code) => resolve({ exitCode: code ?? 1, stdout, stderr }));
  });
