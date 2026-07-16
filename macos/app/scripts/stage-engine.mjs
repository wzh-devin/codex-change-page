import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const sourceRoot = path.resolve(appRoot, "..");
const destinationRoot = path.join(appRoot, ".engine");
const manifestPath = path.join(sourceRoot, "engine-manifest.json");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

if (manifest.schemaVersion !== 1 || !manifest.files ||
    typeof manifest.files !== "object") {
  throw new Error("Engine manifest schema is invalid.");
}

const temporary = `${destinationRoot}.staging.${process.pid}`;
const previous = `${destinationRoot}.previous.${process.pid}`;
await fs.rm(temporary, { recursive: true, force: true });
await fs.rm(previous, { recursive: true, force: true });
await fs.mkdir(temporary, { recursive: true, mode: 0o700 });

for (const relative of [...Object.keys(manifest.files), "engine-manifest.json"]) {
  if (path.isAbsolute(relative) || relative.includes("\0")) {
    throw new Error(`Unsafe Engine manifest path: ${relative}`);
  }
  const source = path.resolve(sourceRoot, relative);
  if (!source.startsWith(`${sourceRoot}${path.sep}`)) {
    throw new Error(`Engine manifest path escapes its root: ${relative}`);
  }
  const destination = path.resolve(temporary, relative);
  if (!destination.startsWith(`${temporary}${path.sep}`)) {
    throw new Error(`Engine staging path escapes its root: ${relative}`);
  }
  const stat = await fs.stat(source);
  if (!stat.isFile()) throw new Error(`Engine resource is not a file: ${relative}`);
  await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  await fs.copyFile(source, destination);
  await fs.chmod(destination, stat.mode & 0o777);
}

try {
  await fs.rename(destinationRoot, previous);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
try {
  await fs.rename(temporary, destinationRoot);
  await fs.rm(previous, { recursive: true, force: true });
} catch (error) {
  await fs.rm(temporary, { recursive: true, force: true });
  try {
    await fs.rename(previous, destinationRoot);
  } catch {}
  throw error;
}

console.log(
  `Staged ${Object.keys(manifest.files).length} Engine files at ${destinationRoot}.`,
);
