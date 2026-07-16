#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

import { normalizeTheme } from "./theme-schema.mjs";

const home = process.env.HOME;
if (!home) throw new Error("HOME is required to migrate Codex Dream Skin state.");

const stateRoot = path.join(
  home,
  "Library",
  "Application Support",
  "CodexDreamSkinStudio",
);

async function atomicJson(file, value) {
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(temporary, file);
}

async function themeFiles() {
  const files = [path.join(stateRoot, "theme", "theme.json")];
  const themesRoot = path.join(stateRoot, "themes");
  try {
    for (const entry of await fs.readdir(themesRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) files.push(path.join(themesRoot, entry.name, "theme.json"));
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return files;
}

let migrated = 0;
let unchanged = 0;
for (const file of await themeFiles()) {
  let raw;
  try {
    raw = JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") continue;
    throw error;
  }
  const normalized = normalizeTheme(raw);
  const image = path.join(path.dirname(file), normalized.image);
  const stat = await fs.stat(image);
  if (!stat.isFile() || stat.size < 1 || stat.size > 50 * 1024 * 1024) {
    throw new Error(`Theme image is missing or unsafe: ${image}`);
  }
  if (raw.schemaVersion === 2 &&
      JSON.stringify(raw) === JSON.stringify(normalized)) {
    unchanged += 1;
    continue;
  }
  await atomicJson(file, normalized);
  migrated += 1;
}

process.stdout.write(`${JSON.stringify({ migrated, unchanged })}\n`);
