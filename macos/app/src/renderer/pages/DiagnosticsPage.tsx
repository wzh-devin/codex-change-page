import { useApp } from "../AppContext";

export function DiagnosticsPage() {
  const { snapshot, busy, runEngine, refresh } = useApp();
  const checks = [
    ["平台", `${snapshot?.platform ?? "—"} / ${snapshot?.architecture ?? "—"}`, snapshot?.supported],
    ["官方 Codex", snapshot?.codexVersion ?? "未找到", snapshot?.codexAvailable],
    ["官方签名", snapshot?.signatureValid ? "验证通过" : "未通过", snapshot?.signatureValid],
    ["官方 Node", snapshot?.nodeVersion ?? "未找到", snapshot?.nodeValid],
    ["Engine", snapshot?.engine.installed ? `v${snapshot.engine.installedVersion}` : "未安装", snapshot?.engine.current],
    ["Codex 进程", snapshot?.codexRunning ? "已识别" : "未运行", snapshot?.codexRunning],
    ["CDP 端口", snapshot?.cdpReady ? `127.0.0.1:${snapshot.port}` : "未连接", snapshot?.cdpReady],
    ["活动主题", snapshot?.activeTheme?.name ?? "未选择", Boolean(snapshot?.activeTheme)],
    ["中断操作", snapshot?.interruptedOperation ? snapshot.interruptedOperation.command : "无", !snapshot?.interruptedOperation],
  ] as const;
  return (
    <div className="page">
      <header className="page-header">
        <div><h1>诊断中心</h1><p>检查签名链、运行状态和真实注入结果。</p></div>
        <button className="secondary" onClick={() => void refresh()}>刷新</button>
      </header>
      <section className="diagnostic-list">
        {checks.map(([label, value, pass]) => (
          <div className="diagnostic-row" key={label}>
            <span className={pass ? "check-icon pass" : "check-icon"}>{pass ? "✓" : "—"}</span>
            <span><strong>{label}</strong><small>{value}</small></span>
          </div>
        ))}
      </section>
      <section className="section-block">
        <h2>实机验证</h2>
        <p>重新加载 Codex renderer，检查原生侧栏、输入框、装饰层、溢出和主题版本，并将验证截图保存到日志目录。</p>
        <div className="primary-actions">
          <button className="primary" disabled={busy || !snapshot?.engine.installed} onClick={() =>
            void runEngine({ command: "verify", options: { reload: true } })}>运行完整验证</button>
          <button className="secondary" onClick={() => void window.skinAPI.logs.reveal()}>打开日志位置</button>
        </div>
      </section>
    </div>
  );
}
