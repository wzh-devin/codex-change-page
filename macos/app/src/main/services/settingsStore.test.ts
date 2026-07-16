import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { SettingsStore } from "./settingsStore";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe("SettingsStore", () => {
  it("returns safe defaults and persists validated updates", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-settings-"));
    roots.push(root);
    const store = new SettingsStore(path.join(root, "settings.json"));
    expect(await store.get()).toMatchObject({ onboardingComplete: false, openAtLogin: false });
    await store.update({ onboardingComplete: true, logRetentionDays: 14 });
    expect(await store.get()).toMatchObject({ onboardingComplete: true, logRetentionDays: 14 });
  });
});
