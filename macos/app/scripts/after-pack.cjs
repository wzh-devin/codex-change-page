const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;
  if (process.env.CSC_LINK || process.env.CSC_NAME) return;
  const app = fs.readdirSync(context.appOutDir)
    .find((entry) => entry.endsWith(".app"));
  if (!app) throw new Error("Packaged macOS app was not found for ad-hoc signing.");
  const appPath = path.join(context.appOutDir, app);
  const result = spawnSync("/usr/bin/codesign", [
    "--force",
    "--deep",
    "--sign",
    "-",
    appPath,
  ], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || "Ad-hoc code signing failed.");
  }
};
