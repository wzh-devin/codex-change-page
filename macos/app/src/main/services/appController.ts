import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import type {
  ImageSelection,
  SystemSnapshot,
  ThemeCreateInput,
} from "../../shared/api";
import {
  EngineRequestSchema,
  ThemeSchema,
  type EngineRequest,
  type EngineResult,
  type Theme,
} from "../../shared/schemas";
import { EngineInstaller } from "./engineInstaller";
import { EngineService } from "./engineService";
import { OperationJournal } from "./journal";
import { OperationQueue } from "./operationQueue";
import { SettingsStore } from "./settingsStore";
import { spawnRunner } from "./spawnRunner";
import { doctorFields } from "./systemInspection";
import { ThemeStore } from "./themeStore";

type ProgressListener = (result: EngineResult) => void;

export class AppController {
  readonly installer: EngineInstaller;
  readonly themes: ThemeStore;
  readonly settings: SettingsStore;
  readonly journal: OperationJournal;
  readonly queue = new OperationQueue();
  private progressListeners = new Set<ProgressListener>();
  private doctorCache: { expiresAt: number; data: ReturnType<typeof doctorFields> } | null = null;
  private readonly restoreReceiptPath: string;

  constructor(readonly paths: {
    bundledEngineRoot: string;
    installedEngineRoot: string;
    stateRoot: string;
    appDataRoot: string;
  }) {
    this.installer = new EngineInstaller(paths.bundledEngineRoot, paths.installedEngineRoot);
    this.themes = new ThemeStore(paths.stateRoot);
    this.settings = new SettingsStore(path.join(paths.appDataRoot, "settings.json"));
    this.journal = new OperationJournal(path.join(paths.appDataRoot, "operation-journal.json"));
    this.restoreReceiptPath = path.join(paths.appDataRoot, "restore-receipt.json");
  }

