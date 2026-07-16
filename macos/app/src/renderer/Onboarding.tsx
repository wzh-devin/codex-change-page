import { useMemo, useState } from "react";

import { useApp } from "./AppContext";
import { ThemePreview } from "./components/ThemePreview";
import { nextOnboardingStep, type OnboardingStep } from "./model";

const steps: Array<{ id: OnboardingStep; label: string }> = [
  { id: "inspect", label: "环境检测" },
  { id: "backup", label: "安装与备份" },
  { id: "theme", label: "选择主题" },
  { id: "apply", label: "应用皮肤" },
];

export function Onboarding() {
  const {
    snapshot, themes, busy, refresh, runEngine, chooseImage, createTheme, selectTheme, updateSettings,
  } = useApp();
  const [step, setStep] = useState<OnboardingStep>("inspect");
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const activeTheme = snapshot?.activeTheme ?? themes[0] ?? null;
  const state = useMemo(() => ({
    compatible: Boolean(
      snapshot?.supported && snapshot.codexAvailable &&
      snapshot.signatureValid && snapshot.nodeValid,
    ),
    backupReady: Boolean(snapshot?.engine.installed),
    themeReady: Boolean(activeTheme),
  }), [snapshot, activeTheme]);

  const advance = () => setStep((current) => nextOnboardingStep(current, state));

  return (
    <main className="onboarding">
      <header>
        <span className="onboarding-mark">◉</span>
        <div>
          <h1>欢迎使用 Codex 换肤助手</h1>
          <p>四步完成检测、备份、选图和应用。整个过程不会修改官方 Codex 安装包。</p>
        </div>
      </header>
      <ol className="stepper">
        {steps.map((item, index) => (
          <li key={item.id} className={item.id === step ? "current" : ""}>
            <span>{index + 1}</span>{item.label}
          </li>
        ))}
      </ol>
      <section className="onboarding-panel">
        {step === "inspect" && (
          <>
            <h2>检测运行环境</h2>
            <div className="check-list">
              <Check
                label="macOS 13 或更高版本"
                pass={snapshot ? snapshot.platform === "darwin" : undefined}
              />
              <Check
                label="Apple Silicon arm64"
                pass={snapshot ? snapshot.architecture === "arm64" : undefined}
              />
              <Check
                label={snapshot?.codexVersion
                  ? `官方 Codex ${snapshot.codexVersion} 与签名有效`
                  : "官方 Codex 与签名有效"}
                pass={snapshot
                  ? snapshot.codexAvailable && snapshot.signatureValid
                  : undefined}
              />
              <Check
                label={snapshot?.nodeVersion
                  ? `官方签名 Node ${snapshot.nodeVersion}`
                  : "官方签名 Node 运行时"}
                pass={snapshot ? snapshot.nodeValid : undefined}
              />
              <Check label="用户目录可用于可逆安装" pass />
            </div>
            <div className="actions">
              <button className="secondary" onClick={() => void refresh()}>重新检测</button>
              <button className="primary" disabled={!state.compatible} onClick={advance}>继续</button>
            </div>
          </>
        )}
        {step === "backup" && (
          <>
            <h2>安装主题引擎并创建备份</h2>
            <p className="prose">引擎安装在 <code>~/.codex/codex-dream-skin-studio</code>，只备份 Codex 的外观字段。恢复时会精确还原，不改 API Key、模型或对话数据。</p>
            <div className="actions">
              {!snapshot?.engine.installed
                ? <button className="primary" disabled={busy} onClick={() => void runEngine({ command: "install", options: {} })}>安装并备份</button>
                : <button className="primary" onClick={advance}>备份已就绪，继续</button>}
            </div>
          </>
        )}
        {step === "theme" && (
          <div className="onboarding-theme">
            <ThemePreview theme={activeTheme} imageUrl={preview} />
            <div>
              <h2>选择第一套主题</h2>
              <p>可以直接使用内置 Portal Demo，也可以选择自己的横向图片。</p>
              <button className="secondary" onClick={async () => {
                const image = await chooseImage();
                if (image) { setPreview(image.dataUrl); setSelectedPath(image.path); }
              }}>选择图片…</button>
              {selectedPath && (
                <button className="secondary" onClick={async () => {
                  const theme = await createTheme({
                    sourceImage: selectedPath,
                    name: "我的 Codex 主题",
                    colors: { accent: "#5865d8", secondary: "#36d7e8", highlight: "#642a8c" },
                  });
                  await selectTheme(theme.id);
                  advance();
                }}>保存并使用这张图片</button>
              )}
              {!selectedPath && activeTheme && (
                <button className="primary" onClick={advance}>使用 {activeTheme.name}</button>
              )}
            </div>
          </div>
        )}
        {step === "apply" && (
          <>
            <h2>准备应用皮肤</h2>
            <ThemePreview theme={activeTheme} imageUrl={preview} />
            <p className="prose">如果 Codex 已经以普通模式运行，系统会明确询问是否重启。主题运行期间 CDP 仅绑定本机回环地址。</p>
            <div className="actions">
              <button className="primary" disabled={busy} onClick={async () => {
                await runEngine({ command: "apply", options: {} });
                await updateSettings({ onboardingComplete: true });
              }}>应用并进入管理器</button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Check({ label, pass }: { label: string; pass?: boolean }) {
  const state = pass === undefined ? "pending" : pass ? "pass" : "fail";
  const symbol = pass === undefined ? "…" : pass ? "✓" : "!";
  return <div className={`check ${state}`}><span>{symbol}</span>{label}</div>;
}
