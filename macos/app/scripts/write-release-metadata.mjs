import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const release = path.join(root, "release");
const packageJson = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
const entries = await fs.readdir(release);
const dmg = entries.find((entry) =>
  entry === `Codex-Change-Page-${packageJson.version}-arm64.dmg`);
if (!dmg) throw new Error("Expected arm64 DMG was not created.");
const bytes = await fs.readFile(path.join(release, dmg));
const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
await fs.writeFile(path.join(release, "SHA256SUMS.txt"), `${sha256}  ${dmg}\n`);
await fs.writeFile(path.join(release, "build-info.json"), `${JSON.stringify({
  product: packageJson.productName,
  version: packageJson.version,
  appId: "com.devin.codex-change-page",
  platform: "darwin",
  architecture: "arm64",
  artifact: dmg,
  sha256,
  builtAt: new Date().toISOString(),
}, null, 2)}\n`);
console.log(`Release metadata written for ${dmg}.`);
