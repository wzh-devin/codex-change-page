import {
  app,
  BrowserWindow,
  net,
  protocol,
  session,
} from "electron";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { CHANNELS } from "../shared/channels";
import { registerIpc } from "./ipc";
import { AppController } from "./services/appController";
import { pruneLogs } from "./services/logRetention";
import { createTray } from "./tray";
import { createMainWindow } from "./window";

protocol.registerSchemesAsPrivileged([{
  scheme: "app",
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: false,
  },
}]);
app.enableSandbox();

const testRoot = process.env.CODEX_CHANGE_PAGE_TEST_ROOT;
if (testRoot) {
  app.setPath("userData", path.join(testRoot, "electron-user-data"));
}
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();

let mainWindow: BrowserWindow | null = null;
let quitting = false;

app.whenReady().then(async () => {
  const rendererRoot = path.join(app.getAppPath(), "dist", "renderer");
  protocol.handle("app", (request) => {
    const url = new URL(request.url);
    if (url.host !== "ui") return new Response("Not found", { status: 404 });
    const relative = decodeURIComponent(url.pathname.replace(/^\/+/, "")) || "index.html";
    const resolved = path.resolve(rendererRoot, relative);
    if (!resolved.startsWith(`${rendererRoot}${path.sep}`) && resolved !== path.join(rendererRoot, "index.html")) {
      return new Response("Forbidden", { status: 403 });
    }
    return net.fetch(pathToFileURL(resolved).toString());
  });
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));

  const bundledEngineRoot = app.isPackaged
    ? path.join(process.resourcesPath, "engine")
    : path.join(app.getAppPath(), ".engine");
  const controller = new AppController({
    bundledEngineRoot,
    installedEngineRoot: testRoot
      ? path.join(testRoot, "engine")
      : path.join(os.homedir(), ".codex", "codex-dream-skin-studio"),
    stateRoot: testRoot
      ? path.join(testRoot, "state")
      : path.join(os.homedir(), "Library", "Application Support", "CodexDreamSkinStudio"),
    appDataRoot: testRoot ? path.join(testRoot, "app-data") : app.getPath("userData"),
  });
  const initialSettings = await controller.settings.get();
  await pruneLogs(controller.paths.stateRoot, initialSettings.logRetentionDays);
  mainWindow = createMainWindow(path.join(app.getAppPath(), "dist", "preload", "index.cjs"));
  registerIpc(mainWindow, controller);
  const tray = await createTray(mainWindow, controller);
  controller.onProgress((result) => {
    if (!mainWindow?.isDestroyed()) mainWindow?.webContents.send(CHANNELS.progress, result);
    if (result.stage !== "started") void tray.refresh();
  });

  mainWindow.on("close", (event) => {
    if (!quitting) {
      event.preventDefault();
      void controller.settings.get().then((settings) => {
        if (settings.backgroundResident) mainWindow?.hide();
        else {
          quitting = true;
          app.quit();
        }
      });
    }
  });
  const autoReapplyTimer = setInterval(() => {
    if (controller.queue.active) return;
    void Promise.all([controller.settings.get(), controller.inspect()])
      .then(([settings, snapshot]) => {
        if (settings.autoReapply && snapshot.engine.installed &&
            snapshot.cdpReady && snapshot.session !== "active") {
          return controller.runEngine({ command: "apply", options: {} });
        }
      })
      .catch(() => {});
  }, 15_000);
  autoReapplyTimer.unref();
  app.on("second-instance", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
  app.on("activate", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
});

app.on("before-quit", () => { quitting = true; });
app.on("window-all-closed", () => {
  // The menu-bar manager intentionally remains available.
});
