import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { strToU8, zipSync } from "fflate";
import { afterEach, describe, expect, it } from "vitest";

import { ThemeStore } from "./themeStore";

const created: string[] = [];

async function tempRoot() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-theme-store-"));
  created.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(created.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe("ThemeStore", () => {
  it("creates, lists and selects a safe v2 theme", async () => {
    const root = await tempRoot();
    const image = path.join(root, "source.png");
    await fs.writeFile(image, Buffer.from("png"));
    const store = new ThemeStore(path.join(root, "state"));

    const saved = await store.createFromImage({
      sourceImage: image,
      name: "My Theme",
      colors: { accent: "#5865d8", secondary: "#36d7e8", highlight: "#642a8c" },
    });
    expect(saved.schemaVersion).toBe(2);
    expect((await store.list()).map((theme) => theme.id)).toContain(saved.id);
    await store.select(saved.id);
    expect((await store.active())?.id).toBe(saved.id);
  });

  it("refuses to delete the active theme", async () => {
    const root = await tempRoot();
    const image = path.join(root, "source.png");
    await fs.writeFile(image, Buffer.from("png"));
    const store = new ThemeStore(path.join(root, "state"));
    const saved = await store.createFromImage({
      sourceImage: image,
      name: "Active",
      colors: { accent: "#5865d8", secondary: "#36d7e8", highlight: "#642a8c" },
    });
    await store.select(saved.id);
    await expect(store.remove(saved.id)).rejects.toThrow(/active theme/i);
  });

  it("updates and duplicates an existing theme", async () => {
    const root = await tempRoot();
    const image = path.join(root, "source.png");
    await fs.writeFile(image, Buffer.from("png"));
    const store = new ThemeStore(path.join(root, "state"));
    const saved = await store.createFromImage({
      sourceImage: image,
      name: "Original",
      colors: { accent: "#5865d8", secondary: "#36d7e8", highlight: "#642a8c" },
    });
    const updated = await store.update(saved.id, {
      name: "Updated",
      imageSettings: { ...saved.imageSettings, focalX: 0.25 },
    });
    const duplicate = await store.duplicate(saved.id);
    expect(updated.name).toBe("Updated");
    expect(updated.imageSettings.focalX).toBe(0.25);
    expect(duplicate.id).not.toBe(saved.id);
    expect(duplicate.name).toContain("副本");
  });

  it("exports and imports a code-only-free codexskin package", async () => {
    const root = await tempRoot();
    const image = path.join(root, "source.png");
    const output = path.join(root, "theme.codexskin");
    await fs.writeFile(image, Buffer.from("png"));
    const source = new ThemeStore(path.join(root, "source-state"));
    const destination = new ThemeStore(path.join(root, "destination-state"));
    const saved = await source.createFromImage({
      sourceImage: image,
      name: "Portable",
      colors: { accent: "#5865d8", secondary: "#36d7e8", highlight: "#642a8c" },
    });
    await source.exportPackage(saved.id, output);
    const imported = await destination.importPackage(output);
    expect(imported.name).toBe("Portable");
    expect((await destination.list())).toHaveLength(1);
  });

  it("rejects theme packages containing path traversal", async () => {
    const root = await tempRoot();
    const archive = path.join(root, "evil.codexskin");
    await fs.writeFile(archive, zipSync({ "../evil.js": strToU8("alert(1)") }));
    const store = new ThemeStore(path.join(root, "state"));
    await expect(store.importPackage(archive)).rejects.toThrow(/unsafe|package/i);
  });

  it("rejects a package whose declared image expands beyond 50 MB", async () => {
    const root = await tempRoot();
    const archive = path.join(root, "oversized.codexskin");
    await fs.writeFile(archive, zipSync({
      "manifest.json": strToU8("{}"),
      "theme.json": strToU8("{}"),
      "background.png": new Uint8Array(50 * 1024 * 1024 + 1),
    }, { level: 9 }));
    const store = new ThemeStore(path.join(root, "state"));
    await expect(store.importPackage(archive)).rejects.toThrow(/50 MB|large/i);
  });

  it("rejects executable or stylesheet entries even when the manifest is valid", async () => {
    const root = await tempRoot();
    const archive = path.join(root, "script.codexskin");
    const themeBytes = strToU8(JSON.stringify({
      schemaVersion: 2,
      id: "unsafe-theme",
      name: "Unsafe",
      image: "payload.js",
      imageSettings: {
        focalX: 0.5,
        focalY: 0.5,
        brightness: 1,
        overlayOpacity: 0.3,
      },
      brandSubtitle: "CODEX DREAM SKIN",
      tagline: "Unsafe package",
      projectPrefix: "",
      projectLabel: "",
      statusText: "",
      quote: "",
      colors: {
        background: "#071116",
        panel: "#0b1a20",
        panelAlt: "#10272c",
        accent: "#5865d8",
        accentAlt: "#5865d8",
        secondary: "#36d7e8",
        highlight: "#642a8c",
        text: "#e9fff1",
        muted: "#9ebdb3",
        line: "#5865d8",
      },
    }));
    const payload = strToU8("alert(1)");
    const hash = (value: Uint8Array) =>
      crypto.createHash("sha256").update(value).digest("hex");
    const manifest = strToU8(JSON.stringify({
      schemaVersion: 1,
      packageType: "codex-dream-skin-theme",
      files: {
        "theme.json": hash(themeBytes),
        "payload.js": hash(payload),
      },
    }));
    await fs.writeFile(archive, zipSync({
      "manifest.json": manifest,
      "theme.json": themeBytes,
      "payload.js": payload,
    }));
    const store = new ThemeStore(path.join(root, "state"));
    await expect(store.importPackage(archive)).rejects.toThrow(/image|unsupported|script/i);
  });
});
