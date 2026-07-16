import { BrowserWindow } from "electron";
import path from "node:path";

export function createMainWindow(preload: string) {
  const window = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: "Codex 换肤助手",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 17 },
    backgroundColor: "#f4f5f7",
    webPreferences: {
      preload: path.resolve(preload),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      webSecurity: true,
      devTools: !process.env.CI,
    },
  });
  window.setMenuBarVisibility(false);
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("app://ui/")) event.preventDefault();
  });
  window.once("ready-to-show", () => window.show());
  void window.loadURL("app://ui/index.html");
  return window;
}
