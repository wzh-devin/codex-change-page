export type PageId =
  | "overview"
  | "themes"
  | "editor"
  | "diagnostics"
  | "restore"
  | "settings"
  | "about";

export const NAVIGATION_ITEMS: Array<{ id: PageId; label: string; icon: string }> = [
  { id: "overview", label: "概览", icon: "⌂" },
  { id: "themes", label: "主题库", icon: "◇" },
  { id: "editor", label: "主题编辑", icon: "◉" },
  { id: "diagnostics", label: "诊断中心", icon: "✓" },
  { id: "restore", label: "恢复与卸载", icon: "↩" },
  { id: "settings", label: "设置", icon: "⚙" },
  { id: "about", label: "关于", icon: "ⓘ" },
];

export type OnboardingStep = "inspect" | "backup" | "theme" | "apply";

export function nextOnboardingStep(
  current: OnboardingStep,
  state: { compatible: boolean; backupReady: boolean; themeReady: boolean },
): OnboardingStep {
  if (current === "inspect") return state.compatible ? "backup" : "inspect";
  if (current === "backup") return state.backupReady ? "theme" : "backup";
  if (current === "theme") return state.themeReady ? "apply" : "theme";
  return "apply";
}

export function statusPresentation(status: "active" | "paused" | "off" | "error") {
  const values = {
    active: { label: "皮肤运行中", symbol: "●", tone: "success" },
    paused: { label: "皮肤已暂停", symbol: "Ⅱ", tone: "warning" },
    off: { label: "尚未应用", symbol: "○", tone: "muted" },
    error: { label: "需要处理", symbol: "!", tone: "danger" },
  } as const;
  return values[status];
}
