import type { EngineRequest, EngineResult, Theme } from "./schemas";
import type { Settings } from "../main/services/settingsStore";

export type SkinSession = "active" | "paused" | "off" | "stale" | "unknown";

export type SystemSnapshot = {
  platform: string;
  architecture: string;
  supported: boolean;
  codexAvailable: boolean;
  signatureValid: boolean;
  nodeValid: boolean;
  codexVersion: string | null;
  nodeVersion: string | null;
  engine: {
    installed: boolean;
    current: boolean;
    bundledVersion: string | null;
    installedVersion: string | null;
  };
  session: SkinSession;
  codexRunning: boolean;
  cdpReady: boolean;
  port: number;
  activeTheme: Theme | null;
  interruptedOperation: { operationId: string; command: string } | null;
};

export type ThemeCreateInput = {
  sourceImage: string;
  name: string;
  colors: {
    accent: string;
    secondary: string;
    highlight: string;
  };
  imageSettings?: Partial<Theme["imageSettings"]>;
  tagline?: string;
  quote?: string;
};

export type ImageSelection = {
  path: string;
  name: string;
  dataUrl: string;
};

export interface SkinAPI {
  system: {
    inspect(): Promise<SystemSnapshot>;
    openSponsor(): Promise<void>;
  };
  engine: {
    run(request: EngineRequest): Promise<EngineResult>;
    clearData(): Promise<void>;
  };
  themes: {
    list(): Promise<Theme[]>;
    active(): Promise<Theme | null>;
    chooseImage(): Promise<ImageSelection | null>;
    create(input: ThemeCreateInput): Promise<Theme>;
    update(id: string, patch: Partial<Theme>): Promise<Theme>;
    duplicate(id: string): Promise<Theme>;
    select(id: string): Promise<void>;
    remove(id: string): Promise<void>;
    importPackage(): Promise<Theme | null>;
    exportPackage(id: string): Promise<string | null>;
  };
  settings: {
    get(): Promise<Settings>;
    update(patch: Partial<Settings>): Promise<Settings>;
  };
  logs: {
    reveal(): Promise<void>;
  };
  onProgress(listener: (result: EngineResult) => void): () => void;
}
