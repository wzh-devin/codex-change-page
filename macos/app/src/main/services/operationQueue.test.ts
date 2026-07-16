import { describe, expect, it } from "vitest";

import { OperationBusyError, OperationQueue } from "./operationQueue";

describe("OperationQueue", () => {
  it("rejects a conflicting operation while one is running", async () => {
    const queue = new OperationQueue();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const first = queue.run("apply", async () => pending);

    await expect(queue.run("restore", async () => undefined)).rejects.toBeInstanceOf(OperationBusyError);
    release();
    await first;
  });

  it("clears the active operation after failure", async () => {
    const queue = new OperationQueue();
    await expect(queue.run("apply", async () => {
      throw new Error("failed");
    })).rejects.toThrow("failed");
    await expect(queue.run("restore", async () => "ok")).resolves.toBe("ok");
  });
});
