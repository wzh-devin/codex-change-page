import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";

import type { ThemeCreateInput } from "../shared/api";
import { CHANNELS } from "../shared/channels";
import { EngineRequestSchema, ThemeSchema } from "../shared/schemas";
import { AppController } from "./services/appController";
import { pruneLogs } from "./services/logRetention";
import { SettingsSchema } from "./services/settingsStore";

const SPONSOR_URL = "https://passion8.cc/register?aff=TuPe";

function assertSender(window: BrowserWindow, event: Electron.IpcMainInvokeEvent) {
  if (event.sender !== window.webContents || !event.senderFrame?.url.startsWith("app://ui/")) {
    throw new Error("Rejected IPC request from an untrusted renderer.");
  }
}

export function registerIpc(window: BrowserWindow, controller: AppController) {
  const handle = <T extends unknown[]>(
    channel: string,
    listener: (event: Electron.IpcMainInvokeEvent, ...args: T) => unknown,
  ) => {
    ipcMain.handle(channel, (event, ...args) => {
      assertSender(window, event);
      return listener(event, ...args as T);
    });
  };

  handle(CHANNELS.inspect, () => controller.inspect());
  handle(CHANNELS.engineRun, (_event, request) =>
    controller.runEngine(EngineRequestSchema.parse(request)));
  handle(CHANNELS.engineClearData, () => controller.clearData());

  handle(CHANNELS.themesList, () => controller.themes.list());
  handle(CHANNELS.themesActive, () => controller.themes.active());
  handle(CHANNELS.themesChooseImage, async () => {
    const result = await dialog.showOpenDialog(window, {
      title: "选择主题图片",
      properties: ["openFile"],
      filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg", "webp"] }],
    });
    return result.canceled ? null : controller.imageSelection(result.filePaths[0]);
  });
  handle(CHANNELS.themesCreate, (_event, input: ThemeCreateInput) => {
    if (!input || typeof input.sourceImage !== "string" || typeof input.name !== "string") {
      throw new Error("Invalid theme creation request.");
    }
    return controller.createTheme(input);
  });
  handle(CHANNELS.themesUpdate, (_event, id: string, patch: unknown) =>
    controller.updateTheme(id, ThemeSchema.partial().parse(patch)));
  handle(CHANNELS.themesDuplicate, (_event, id: string) => controller.themes.duplicate(id));
  handle(CHANNELS.themesSelect, (_event, id: string) => controller.themes.select(id));
  handle(CHANNELS.themesRemove, (_event, id: string) => controller.themes.remove(id));
  handle(CHANNELS.themesImport, async () => {
    const result = await dialog.showOpenDialog(window, {
      title: "导入 Codex 主题",
      properties: ["openFile"],
      filters: [{ name: "Codex Skin", extensions: ["codexskin"] }],
    });
    return result.canceled ? null : controller.themes.importPackage(result.filePaths[0]);
  });
  handle(CHANNELS.themesExport, async (_event, id: string) => {
    const theme = (await controller.themes.list()).find((item) => item.id === id);
    if (!theme) throw new Error("Theme not found.");
    const result = await dialog.showSaveDialog(window, {
      title: "导出 Codex 主题",
      defaultPath: `${theme.name.replace(/[/:]/g, "-")}.codexskin`,
      filters: [{ name: "Codex Skin", extensions: ["codexskin"] }],
    });
    if (result.canceled || !result.filePath) return null;
    await controller.themes.exportPackage(id, result.filePath);
    return result.filePath;
  });

  handle(CHANNELS.settingsGet, () => controller.settings.get());
  handle(CHANNELS.settingsUpdate, async (_event, patch) => {
    const settings = await controller.settings.update(
      SettingsSchema.partial().omit({ schemaVersion: true }).parse(patch),
    );
    app.setLoginItemSettings({ openAtLogin: settings.openAtLogin, openAsHidden: true });
    await pruneLogs(controller.paths.stateRoot, settings.logRetentionDays);
    return settings;
  });
  handle(CHANNELS.logsReveal, async () => {
    const log = path.join(controller.paths.stateRoot, "injector.log");
    await shell.showItemInFolder(log);
  });
  handle(CHANNELS.systemOpenSponsor, () => shell.openExternal(SPONSOR_URL));

  return () => {
    for (const channel of Object.values(CHANNELS)) {
      if (channel !== CHANNELS.progress) ipcMain.removeHandler(channel);
    }
  };
}
