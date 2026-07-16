import {
  BrowserWindow,
  dialog,
  Menu,
  nativeImage,
  Tray,
} from "electron";

import { AppController } from "./services/appController";

export async function createTray(window: BrowserWindow, controller: AppController) {
  const icon = nativeImage.createFromNamedImage("NSImageNameColorPanel");
  icon.setTemplateImage(true);
  const tray = new Tray(icon);
  tray.setToolTip("Codex 换肤助手");

  const perform = async (command: "apply" | "pause" | "verify" | "restore") => {
    try {
      await controller.runEngine({ command, options: {} });
    } catch (error) {
      await dialog.showMessageBox(window, {
        type: "error",
        title: "操作失败",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    await refresh();
  };

  const refresh = async () => {
    const [snapshot, themes] = await Promise.all([
      controller.inspect(),
      controller.themes.list(),
    ]);
    const menu = Menu.buildFromTemplate([
      {
        label: snapshot.session === "active" ? "Skin ON" : snapshot.session === "paused" ? "Skin 暂停" : "Skin 关",
        enabled: false,
      },
      { type: "separator" },
      { label: "显示主窗口", click: () => { window.show(); window.focus(); } },
      { label: "应用当前主题", click: () => void perform("apply") },
      { label: "暂停皮肤", click: () => void perform("pause") },
      {
        label: "最近主题",
        submenu: themes.slice(0, 8).map((theme) => ({
          label: theme.name,
          type: "checkbox" as const,
          checked: snapshot.activeTheme?.id === theme.id,
          click: async () => {
            await controller.themes.select(theme.id);
            await perform("apply");
          },
        })),
      },
      { label: "验证当前状态", click: () => void perform("verify") },
      { type: "separator" },
      {
        label: "恢复官方外观…",
        click: async () => {
          const answer = await dialog.showMessageBox(window, {
            type: "warning",
            title: "恢复官方外观",
            message: "将停止皮肤、恢复外观配置，并以普通模式重启 Codex。",
            buttons: ["取消", "恢复"],
            defaultId: 0,
            cancelId: 0,
          });
          if (answer.response === 1) await perform("restore");
        },
      },
      { type: "separator" },
      { role: "quit", label: "退出换肤助手" },
    ]);
    tray.setContextMenu(menu);
  };

  tray.on("click", () => {
    if (window.isVisible()) window.hide();
    else { window.show(); window.focus(); }
  });
  await refresh();
  return { tray, refresh };
}
