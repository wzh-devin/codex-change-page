import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

import { migrateTheme, ThemeSchema, type Theme } from "../../shared/schemas";

type CreateThemeInput = {
  sourceImage: string;
  name: string;
  colors: Pick<Theme["colors"], "accent" | "secondary" | "highlight">;
};

type ThemePatch = Partial<Omit<Theme, "schemaVersion" | "id" | "image" | "colors" | "imageSettings">> & {
  colors?: Partial<Theme["colors"]>;
  imageSettings?: Partial<Theme["imageSettings"]>;
};

async function atomicJson(file: string, value: unknown) {
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(temporary, file);
}

async function replaceDirectory(source: string, destination: string) {
  const temporary = `${destination}.installing.${process.pid}`;
  const previous = `${destination}.previous.${process.pid}`;
  await fs.rm(temporary, { recursive: true, force: true });
  await fs.cp(source, temporary, { recursive: true });
  try {
    await fs.rename(destination, previous);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  try {
    await fs.rename(temporary, destination);
    await fs.rm(previous, { recursive: true, force: true });
  } catch (error) {
    await fs.rm(temporary, { recursive: true, force: true });
    try {
      await fs.rename(previous, destination);
    } catch {}
    throw error;
  }
}

export class ThemeStore {
  readonly themesRoot: string;
  readonly activeRoot: string;

  constructor(readonly stateRoot: string) {
    this.themesRoot = path.join(stateRoot, "themes");
    this.activeRoot = path.join(stateRoot, "theme");
  }

  private async ensure() {
    await fs.mkdir(this.themesRoot, { recursive: true, mode: 0o700 });
  }

  async createFromImage(input: CreateThemeInput): Promise<Theme> {
    await this.ensure();
    const stat = await fs.stat(input.sourceImage);
    if (!stat.isFile() || stat.size > 50 * 1024 * 1024) {
      throw new Error("Theme source image must be a file no larger than 50 MB.");
    }
    const extension = path.extname(input.sourceImage).toLowerCase() || ".png";
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(extension)) {
      throw new Error("Unsupported theme image type.");
    }
    const id = `theme-${crypto.randomUUID()}`;
    const themeRoot = path.join(this.themesRoot, id);
    await fs.mkdir(themeRoot, { recursive: true, mode: 0o700 });
    const image = `background${extension}`;
    await fs.copyFile(input.sourceImage, path.join(themeRoot, image));
    const theme = ThemeSchema.parse({
      schemaVersion: 2,
      id,
      name: input.name,
      image,
      imageSettings: {
        focalX: 0.72,
        focalY: 0.5,
        brightness: 1,
        overlayOpacity: 0.38,
      },
      brandSubtitle: "CODEX DREAM SKIN",
      tagline: "把喜欢的画面变成可交互的 Codex 工作台。",
      projectPrefix: "选择项目 · ",
      projectLabel: "◉  选择项目",
      statusText: "DREAM SKIN ONLINE",
      quote: "MAKE SOMETHING WONDERFUL",
      colors: {
        background: "#071116",
        panel: "#0b1a20",
        panelAlt: "#10272c",
        accent: input.colors.accent,
        accentAlt: input.colors.accent,
        secondary: input.colors.secondary,
        highlight: input.colors.highlight,
        text: "#e9fff1",
        muted: "#9ebdb3",
        line: "rgba(124, 255, 70, .28)",
      },
    });
    await atomicJson(path.join(themeRoot, "theme.json"), theme);
    return theme;
  }

  async list(): Promise<Theme[]> {
    await this.ensure();
    const entries = await fs.readdir(this.themesRoot, { withFileTypes: true });
    const themes: Theme[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const raw = JSON.parse(await fs.readFile(path.join(this.themesRoot, entry.name, "theme.json"), "utf8"));
        themes.push(migrateTheme(raw));
      } catch {
        // Invalid directories remain visible through diagnostics, not the theme picker.
      }
    }
    return themes.sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
  }

  async select(id: string): Promise<void> {
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/i.test(id)) throw new Error("Invalid theme id.");
    const source = path.join(this.themesRoot, id);
    const raw = JSON.parse(await fs.readFile(path.join(source, "theme.json"), "utf8"));
    ThemeSchema.parse(migrateTheme(raw));
    await replaceDirectory(source, this.activeRoot);
  }

  private async readTheme(id: string): Promise<Theme> {
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/i.test(id)) throw new Error("Invalid theme id.");
    const raw = JSON.parse(
      await fs.readFile(path.join(this.themesRoot, id, "theme.json"), "utf8"),
    );
    return migrateTheme(raw);
  }

  async update(id: string, patch: ThemePatch): Promise<Theme> {
    const current = await this.readTheme(id);
    const next = ThemeSchema.parse({
      ...current,
      ...patch,
      schemaVersion: 2,
      id: current.id,
      image: current.image,
      colors: { ...current.colors, ...patch.colors },
      imageSettings: { ...current.imageSettings, ...patch.imageSettings },
    });
    await atomicJson(path.join(this.themesRoot, id, "theme.json"), next);
    const active = await this.active();
    if (active?.id === id) await this.select(id);
    return next;
  }

  async duplicate(id: string): Promise<Theme> {
    await this.ensure();
    const current = await this.readTheme(id);
    const duplicateId = `theme-${crypto.randomUUID()}`;
    const source = path.join(this.themesRoot, id);
    const destination = path.join(this.themesRoot, duplicateId);
    await fs.cp(source, destination, { recursive: true });
    const duplicate = ThemeSchema.parse({
      ...current,
      id: duplicateId,
      name: `${current.name} 副本`.slice(0, 80),
    });
    await atomicJson(path.join(destination, "theme.json"), duplicate);
    return duplicate;
  }

  async active(): Promise<Theme | null> {
    try {
      const raw = JSON.parse(await fs.readFile(path.join(this.activeRoot, "theme.json"), "utf8"));
      return migrateTheme(raw);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const active = await this.active();
    if (active?.id === id) throw new Error("The active theme cannot be deleted.");
    await fs.rm(path.join(this.themesRoot, id), { recursive: true, force: true });
  }

  async exportPackage(id: string, output: string): Promise<void> {
    const theme = await this.readTheme(id);
    const image = new Uint8Array(
      await fs.readFile(path.join(this.themesRoot, id, theme.image)),
    );
    const themeBytes = strToU8(`${JSON.stringify(theme, null, 2)}\n`);
    const hash = (value: Uint8Array) =>
      crypto.createHash("sha256").update(value).digest("hex");
    const manifest = {
      schemaVersion: 1,
      packageType: "codex-dream-skin-theme",
      exportedAt: new Date().toISOString(),
      files: {
        "theme.json": hash(themeBytes),
        [theme.image]: hash(image),
      },
    };
    const archive = zipSync({
      "manifest.json": strToU8(`${JSON.stringify(manifest, null, 2)}\n`),
      "theme.json": themeBytes,
      [theme.image]: image,
    }, { level: 6 });
    await fs.writeFile(output, archive, { mode: 0o600 });
  }

  async importPackage(file: string): Promise<Theme> {
    await this.ensure();
    const stat = await fs.stat(file);
    if (!stat.isFile() || stat.size > 64 * 1024 * 1024) {
      throw new Error("Theme package must be a file no larger than 64 MB.");
    }
    let entries: Record<string, Uint8Array>;
    try {
      let expandedTotal = 0;
      entries = unzipSync(new Uint8Array(await fs.readFile(file)), {
        filter(info) {
          if (info.name.includes("/") || info.name.includes("\\") ||
              path.basename(info.name) !== info.name) {
            throw new Error("Theme package contains an unsafe path.");
          }
          const perFileLimit = info.name.endsWith(".json")
            ? 1024 * 1024
            : 50 * 1024 * 1024;
          if (info.originalSize > perFileLimit) {
            throw new Error(
              info.name.endsWith(".json")
                ? "Theme package metadata is too large."
                : "Theme package image must be no larger than 50 MB.",
            );
          }
          expandedTotal += info.originalSize;
          if (expandedTotal > 52 * 1024 * 1024) {
            throw new Error("Theme package expands beyond the safe size limit.");
          }
          return true;
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Theme package")) {
        throw error;
      }
      throw new Error("Theme package is damaged or unsupported.");
    }
    const names = Object.keys(entries);
    if (names.some((name) =>
      name.includes("/") || name.includes("\\") || path.basename(name) !== name)) {
      throw new Error("Theme package contains an unsafe path.");
    }
    if (!entries["manifest.json"] || !entries["theme.json"] || names.length !== 3) {
      throw new Error("Theme package must contain only manifest.json, theme.json and one image.");
    }
    const manifest = JSON.parse(strFromU8(entries["manifest.json"]));
    if (manifest.schemaVersion !== 1 || manifest.packageType !== "codex-dream-skin-theme") {
      throw new Error("Theme package manifest is invalid.");
    }
    const imported = migrateTheme(JSON.parse(strFromU8(entries["theme.json"])));
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(
      path.extname(imported.image).toLowerCase(),
    )) {
      throw new Error("Theme package must contain a supported image, not code or CSS.");
    }
    if (!entries[imported.image]) throw new Error("Theme package image is missing.");
    const hash = (value: Uint8Array) =>
      crypto.createHash("sha256").update(value).digest("hex");
    for (const name of ["theme.json", imported.image]) {
      if (manifest.files?.[name] !== hash(entries[name])) {
        throw new Error(`Theme package hash mismatch: ${name}`);
      }
    }
    const id = `theme-${crypto.randomUUID()}`;
    const theme = ThemeSchema.parse({ ...imported, id });
    const destination = path.join(this.themesRoot, id);
    await fs.mkdir(destination, { recursive: true, mode: 0o700 });
    await fs.writeFile(path.join(destination, theme.image), entries[theme.image], { mode: 0o600 });
    await atomicJson(path.join(destination, "theme.json"), theme);
    return theme;
  }
}
