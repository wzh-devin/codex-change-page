import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const output = path.join(root, "engine-manifest.json");
const topLevelFiles = [
  "VERSION",
  "LICENSE",
  "NOTICE.md",
  "Install Codex Dream Skin.command",
  "Install Menu Bar.command",
  "Start Codex Dream Skin.command",
  "Customize Codex Dream Skin.command",
  "Verify Codex Dream Skin.command",
  "Restore Codex Dream Skin.command",
];
const directories = ["assets", "scripts", "menubar"];

async function filesBelow(directory, relative = "") {
  const entries = await fs.readdir(path.join(directory, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(directory, child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

const included = [];
for (const file of topLevelFiles) {
  try {
    if ((await fs.stat(path.join(root, file))).isFile()) included.push(file);
  } catch {}
}
for (const directory of directories) {
  for (const file of await filesBelow(path.join(root, directory))) {
    included.push(path.join(directory, file));
  }
}
included.sort();

const files = {};
for (const relative of included) {
  files[relative] = crypto
    .createHash("sha256")
    .update(await fs.readFile(path.join(root, relative)))
    .digest("hex");
}
const manifest = {
  schemaVersion: 1,
  version: (await fs.readFile(path.join(root, "VERSION"), "utf8")).trim(),
  createdAt: new Date().toISOString(),
  files,
};
await fs.writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated ${output} with ${included.length} files.`);
