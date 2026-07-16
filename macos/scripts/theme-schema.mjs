import path from "node:path";

const DEFAULT_COLORS = Object.freeze({
  background: "#071116",
  panel: "#0b1a20",
  panelAlt: "#10272c",
  accent: "#7cff46",
  accentAlt: "#b8ff3d",
  secondary: "#36d7e8",
  highlight: "#642a8c",
  text: "#e9fff1",
  muted: "#9ebdb3",
  line: "rgba(124, 255, 70, .28)",
});

const DEFAULT_IMAGE_SETTINGS = Object.freeze({
  focalX: 0.72,
  focalY: 0.5,
  brightness: 1,
  overlayOpacity: 0.38,
});

function text(value, fallback, max) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
}

function color(value, fallback) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return /^#[0-9a-f]{6}$/i.test(normalized) || /^rgba?\([0-9., %]+\)$/i.test(normalized)
    ? normalized
    : fallback;
}

function numberInRange(value, fallback, min, max) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Number(value)));
}

export function normalizeTheme(raw) {
  if (!raw || ![1, 2].includes(raw.schemaVersion) || typeof raw.image !== "string" || !raw.image) {
    throw new Error("Theme has an unsupported schema or image field");
  }
  if (path.basename(raw.image) !== raw.image) {
    throw new Error("Theme image must stay inside its theme directory");
  }

  const settings = raw.imageSettings ?? {};
  return {
    schemaVersion: 2,
    id: text(raw.id, "custom", 80),
    name: text(raw.name, "Codex Dream Skin", 80),
    brandSubtitle: text(raw.brandSubtitle, "CODEX DREAM SKIN", 80),
    tagline: text(raw.tagline, "Make something wonderful.", 160),
    projectPrefix: text(raw.projectPrefix, "选择项目 · ", 80),
    projectLabel: text(raw.projectLabel, "◉  选择项目", 80),
    statusText: text(raw.statusText, "DREAM SKIN ONLINE", 80),
    quote: text(raw.quote, "MAKE SOMETHING WONDERFUL", 80),
    image: raw.image,
    imageSettings: {
      focalX: numberInRange(settings.focalX, DEFAULT_IMAGE_SETTINGS.focalX, 0, 1),
      focalY: numberInRange(settings.focalY, DEFAULT_IMAGE_SETTINGS.focalY, 0, 1),
      brightness: numberInRange(settings.brightness, DEFAULT_IMAGE_SETTINGS.brightness, 0.6, 1.4),
      overlayOpacity: numberInRange(settings.overlayOpacity, DEFAULT_IMAGE_SETTINGS.overlayOpacity, 0, 0.75),
    },
    colors: Object.fromEntries(
      Object.entries(DEFAULT_COLORS).map(([key, fallback]) => [
        key,
        color(raw.colors?.[key], fallback),
      ]),
    ),
  };
}

export { DEFAULT_COLORS, DEFAULT_IMAGE_SETTINGS };
