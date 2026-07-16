import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { OperationJournal } from "./journal";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe("OperationJournal", () => {
  it("reports an interrupted operation until it is completed", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-journal-"));
    roots.push(root);
    const journal = new OperationJournal(path.join(root, "operation.json"));
    await journal.start("op-1", "restore");
    expect((await journal.interrupted())?.command).toBe("restore");
    await journal.complete("op-1", true);
    expect(await journal.interrupted()).toBeNull();
  });
});
