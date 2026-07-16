import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { pruneLogs } from "./logRetention";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe("pruneLogs", () => {
  it("removes old log files while preserving current and non-log files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-logs-"));
    roots.push(root);
    const old = path.join(root, "old.log");
    const current = path.join(root, "current.log");
    const state = path.join(root, "state.json");
    await Promise.all([
      fs.writeFile(old, "old"),
      fs.writeFile(current, "current"),
      fs.writeFile(state, "{}"),
    ]);
    const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    await fs.utimes(old, oldDate, oldDate);
    await pruneLogs(root, 14);
    await expect(fs.stat(old)).rejects.toMatchObject({ code: "ENOENT" });
    expect((await fs.stat(current)).isFile()).toBe(true);
    expect((await fs.stat(state)).isFile()).toBe(true);
  });
});
