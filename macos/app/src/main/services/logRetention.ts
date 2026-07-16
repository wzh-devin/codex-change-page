import fs from "node:fs/promises";
import path from "node:path";

export async function pruneLogs(root: string, retentionDays: number) {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".log"))
    .map(async (entry) => {
      const file = path.join(root, entry.name);
      const stat = await fs.stat(file);
      if (stat.mtimeMs < cutoff) await fs.rm(file, { force: true });
    }));
}
