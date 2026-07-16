import { useApp } from "../AppContext";

export function SettingsPage() {
  const { settings, updateSettings } = useApp();
  if (!settings) return <div className="page"><div className="skeleton large" /></div>;
  return (
    <div className="page">
      <header className="page-header"><div><h1>设置</h1><p>控制助手的驻留和日志行为。</p></div></header>
      <section className="settings-list">
        <Toggle label="登录时启动" description="登录 macOS 后在菜单栏启动换肤助手。" checked={settings.openAtLogin} onChange={(openAtLogin) => void updateSettings({ openAtLogin })} />
        <Toggle label="关闭窗口后驻留" description="关闭主窗口时继续保留菜单栏快捷操作。" checked={settings.backgroundResident} onChange={(backgroundResident) => void updateSettings({ backgroundResident })} />
        <Toggle label="自动重新应用" description="仅在已验证的皮肤 CDP 会话存在时自动重新注入；不会静默重启 Codex。" checked={settings.autoReapply} onChange={(autoReapply) => void updateSettings({ autoReapply })} />
        <label className="setting-row">
          <span><strong>日志保留</strong><small>诊断日志的最长保留天数。</small></span>
          <select value={settings.logRetentionDays} onChange={(event) => void updateSettings({ logRetentionDays: Number(event.target.value) })}>
            <option value={7}>7 天</option>
            <option value={14}>14 天</option>
            <option value={30}>30 天</option>
            <option value={90}>90 天</option>
          </select>
        </label>
      </section>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange(value: boolean): void;
}) {
  return (
    <label className="setting-row">
      <span><strong>{label}</strong><small>{description}</small></span>
      <input className="switch" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
