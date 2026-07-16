import { useEffect, useMemo, useState } from "react";

import type { ImageSelection } from "../../shared/api";
import type { Theme } from "../../shared/schemas";
import { useApp } from "../AppContext";
import { paletteFromImage } from "../color";
import { ThemePreview } from "../components/ThemePreview";

const defaults = {
  name: "我的 Codex 主题",
  tagline: "把喜欢的画面变成可交互的 Codex 工作台。",
  quote: "MAKE SOMETHING WONDERFUL",
  accent: "#5865d8",
  secondary: "#36d7e8",
  highlight: "#642a8c",
  focalX: 0.72,
  focalY: 0.5,
  brightness: 1,
  overlayOpacity: 0.38,
};

export function EditorPage() {
  const { snapshot, chooseImage, createTheme, updateTheme, selectTheme } = useApp();
  const active = snapshot?.activeTheme;
  const [image, setImage] = useState<ImageSelection | null>(null);
  const [draft, setDraft] = useState(defaults);

  useEffect(() => {
    if (!active) return;
    setDraft({
      name: active.name,
      tagline: active.tagline,
      quote: active.quote,
      accent: active.colors.accent,
      secondary: active.colors.secondary,
      highlight: active.colors.highlight,
      ...active.imageSettings,
    });
  }, [active]);

  const previewTheme = useMemo(() => active ? ({
    ...active,
    name: draft.name,
    tagline: draft.tagline,
    quote: draft.quote,
    imageSettings: {
      focalX: draft.focalX,
      focalY: draft.focalY,
      brightness: draft.brightness,
      overlayOpacity: draft.overlayOpacity,
    },
    colors: {
      ...active.colors,
      accent: draft.accent,
      accentAlt: draft.accent,
      secondary: draft.secondary,
      highlight: draft.highlight,
    },
  } satisfies Theme) : null, [active, draft]);

  const choose = async () => {
    const selected = await chooseImage();
    if (!selected) return;
    setImage(selected);
    try {
      const colors = await paletteFromImage(selected.dataUrl);
      setDraft((current) => ({ ...current, ...colors }));
    } catch {}
  };

  const save = async () => {
    const imageSettings = {
      focalX: draft.focalX,
      focalY: draft.focalY,
      brightness: draft.brightness,
      overlayOpacity: draft.overlayOpacity,
    };
    if (image) {
      const theme = await createTheme({
        sourceImage: image.path,
        name: draft.name,
        tagline: draft.tagline,
        quote: draft.quote,
        colors: {
          accent: draft.accent,
          secondary: draft.secondary,
          highlight: draft.highlight,
        },
        imageSettings,
      });
      await selectTheme(theme.id);
      setImage(null);
      return;
    }
    if (active) {
      await updateTheme(active.id, {
        name: draft.name,
        tagline: draft.tagline,
        quote: draft.quote,
        imageSettings,
        colors: {
          ...active.colors,
          accent: draft.accent,
          accentAlt: draft.accent,
          secondary: draft.secondary,
          highlight: draft.highlight,
        },
      });
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div><h1>主题编辑</h1><p>调整图片焦点、可读性和主题配色。</p></div>
        <button className="primary" onClick={() => void save()} disabled={!active && !image}>保存主题</button>
      </header>
      <div className="editor-layout">
        <section className="editor-preview">
          <ThemePreview theme={previewTheme ?? active} imageUrl={image?.dataUrl} settings={{
            focalX: draft.focalX,
            focalY: draft.focalY,
            brightness: draft.brightness,
            overlayOpacity: draft.overlayOpacity,
          }} />
          <button className="secondary full" onClick={() => void choose()}>选择或更换图片…</button>
          <p className="helper">选择图片后会在本机 Canvas 中推荐配色，不上传图片。</p>
        </section>
        <section className="editor-controls">
          <Field label="主题名称"><input value={draft.name} maxLength={80} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
          <Field label="主题文案"><input value={draft.tagline} maxLength={160} onChange={(event) => setDraft({ ...draft, tagline: event.target.value })} /></Field>
          <div className="color-fields">
            <ColorField label="主色" value={draft.accent} onChange={(accent) => setDraft({ ...draft, accent })} />
            <ColorField label="辅色" value={draft.secondary} onChange={(secondary) => setDraft({ ...draft, secondary })} />
            <ColorField label="高亮" value={draft.highlight} onChange={(highlight) => setDraft({ ...draft, highlight })} />
          </div>
          <Range label="水平焦点" value={draft.focalX} min={0} max={1} step={0.01} onChange={(focalX) => setDraft({ ...draft, focalX })} />
          <Range label="垂直焦点" value={draft.focalY} min={0} max={1} step={0.01} onChange={(focalY) => setDraft({ ...draft, focalY })} />
          <Range label="亮度" value={draft.brightness} min={0.6} max={1.4} step={0.01} onChange={(brightness) => setDraft({ ...draft, brightness })} />
          <Range label="遮罩强度" value={draft.overlayOpacity} min={0} max={0.75} step={0.01} onChange={(overlayOpacity) => setDraft({ ...draft, overlayOpacity })} />
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: React.PropsWithChildren<{ label: string }>) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
function ColorField({ label, value, onChange }: { label: string; value: string; onChange(value: string): void }) {
  return <label className="color-field"><span>{label}</span><span><input type="color" value={value} onChange={(event) => onChange(event.target.value)} /><code>{value}</code></span></label>;
}
function Range({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange(value: number): void;
}) {
  return <label className="range-field"><span>{label}<output>{value.toFixed(2)}</output></span><input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
