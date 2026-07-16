import type { CSSProperties } from "react";
import type { Theme } from "../../shared/schemas";

export function ThemePreview({
  theme,
  imageUrl,
  settings,
}: {
  theme?: Theme | null;
  imageUrl?: string | null;
  settings?: Theme["imageSettings"];
}) {
  const imageSettings = settings ?? theme?.imageSettings ?? {
    focalX: 0.72,
    focalY: 0.5,
    brightness: 1,
    overlayOpacity: 0.38,
  };
  const colors = theme?.colors ?? {
    accent: "#5865d8",
    secondary: "#36d7e8",
    highlight: "#642a8c",
  };
  const style = {
    "--preview-accent": colors.accent,
    "--preview-secondary": colors.secondary,
    "--preview-highlight": colors.highlight,
    "--preview-overlay": imageSettings.overlayOpacity,
    backgroundImage: imageUrl
      ? `linear-gradient(90deg, rgb(4 10 17 / ${Math.min(0.92, imageSettings.overlayOpacity + 0.34)}), rgb(4 10 17 / ${imageSettings.overlayOpacity})), url("${imageUrl}")`
      : `linear-gradient(125deg, ${colors.highlight}, ${colors.accent} 52%, ${colors.secondary})`,
    backgroundPosition: `${imageSettings.focalX * 100}% ${imageSettings.focalY * 100}%`,
    filter: `brightness(${imageSettings.brightness})`,
  } as CSSProperties;
  return (
    <div className="theme-preview" style={style} aria-label="Codex 主题模拟预览">
      <div className="preview-sidebar">
        <i /><i /><i /><i />
      </div>
      <div className="preview-main">
        <span className="preview-kicker">{theme?.brandSubtitle ?? "CODEX DREAM SKIN"}</span>
        <strong>{theme?.name ?? "你的主题"}</strong>
        <p>{theme?.tagline ?? "把喜欢的画面变成可交互的 Codex 工作台。"}</p>
        <div className="preview-composer">输入消息… <span>↗</span></div>
      </div>
    </div>
  );
}
