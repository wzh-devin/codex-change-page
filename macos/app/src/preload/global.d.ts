import type { SkinAPI } from "../shared/api";

declare global {
  interface Window {
    skinAPI: SkinAPI;
  }
}

export {};
