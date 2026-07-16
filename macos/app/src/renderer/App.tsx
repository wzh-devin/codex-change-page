import { useState } from "react";

import { useApp } from "./AppContext";
import { OperationBanner } from "./components/OperationBanner";
import { Sidebar } from "./components/Sidebar";
import { Onboarding } from "./Onboarding";
import type { PageId } from "./model";
import { AboutPage } from "./pages/AboutPage";
import { DiagnosticsPage } from "./pages/DiagnosticsPage";
import { EditorPage } from "./pages/EditorPage";
import { OverviewPage } from "./pages/OverviewPage";
import { RestorePage } from "./pages/RestorePage";
import { SettingsPage } from "./pages/SettingsPage";
import { ThemesPage } from "./pages/ThemesPage";

export function App() {
  const { snapshot, settings } = useApp();
  const [page, setPage] = useState<PageId>("overview");
  if (!settings) {
    return <main className="loading-shell"><div className="skeleton title" /><div className="skeleton large" /></main>;
  }
  if (!settings.onboardingComplete) return <Onboarding />;
  if (!snapshot) {
    return <main className="loading-shell"><div className="skeleton title" /><div className="skeleton large" /></main>;
  }
  return (
    <div className="app-shell">
      <Sidebar page={page} onNavigate={setPage} />
      <main className="content">
        <OperationBanner />
        {page === "overview" && <OverviewPage onOpenThemes={() => setPage("themes")} />}
        {page === "themes" && <ThemesPage onEdit={() => setPage("editor")} />}
        {page === "editor" && <EditorPage />}
        {page === "diagnostics" && <DiagnosticsPage />}
        {page === "restore" && <RestorePage />}
        {page === "settings" && <SettingsPage />}
        {page === "about" && <AboutPage />}
      </main>
    </div>
  );
}
