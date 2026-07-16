import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { _electron as electron, expect, test } from "@playwright/test";

test("launches the secure onboarding window", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-change-page-e2e-"));
  const application = await electron.launch({
    args: ["."],
    env: { ...process.env, CODEX_CHANGE_PAGE_TEST_ROOT: root },
  });
  try {
    const window = await application.firstWindow();
    await expect(window.getByRole("heading", { name: "欢迎使用 Codex 换肤助手" })).toBeVisible();
    const snapshot = await window.evaluate(() => window.skinAPI.system.inspect());
    expect(snapshot.engine.bundledVersion).toBe("1.2.0");
    await expect(window.locator(".check.fail")).toHaveCount(0);
    await expect(window.getByText("本机 CDP")).toHaveCount(0);
    await window.screenshot({ path: "test-results/onboarding.png", fullPage: true });
  } finally {
    await application.close();
    await fs.rm(root, { recursive: true, force: true });
  }
});
