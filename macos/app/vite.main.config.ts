import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: path.join(root, "dist", "main"),
    emptyOutDir: true,
    ssr: path.join(root, "src", "main", "index.ts"),
    target: "node22",
    rollupOptions: {
      external: ["electron", /^node:/],
      output: {
        entryFileNames: "index.js",
        format: "es",
      },
    },
  },
});
