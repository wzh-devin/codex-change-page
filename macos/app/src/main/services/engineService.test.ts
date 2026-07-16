import { describe, expect, it, vi } from "vitest";

import { EngineService } from "./engineService";

describe("EngineService", () => {
  it("runs the wrapper with argument arrays and emits parsed progress", async () => {
    const spawn = vi.fn(async (_executable: string, _args: string[]) => ({
      exitCode: 0,
      stdout: [
        JSON.stringify({
          operationId: "op-1",
          command: "inspect",
          success: true,
          stage: "started",
          errorCode: null,
          message: "inspect started.",
          data: null,
        }),
        JSON.stringify({
          operationId: "op-1",
          command: "inspect",
          success: true,
          stage: "completed",
          errorCode: null,
          message: "inspect completed.",
          data: { pass: true },
        }),
      ].join("\n"),
      stderr: "",
    }));
    const service = new EngineService("/engine", spawn);
    const progress: string[] = [];
    const result = await service.run(
      { command: "inspect", options: {} },
      (event) => progress.push(event.stage),
    );
    expect(spawn).toHaveBeenCalledWith(
      "/engine/scripts/engine-cli-macos.sh",
      ["inspect", "--operation-id", expect.any(String)],
    );
    expect(progress).toEqual(["started", "completed"]);
    expect(result.data).toEqual({ pass: true });
  });

  it("rejects a zero-exit operation that did not emit a completed result", async () => {
    const service = new EngineService("/engine", async () => ({
      exitCode: 0,
      stdout: "",
      stderr: "",
    }));
    await expect(service.run({ command: "status", options: {} })).rejects.toThrow(/machine-readable result/i);
  });
});
