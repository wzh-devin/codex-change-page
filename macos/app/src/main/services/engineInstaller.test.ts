import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createEngineManifest, EngineInstaller } from "./engineInstaller";

const roots: string[] = [];

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-engine-installer-"));
  roots.push(root);
  const bundled = path.join(root, "bundled");
  const installed = path.join(root, "installed");
  await fs.mkdir(path.join(bundled, "scripts"), { recursive: true });
  await fs.mkdir(path.join(bundled, "assets"), { recursive: true });
  await fs.writeFile(path.join(bundled, "VERSION"), "1.2.0\n");
  await fs.writeFile(path.join(bundled, "scripts", "engine-cli.mjs"), "console.log('ok')\n");
  await fs.writeFile(path.join(bundled, "assets", "theme.json"), "{}\n");
  const manifest = await createEngineManifest(bundled);
  await fs.writeFile(path.join(bundled, "engine-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return { bundled, installed };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe("EngineInstaller", () => {
  it("validates and atomically installs bundled engine files", async () => {
    const { bundled, installed } = await fixture();
    const installer = new EngineInstaller(bundled, installed);
    const result = await installer.install();
    expect(result.version).toBe("1.2.0");
    expect(await fs.readFile(path.join(installed, "VERSION"), "utf8")).toBe("1.2.0\n");
  });

  it("rejects a resource modified after the manifest was generated", async () => {
    const { bundled, installed } = await fixture();
    await fs.writeFile(path.join(bundled, "assets", "theme.json"), "{\"tampered\":true}\n");
    const installer = new EngineInstaller(bundled, installed);
    await expect(installer.install()).rejects.toThrow(/hash/i);
  });

  it("reports an installed engine with modified resources as not current", async () => {
    const { bundled, installed } = await fixture();
    const installer = new EngineInstaller(bundled, installed);
    await installer.install();
    await fs.writeFile(path.join(installed, "assets", "theme.json"), "{\"tampered\":true}\n");
    await expect(installer.inspect()).resolves.toMatchObject({
      installed: true,
      current: false,
      installedVersion: "1.2.0",
    });
  });
});
