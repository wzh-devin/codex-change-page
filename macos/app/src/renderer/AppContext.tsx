import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ImageSelection, SystemSnapshot, ThemeCreateInput } from "../shared/api";
import type { EngineRequest, EngineResult, Theme } from "../shared/schemas";
import type { Settings } from "../main/services/settingsStore";

type AppContextValue = {
  snapshot: SystemSnapshot | null;
  themes: Theme[];
  settings: Settings | null;
  progress: EngineResult | null;
  busy: boolean;
  error: string | null;
  refresh(): Promise<void>;
  runEngine(request: EngineRequest): Promise<EngineResult>;
  chooseImage(): Promise<ImageSelection | null>;
  createTheme(input: ThemeCreateInput): Promise<Theme>;
  updateTheme(id: string, patch: Partial<Theme>): Promise<Theme>;
  selectTheme(id: string): Promise<void>;
  removeTheme(id: string): Promise<void>;
  duplicateTheme(id: string): Promise<void>;
  importTheme(): Promise<void>;
  exportTheme(id: string): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  clearAllData(): Promise<void>;
  clearError(): void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [progress, setProgress] = useState<EngineResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const snapshotRequest = window.skinAPI.system.inspect().then((value) => {
      setSnapshot(value);
      return value;
    });
    const themesRequest = window.skinAPI.themes.list().then((value) => {
      setThemes(value);
      return value;
    });
    const settingsRequest = window.skinAPI.settings.get().then((value) => {
      setSettings(value);
      return value;
    });
    await Promise.all([snapshotRequest, themesRequest, settingsRequest]);
  }, []);

  useEffect(() => {
    void refresh().catch((value) => setError(value instanceof Error ? value.message : String(value)));
    return window.skinAPI.onProgress(setProgress);
  }, [refresh]);

  const withError = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setError(null);
    try {
      return await operation();
    } catch (value) {
      setError(value instanceof Error ? value.message : String(value));
      throw value;
    }
  }, []);

  const runEngine = useCallback(async (request: EngineRequest) => {
    setBusy(true);
    setError(null);
    try {
      const result = await window.skinAPI.engine.run(request);
      await refresh();
      return result;
    } catch (value) {
      const message = value instanceof Error ? value.message : String(value);
      setError(message);
      throw value;
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const value = useMemo<AppContextValue>(() => ({
    snapshot,
    themes,
    settings,
    progress,
    busy,
    error,
    refresh,
    runEngine,
    chooseImage: () => withError(() => window.skinAPI.themes.chooseImage()),
    createTheme: (input) => withError(async () => {
      const theme = await window.skinAPI.themes.create(input);
      await refresh();
      return theme;
    }),
    updateTheme: (id, patch) => withError(async () => {
      const theme = await window.skinAPI.themes.update(id, patch);
      await refresh();
      return theme;
    }),
    selectTheme: (id) => withError(async () => {
      await window.skinAPI.themes.select(id);
      await refresh();
    }),
    removeTheme: (id) => withError(async () => {
      await window.skinAPI.themes.remove(id);
      await refresh();
    }),
    duplicateTheme: (id) => withError(async () => {
      await window.skinAPI.themes.duplicate(id);
      await refresh();
    }),
    importTheme: () => withError(async () => {
      await window.skinAPI.themes.importPackage();
      await refresh();
    }),
    exportTheme: (id) => withError(async () => {
      await window.skinAPI.themes.exportPackage(id);
    }),
    updateSettings: (patch) => withError(async () => {
        setSettings(await window.skinAPI.settings.update(patch));
    }),
    async clearAllData() {
      setBusy(true);
      setError(null);
      try {
        await window.skinAPI.engine.clearData();
        await refresh();
      } catch (value) {
        setError(value instanceof Error ? value.message : String(value));
      } finally {
        setBusy(false);
      }
    },
    clearError: () => setError(null),
  }), [
    snapshot, themes, settings, progress, busy, error, refresh, runEngine, withError,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider.");
  return value;
}
