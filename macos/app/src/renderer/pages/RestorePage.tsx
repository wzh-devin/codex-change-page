import { useApp } from "../AppContext";

export function RestorePage() {
  const { snapshot, busy, runEngine, clearAllData } = useApp();
  const action = async (message: string, command: "pause" | "restore" | "uninstall") => {
    if (window.confirm(message)) await runEngine({ command, options: { preserveThemes: true } });
  };
  return (
    <div className="page">
      <header className="page-header">
        <div><h1>恢复与卸载</h1><p>按需要选择暂停、完整恢复或移除引擎。</p></div>
      </header>
      <section className="restore-list">
        <RestoreAction
          number="1"
          title="暂停皮肤"
          description="停止 injector 并移除当前 DOM/CSS。Codex 保持打开，主题和备份保留。"
          button="暂停"
          disabled={busy || snapshot?.session !== "active"}
          onClick={() => void action("暂停当前皮肤并保持 Codex 打开？", "pause")}
        />
        <RestoreAction
          number="2"
          title="恢复官方外观"
          description="恢复外观备份，关闭带 CDP 的 Codex，并以普通模式重新启动。"
          button="完整恢复"
          disabled={busy || !snapshot?.engine.installed}
          onClick={() => void action("确定恢复官方外观并重启 Codex？", "restore")}
        />
        <RestoreAction
          number="3"
          title="卸载主题引擎"
          description="先完成官方恢复，再删除 Engine 和旧启动入口。默认保留主题库。"
          button="卸载引擎"
          danger
          disabled={busy || !snapshot?.engine.installed}
          onClick={() => void action("确定恢复 Codex 并卸载主题引擎？自定义主题将被保留。", "uninstall")}
        />
        <RestoreAction
          number="4"
          title="清除全部数据"
          description="删除主题、图片、日志、状态和备份。必须先卸载主题引擎。"
          button="清除全部"
          danger
          disabled={busy || Boolean(snapshot?.engine.installed)}
          onClick={() => {
            if (window.confirm("此操作不可撤销。确定删除全部换肤数据？")) {
              void clearAllData();
            }
          }}
        />
      </section>
    </div>
  );
}

function RestoreAction({ number, title, description, button, danger, disabled, onClick }: {
  number: string; title: string; description: string; button: string;
  danger?: boolean; disabled?: boolean; onClick(): void;
}) {
  return (
    <article className="restore-row">
      <span className="restore-number">{number}</span>
      <div><strong>{title}</strong><p>{description}</p></div>
      <button className={danger ? "danger" : "secondary"} disabled={disabled} onClick={onClick}>{button}</button>
    </article>
  );
}
