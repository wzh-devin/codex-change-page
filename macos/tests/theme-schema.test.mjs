import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { normalizeTheme } from "../scripts/theme-schema.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const baseTheme = {
  id: "theme-1",
  name: "Theme",
  image: "background.jpg",
  colors: {
    accent: "#5865d8",
    secondary: "#36d7e8",
    highlight: "#642a8c",
  },
};

test("normalizeTheme migrates v1 themes to the v2 runtime shape", () => {
  const theme = normalizeTheme({ ...baseTheme, schemaVersion: 1 });
  assert.equal(theme.schemaVersion, 2);
  assert.deepEqual(theme.imageSettings, {
    focalX: 0.72,
    focalY: 0.5,
    brightness: 1,
    overlayOpacity: 0.38,
  });
});

test("normalizeTheme keeps valid v2 image settings", () => {
  const theme = normalizeTheme({
    ...baseTheme,
    schemaVersion: 2,
    imageSettings: {
      focalX: 0.2,
      focalY: 0.8,
      brightness: 1.2,
      overlayOpacity: 0.25,
    },
  });
  assert.deepEqual(theme.imageSettings, {
    focalX: 0.2,
    focalY: 0.8,
    brightness: 1.2,
    overlayOpacity: 0.25,
  });
});

test("normalizeTheme rejects unsafe image paths", () => {
  assert.throws(
    () => normalizeTheme({ ...baseTheme, schemaVersion: 2, image: "../outside.png" }),
    /inside its theme directory/,
  );
});

test("normalizeTheme clamps invalid image settings and colors to safe defaults", () => {
  const theme = normalizeTheme({
    ...baseTheme,
    schemaVersion: 2,
    imageSettings: {
      focalX: -10,
      focalY: 3,
      brightness: 9,
      overlayOpacity: 2,
    },
    colors: { accent: "red", line: "url(evil)" },
  });
  assert.deepEqual(theme.imageSettings, {
    focalX: 0,
    focalY: 1,
    brightness: 1.4,
    overlayOpacity: 0.75,
  });
  assert.equal(theme.colors.accent, "#7cff46");
  assert.equal(theme.colors.line, "rgba(124, 255, 70, .28)");
});

test("renderer payload exposes v2 image controls as CSS variables", async () => {
  const [renderer, css] = await Promise.all([
    fs.readFile(path.join(root, "assets", "renderer-inject.js"), "utf8"),
    fs.readFile(path.join(root, "assets", "dream-skin.css"), "utf8"),
  ]);
  for (const variable of [
    "--dream-skin-focal-x",
    "--dream-skin-focal-y",
    "--dream-skin-brightness",
    "--dream-skin-overlay-opacity",
  ]) {
    assert.match(renderer, new RegExp(variable));
  }
  assert.match(css, /var\(--dream-skin-focal-x\)/);
  assert.match(css, /var\(--dream-skin-brightness\)/);
});