  onProgress(listener: ProgressListener) {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  private emit(result: EngineResult) {
    for (const listener of this.progressListeners) listener(result);
  }

  private engine() {
    return new EngineService(this.paths.installedEngineRoot, spawnRunner);
  }

  async runEngine(input: EngineRequest) {
    let request = EngineRequestSchema.parse(input);
    if (request.command === "verify" && !request.options.screenshot) {
      request = EngineRequestSchema.parse({
        ...request,
        options: {
          ...request.options,
          screenshot: path.join(this.paths.stateRoot, "verification.png"),
        },
      });
    }
    const operationId = crypto.randomUUID();
    return this.queue.run(request.command, async () => {
      await this.journal.start(operationId, request.command);
      try {
        if (request.command === "install") {
          await fs.rm(this.restoreReceiptPath, { force: true });
          await this.installer.install();
          const existingThemes = await this.themes.list();
          if (existingThemes.length === 0) {
            const demo = await this.themes.createFromImage({
              sourceImage: path.join(this.paths.bundledEngineRoot, "assets", "portal-hero.png"),
              name: "Portal Demo",
              colors: {
                accent: "#7cff46",
                secondary: "#36d7e8",
                highlight: "#642a8c",
              },
            });
            await this.themes.select(demo.id);
          } else if (!await this.themes.active()) {
            await this.themes.select(existingThemes[0].id);
          }
        }
        const result = await this.engine().run(request, (event) => this.emit(event), operationId);
        if (request.command === "install") {
          await this.engine().run(
            { command: "migrate", options: {} },
            (event) => this.emit(event),
            operationId,
          );
        }
        if (request.command === "uninstall") {
          await fs.mkdir(this.paths.appDataRoot, { recursive: true, mode: 0o700 });
          const temporary = `${this.restoreReceiptPath}.${process.pid}.tmp`;
          await fs.writeFile(temporary, `${JSON.stringify({
            schemaVersion: 1,
            restored: true,
            operationId,
            completedAt: new Date().toISOString(),
          }, null, 2)}\n`, { mode: 0o600 });
          await fs.rename(temporary, this.restoreReceiptPath);
          await fs.rm(this.paths.installedEngineRoot, { recursive: true, force: true });
          await fs.rm(path.join(this.paths.stateRoot, "menubar"), { recursive: true, force: true });
        }
        await this.journal.complete(operationId, true);
        return result;
      } catch (error) {
        await this.journal.complete(operationId, false).catch(() => {});
        throw error;
      }
    });
  }

  async inspect(): Promise<SystemSnapshot> {
    let engine = {
      installed: false,
      current: false,
      bundledVersion: null as string | null,
      installedVersion: null as string | null,
    };
    try {
      engine = await this.installer.inspect();
    } catch {}
    let status: Record<string, unknown> = {};
    let doctor = this.doctorCache?.expiresAt && this.doctorCache.expiresAt > Date.now()
      ? this.doctorCache.data
      : null;
    if (!doctor) {
      try {
        const result = await new EngineService(this.paths.bundledEngineRoot, spawnRunner)
          .run({ command: "inspect", options: {} });
        doctor = doctorFields(result.data);
      } catch {
        doctor = doctorFields(null);
      }
      this.doctorCache = { expiresAt: Date.now() + 60_000, data: doctor };
    }
    if (engine.installed) {
      try {
        const result = await this.engine().run({ command: "status", options: {} });
        status = (result.data && typeof result.data === "object"
          ? result.data
          : {}) as Record<string, unknown>;
      } catch {}
    }
    const interrupted = await this.journal.interrupted();
    const session = typeof status.session === "string" ? status.session : "off";
    return {
      platform: process.platform,
      architecture: process.arch,
      supported: process.platform === "darwin" && process.arch === "arm64",
      ...doctor,
      engine,
      session: ["active", "paused", "off", "stale", "unknown"].includes(session)
        ? session as SystemSnapshot["session"]
        : "unknown",
      codexRunning: status.codexRunning === true,
      cdpReady: status.cdpOk === true,
      port: typeof status.port === "number" ? status.port : 9341,
      activeTheme: await this.themes.active(),
      interruptedOperation: interrupted
        ? { operationId: interrupted.operationId, command: interrupted.command }
        : null,
    };
  }

  async imageSelection(file: string): Promise<ImageSelection> {
    const stat = await fs.stat(file);
    if (!stat.isFile() || stat.size > 50 * 1024 * 1024) throw new Error("Image is too large.");
    const extension = path.extname(file).toLowerCase();
    const mime = extension === ".jpg" || extension === ".jpeg"
      ? "image/jpeg"
      : extension === ".webp" ? "image/webp" : "image/png";
    return {
      path: file,
      name: path.basename(file),
      dataUrl: `data:${mime};base64,${(await fs.readFile(file)).toString("base64")}`,
    };
  }

  async createTheme(input: ThemeCreateInput) {
    const created = await this.themes.createFromImage(input);
    const patch = Object.fromEntries(Object.entries({
      imageSettings: input.imageSettings,
      tagline: input.tagline,
      quote: input.quote,
    }).filter(([, value]) => value !== undefined));
    return Object.keys(patch).length ? this.themes.update(created.id, patch) : created;
  }

  async updateTheme(id: string, patch: Partial<Theme>) {
    const safePatch = ThemeSchema.partial().omit({
      schemaVersion: true,
      id: true,
      image: true,
    }).parse(patch);
    return this.themes.update(id, safePatch);
  }

  async clearData() {
    const engine = await this.installer.inspect().catch(() => ({ installed: false }));
    if (engine.installed) throw new Error("Uninstall the theme engine before clearing all data.");
    let receipt: { restored?: boolean } | null = null;
    try {
      receipt = JSON.parse(await fs.readFile(this.restoreReceiptPath, "utf8"));
    } catch {}
    if (receipt?.restored !== true) {
      throw new Error("Restore official Codex and uninstall the theme engine before clearing all data.");
    }
    await fs.rm(this.paths.stateRoot, { recursive: true, force: true });
    await fs.rm(this.paths.appDataRoot, { recursive: true, force: true });
  }
}
