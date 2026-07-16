import path from "node:path";
import { z } from "zod";

const HexColor = z.string().regex(/^#[0-9a-f]{6}$/i);
const CssLineColor = z.string().refine(
  (value) => HexColor.safeParse(value).success || /^rgba?\([0-9., %]+\)$/i.test(value),
  "Expected a six-digit hex or rgb/rgba color.",
);
const SafeFilename = z.string().min(1).max(255).refine(
  (value) => path.basename(value) === value && !value.includes("\0"),
  "Expected a filename contained inside the theme directory.",
);

export const ThemeColorsSchema = z.object({
  background: HexColor,
  panel: HexColor,
  panelAlt: HexColor,
  accent: HexColor,
  accentAlt: HexColor,
  secondary: HexColor,
  highlight: HexColor,
  text: HexColor,
  muted: HexColor,
  line: CssLineColor,
}).strict();

export const ImageSettingsSchema = z.object({
  focalX: z.number().min(0).max(1),
  focalY: z.number().min(0).max(1),
  brightness: z.number().min(0.6).max(1.4),
  overlayOpacity: z.number().min(0).max(0.75),
}).strict();

export const ThemeSchema = z.object({
  schemaVersion: z.literal(2),
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/i),
  name: z.string().trim().min(1).max(80),
  image: SafeFilename,
  imageSettings: ImageSettingsSchema,
  brandSubtitle: z.string().trim().min(1).max(80),
  tagline: z.string().trim().min(1).max(160),
  projectPrefix: z.string().max(80),
  projectLabel: z.string().max(80),
  statusText: z.string().max(80),
  quote: z.string().max(80),
  colors: ThemeColorsSchema,
}).strict();

export type Theme = z.infer<typeof ThemeSchema>;

const DEFAULT_COLORS: Theme["colors"] = {
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
};

export function migrateTheme(input: unknown): Theme {
  if (typeof input !== "object" || input === null) {
    throw new Error("Theme must be an object.");
  }
  const raw = input as Record<string, unknown>;
  if (raw.schemaVersion === 2) return ThemeSchema.parse(raw);
  if (raw.schemaVersion !== 1) throw new Error("Unsupported theme schema.");
  const legacyColors = typeof raw.colors === "object" && raw.colors !== null
    ? raw.colors as Record<string, unknown>
    : {};
  const accent = HexColor.safeParse(legacyColors.accent).success
    ? String(legacyColors.accent)
    : DEFAULT_COLORS.accent;
  return ThemeSchema.parse({
    schemaVersion: 2,
    id: raw.id,
    name: raw.name,
    image: raw.image,
    imageSettings: {
      focalX: 0.72,
      focalY: 0.5,
      brightness: 1,
      overlayOpacity: 0.38,
    },
    brandSubtitle: raw.brandSubtitle || "CODEX DREAM SKIN",
    tagline: raw.tagline || "Make something wonderful.",
    projectPrefix: raw.projectPrefix || "选择项目 · ",
    projectLabel: raw.projectLabel || "◉  选择项目",
    statusText: raw.statusText || "DREAM SKIN ONLINE",
    quote: raw.quote || "MAKE SOMETHING WONDERFUL",
    colors: {
      ...DEFAULT_COLORS,
      ...Object.fromEntries(
        Object.entries(legacyColors).filter(([key, value]) =>
          key in DEFAULT_COLORS &&
          (key === "line" ? CssLineColor.safeParse(value).success : HexColor.safeParse(value).success)),
      ),
      accentAlt: HexColor.safeParse(legacyColors.accentAlt).success
        ? String(legacyColors.accentAlt)
        : accent,
    },
  });
}

export const EngineCommandSchema = z.enum([
  "inspect",
  "install",
  "status",
  "apply",
  "pause",
  "verify",
  "restore",
  "uninstall",
  "migrate",
]);

const AbsolutePath = z.string().refine(
  (value) => path.isAbsolute(value) && !value.includes("\0") && !/[;&|`]/.test(value),
  "Expected a safe absolute path.",
);

export const EngineRequestSchema = z.object({
  command: EngineCommandSchema,
  options: z.object({
    port: z.number().int().min(1024).max(65535).optional(),
    restartExisting: z.boolean().optional(),
    reload: z.boolean().optional(),
    preserveThemes: z.boolean().optional(),
    screenshot: AbsolutePath.optional(),
  }).strict().default({}),
}).strict();

export type EngineRequest = z.infer<typeof EngineRequestSchema>;

export const EngineResultSchema = z.object({
  operationId: z.string().min(1),
  command: EngineCommandSchema,
  success: z.boolean(),
  stage: z.enum(["started", "completed", "failed"]),
  errorCode: z.string().nullable(),
  message: z.string(),
  data: z.unknown().nullable(),
}).strict();

export type EngineResult = z.infer<typeof EngineResultSchema>;
