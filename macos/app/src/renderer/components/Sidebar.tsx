import type { PageId } from "../model";
import { NAVIGATION_ITEMS } from "../model";

export function Sidebar({
  page,
  onNavigate,
}: {
  page: PageId;
  onNavigate(page: PageId): void;
}) {
  return (
    <aside className="sidebar" aria-label="主导航">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">◉</span>
        <span>
          <strong>Codex 换肤助手</strong>
          <small>Dream Skin Studio</small>
        </span>
      </div>
      <nav>
        {NAVIGATION_ITEMS.map((item) => (
          <button
            key={item.id}
            className={page === item.id ? "nav-item selected" : "nav-item"}
            onClick={() => onNavigate(item.id)}
            aria-current={page === item.id ? "page" : undefined}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <p className="sidebar-note">本机 CDP · 不修改官方应用</p>
    </aside>
  );
}
