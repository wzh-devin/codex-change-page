import { describe, expect, it } from "vitest";

import {
  EngineRequestSchema,
  ThemeSchema,
  migrateTheme,
} from "./schemas";

describe("ThemeSchema", () => {
  it("migrates a legacy v1 theme to v2", () => {
    const migrated = migrateTheme({
      schemaVersion: 1,
      id: "legacy",
      name: "Legacy",
      image: "background.png",
      colors: { accent: "#5865d8" },
    });
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.imageSettings).toEqual({
      focalX: 0.72,
      focalY: 0.5,
      brightness: 1,
      overlayOpacity: 0.38,
    });
    expect(ThemeSchema.parse(migrated).id).toBe("legacy");
  });

  it("rejects paths and executable theme content", () => {
    expect(() => ThemeSchema.parse({
      schemaVersion: 2,
      id: "bad",
      name: "Bad",
      image: "../outside.png",
      imageSettings: { focalX: 0.5, focalY: 0.5, brightness: 1, overlayOpacity: 0.3 },
      brandSubtitle: "CODEX",
      tagline: "Theme",
      projectPrefix: "Project",
      projectLabel: "Choose",
      statusText: "Active",
      quote: "Quote",
      colors: {
        background: "#071116",
        panel: "#0b1a20",
        panelAlt: "#10272c",
        accent: "#5865d8",
        accentAlt: "#8790f2",
        secondary: "#36d7e8",
        highlight: "#642a8c",
        text: "#e9fff1",
        muted: "#9ebdb3",
        line: "rgba(124, 255, 70, .28)",
      },
      script: "evil.js",
    })).toThrow();
  });
});

describe("EngineRequestSchema", () => {
  it("accepts typed apply options and rejects shell fragments", () => {
    expect(EngineRequestSchema.parse({
      command: "apply",
      options: { port: 9341, restartExisting: true },
    }).command).toBe("apply");
    expect(() => EngineRequestSchema.parse({
      command: "apply",
      options: { screenshot: "; rm -rf ~" },
    })).toThrow();
  });
});
