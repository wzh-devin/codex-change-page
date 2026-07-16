import { describe, expect, it } from "vitest";

import {
  NAVIGATION_ITEMS,
  nextOnboardingStep,
  statusPresentation,
} from "./model";

describe("renderer model", () => {
  it("exposes the complete manager navigation in the approved order", () => {
    expect(NAVIGATION_ITEMS.map((item) => item.id)).toEqual([
      "overview",
      "themes",
      "editor",
      "diagnostics",
      "restore",
      "settings",
      "about",
    ]);
  });

  it("blocks onboarding until compatibility checks pass", () => {
    expect(nextOnboardingStep("inspect", { compatible: false, backupReady: false, themeReady: false }))
      .toBe("inspect");
    expect(nextOnboardingStep("inspect", { compatible: true, backupReady: false, themeReady: false }))
      .toBe("backup");
    expect(nextOnboardingStep("backup", { compatible: true, backupReady: true, themeReady: false }))
      .toBe("theme");
    expect(nextOnboardingStep("theme", { compatible: true, backupReady: true, themeReady: true }))
      .toBe("apply");
  });

  it("uses text and symbols in addition to semantic colors", () => {
    expect(statusPresentation("active")).toMatchObject({ label: "皮肤运行中", symbol: "●" });
    expect(statusPresentation("error")).toMatchObject({ label: "需要处理", symbol: "!" });
  });
});
