import crypto from "node:crypto";
import path from "node:path";

import {
  EngineRequestSchema,
  EngineResultSchema,
  type EngineRequest,
  type EngineResult,
} from "../../shared/schemas";

type SpawnResult = { exitCode: number; stdout: string; stderr: string };
export type SpawnRunner = (executable: string, args: string[]) => Promise<SpawnResult>;

export class EngineOperationError extends Error {
  constructor(readonly result: EngineResult) {
    super(result.message);
    this.name = "EngineOperationError";
  }
}

function argumentsFor(request: EngineRequest, operationId: string) {
  const args = [request.command, "--operation-id", operationId];
  if (request.options.port) args.push("--port", String(request.options.port));
  if (request.options.restartExisting) args.push("--restart-existing");
  if (request.options.reload) args.push("--reload");
  if (request.options.preserveThemes) args.push("--preserve-themes");
  if (request.options.screenshot) args.push("--screenshot", request.options.screenshot);
  return args;
}

export class EngineService {
  constructor(
    readonly engineRoot: string,
    readonly spawnRunner: SpawnRunner,
  ) {}

  async run(
    input: EngineRequest,
    onProgress?: (result: EngineResult) => void,
    operationId = crypto.randomUUID(),
  ): Promise<EngineResult> {
    const request = EngineRequestSchema.parse(input);
    const executable = path.join(this.engineRoot, "scripts", "engine-cli-macos.sh");
    const completed = await this.spawnRunner(executable, argumentsFor(request, operationId));
    const events = completed.stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => EngineResultSchema.parse(JSON.parse(line)));
    for (const event of events) onProgress?.(event);
    const result = [...events].reverse().find(
      (event: EngineResult) => event.stage === "completed" || event.stage === "failed",
    );
    if (!result) {
      throw new Error(
        completed.stderr.trim() ||
        `${request.command} did not return a machine-readable result.`,
      );
    }
    if (!result.success || completed.exitCode !== 0) throw new EngineOperationError(result);
    return result;
  }
}
