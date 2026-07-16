import { describe, expect, it } from "vitest";

import { derivePalette } from "./color";

describe("derivePalette", () => {
  it("derives stable accent, secondary and highlight colors from sampled pixels", () => {
    const palette = derivePalette(new Uint8ClampedArray([
      90, 100, 220, 255,
      95, 105, 225, 255,
      30, 180, 190, 255,
      180, 60, 140, 255,
      250, 250, 250, 255,
      0, 0, 0, 0,
    ]));
    expect(palette.accent).toMatch(/^#[0-9a-f]{6}$/);
    expect(palette.secondary).toMatch(/^#[0-9a-f]{6}$/);
    expect(palette.highlight).toMatch(/^#[0-9a-f]{6}$/);
    expect(new Set(Object.values(palette)).size).toBeGreaterThan(1);
  });
});
