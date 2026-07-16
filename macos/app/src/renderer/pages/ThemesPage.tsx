import { useApp } from "../AppContext";

export function ThemesPage({ onEdit }: { onEdit(): void }) {
  const {
    snapshot, themes, selectTheme, removeTheme, duplicateTheme, importTheme, exportTheme,
    updateTheme,
  } = useApp();
  return (
    <div className="page">
      <header className="page-header">
        <div><h1>主题库</h1><p>管理安全的图片、配色和文案主题。</p></div>
        <div className="header-actions">
          <button className="secondary" onClick={() => void importTheme()}>导入 .codexskin</button>
          <button className="primary" onClick={onEdit}>创建主题</button>
        </div>
      </header>
      {themes.length === 0 ? (
        <section className="empty-state">
          <strong>还没有主题</strong>
          <p>选择一张图片，换肤助手会生成安全、可恢复的主题。</p>
          <button className="primary" onClick={onEdit}>创建第一套主题</button>
        </section>
      ) : (
        <section className="theme-list">
          {themes.map((theme) => {
            const active = snapshot?.activeTheme?.id === theme.id;
            return (
              <article key={theme.id} className={active ? "theme-row active" : "theme-row"}>
                <div className="theme-swatch" style={{
                  background: `linear-gradient(135deg, ${theme.colors.highlight}, ${theme.colors.accent}, ${theme.colors.secondary})`,
                }} />
                <div className="theme-row-copy">
                  <strong>{theme.name}</strong>
                  <p>{theme.tagline}</p>
                  {active && <span className="active-label">当前主题</span>}
                </div>
                <div className="row-actions">
                  {!active && <button className="secondary" onClick={() => void selectTheme(theme.id)}>设为当前</button>}
                  <button className="ghost" onClick={() => {
                    const name = window.prompt("输入新的主题名称", theme.name)?.trim();
                    if (name && name !== theme.name) void updateTheme(theme.id, { name });
                  }}>重命名</button>
                  <button className="ghost" onClick={() => void duplicateTheme(theme.id)}>复制</button>
                  <button className="ghost" onClick={() => void exportTheme(theme.id)}>导出</button>
                  <button className="ghost danger-text" disabled={active} onClick={() => {
                    if (window.confirm(`确定删除“${theme.name}”吗？`)) void removeTheme(theme.id);
                  }}>删除</button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
