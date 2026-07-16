import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

type EngineManifest = {
  schemaVersion: 1;
  version: string;
  files: Record<string, string>;
};

async function sha256(file: string) {
  const hash = crypto.createHash("sha256");
  hash.update(await fs.readFile(file));
  return hash.digest("hex");
}

async function filesBelow(root: string, relative = ""): Promise<string[]> {
  const directory = path.join(root, relative);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const child = path.join(relative, entry.name);
    if (child === "engine-manifest.json") continue;
    if (entry.isDirectory()) files.push(...await filesBelow(root, child));
    else if (entry.isFile()) files.push(child);
  }
  return files.sort();
}

export async function createEngineManifest(root: string): Promise<EngineManifest> {
  const version = (await fs.readFile(path.join(root, "VERSION"), "utf8")).trim();
  const files = Object.fromEntries(
    await Promise.all((await filesBelow(root)).map(async (relative) => [
      relative,
      await sha256(path.join(root, relative)),
    ])),
  );
  return { schemaVersion: 1, version, files };
}

async function validateManifest(root: string): Promise<EngineManifest> {
  const manifest = JSON.parse(
    await fs.readFile(path.join(root, "engine-manifest.json"), "utf8"),
  ) as EngineManifest;
  if (manifest.schemaVersion !== 1 || !manifest.version || !manifest.files) {
    throw new Error("Engine manifest schema is invalid.");
  }
  const actualFiles = await filesBelow(root);
  const expectedFiles = Object.keys(manifest.files).sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error("Engine manifest file inventory does not match bundled resources.");
  }
  for (const [relative, expected] of Object.entries(manifest.files)) {
    const actual = await sha256(path.join(root, relative));
    if (actual !== expected) throw new Error(`Engine file hash mismatch: ${relative}`);
  }
  return manifest;
}

export class EngineInstaller {
  constructor(
    readonly bundledRoot: string,
    readonly installedRoot: string,
  ) {}

  async inspect() {
    const bundled = await validateManifest(this.bundledRoot);
    try {
      await fs.access(this.installedRoot);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return {
        installed: false,
        current: false,
        bundledVersion: bundled.version,
        installedVersion: null,
      };
    }
    let installedVersion: string | null = null;
    try {
      installedVersion = (
        await fs.readFile(path.join(this.installedRoot, "VERSION"), "utf8")
      ).trim();
      const installed = await validateManifest(this.installedRoot);
      const sameFiles = JSON.stringify(installed.files) === JSON.stringify(bundled.files);
      return {
        installed: true,
        current: installed.version === bundled.version && sameFiles,
        bundledVersion: bundled.version,
        installedVersion,
      };
    } catch {
      return {
        installed: true,
        current: false,
        bundledVersion: bundled.version,
        installedVersion,
      };
    }
  }

  async install() {
    const manifest = await validateManifest(this.bundledRoot);
    const temporary = `${this.installedRoot}.installing.${process.pid}`;
    const previous = `${this.installedRoot}.previous.${process.pid}`;
    await fs.mkdir(path.dirname(this.installedRoot), { recursive: true, mode: 0o700 });
    await fs.rm(temporary, { recursive: true, force: true });
    await fs.cp(this.bundledRoot, temporary, { recursive: true });
    try {
      await fs.rename(this.installedRoot, previous);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    try {
      await fs.rename(temporary, this.installedRoot);
      await fs.rm(previous, { recursive: true, force: true });
    } catch (error) {
      await fs.rm(temporary, { recursive: true, force: true });
      try {
        await fs.rename(previous, this.installedRoot);
      } catch {}
      throw error;
    }
    return { version: manifest.version, root: this.installedRoot };
  }
}
