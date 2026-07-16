import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { AppController } from "./appController";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) =>
    fs.rm(root, { recursive: true, force: true })));
});

describe("AppController clearData", () => {
  it("requires a successful restore-and-uninstall receipt before deleting data", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-controller-"));
    roots.push(root);
    const controller = new AppController({
      bundledEngineRoot: path.join(root, "bundled"),
      installedEngineRoot: path.join(root, "installed"),
      stateRoot: path.join(root, "state"),
      appDataRoot: path.join(root, "app-data"),
    });
    controller.installer.inspect = async () => ({
      installed: false,
      current: false,
      bundledVersion: "1.2.0",
      installedVersion: null,
    });
    await fs.mkdir(controller.paths.stateRoot, { recursive: true });
    await fs.writeFile(path.join(controller.paths.stateRoot, "theme.txt"), "keep");

    await expect(controller.clearData()).rejects.toThrow(/restore|uninstall/i);
    await expect(fs.readFile(path.join(controller.paths.stateRoot, "theme.txt"), "utf8"))
      .resolves.toBe("keep");
  });
});
