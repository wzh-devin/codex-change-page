import { useApp } from "../AppContext";
import { StatusBadge } from "../components/StatusBadge";
import { ThemePreview } from "../components/ThemePreview";

export function OverviewPage({ onOpenThemes }: { onOpenThemes(): void }) {
  const { snapshot, busy, runEngine, refresh } = useApp();
  const status = snapshot?.session === "active"
    ? "active" : snapshot?.session === "paused" ? "paused" : "off";
  return (
    <div className="page">
      <header className="page-header">
        <div><h1>概览</h1><p>管理当前主题和 Codex 连接状态。</p></div>
        <StatusBadge status={status} />
      </header>
      <ThemePreview theme={snapshot?.activeTheme} />
      <div className="primary-actions">
        <button className="primary" disabled={busy || !snapshot?.engine.installed} onClick={() =>
          void runEngine({ command: "apply", options: {} })}>应用当前主题</button>
        <button className="secondary" disabled={busy || snapshot?.session !== "active"} onClick={() =>
          void runEngine({ command: "pause", options: {} })}>暂停皮肤</button>
        <button className="secondary" disabled={busy || !snapshot?.engine.installed} onClick={() =>
          void runEngine({ command: "verify", options: { reload: true } })}>验证</button>
        <button className="ghost" onClick={onOpenThemes}>更换主题</button>
      </div>
      <section className="status-grid">
        <StatusPanel
          title="官方 Codex"
          value={snapshot?.codexAvailable ? `v${snapshot.codexVersion}` : "未通过检测"}
          detail={snapshot?.codexRunning ? "官方应用正在运行" : "官方应用当前未打开"}
          good={snapshot?.codexAvailable && snapshot.signatureValid}
        />
        <StatusPanel title="主题引擎" value={snapshot?.engine.installed ? `v${snapshot.engine.installedVersion}` : "未安装"} detail={snapshot?.engine.current ? "已是当前版本" : "需要安装或升级"} good={snapshot?.engine.current} />
        <StatusPanel title="本机 CDP" value={snapshot?.cdpReady ? `127.0.0.1:${snapshot.port}` : "未连接"} detail="完整恢复后端口会关闭" good={snapshot?.cdpReady} />
        <StatusPanel title="当前主题" value={snapshot?.activeTheme?.name ?? "未选择"} detail="主题文件与官方应用分离" good={Boolean(snapshot?.activeTheme)} />
      </section>
      <button className="link-button" onClick={() => void refresh()}>刷新全部状态</button>
    </div>
  );
}

function StatusPanel({ title, value, detail, good }: {
  title: string; value: string; detail: string; good?: boolean;
}) {
  return (
    <article className="status-panel">
      <span className={good ? "status-dot good" : "status-dot"} aria-hidden="true" />
      <div><small>{title}</small><strong>{value}</strong><p>{detail}</p></div>
    </article>
  );
}
