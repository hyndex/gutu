import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";

/** Read `package.json`'s `gutuPlugins` array and expose it as
 *  `import.meta.env.VITE_GUTU_PLUGINS` (CSV). This lets plugin authors
 *  publish to npm and have the shell auto-pick them up — they just add
 *  `"gutuPlugins": ["@acme/gutu-foo"]` to package.json. */
function readGutuPlugins(): string {
  try {
    const pkgPath = path.resolve(__dirname, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
      gutuPlugins?: string[];
    };
    return (pkg.gutuPlugins ?? []).filter(Boolean).join(",");
  } catch {
    return "";
  }
}

export default defineConfig({
  define: {
    "import.meta.env.VITE_GUTU_PLUGINS": JSON.stringify(readGutuPlugins()),
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@gutu/admin-shell-next": path.resolve(__dirname, "./packages/admin-shell-next/src/index.ts"),
      "@gutu/admin-shell-bridge": path.resolve(__dirname, "./packages/admin-shell-bridge/src/index.ts"),
    },
  },
  server: {
    port: Number(process.env.PORT ?? 5173),
    strictPort: true,
    host: "127.0.0.1",
    proxy: {
      "/api/ws": {
        target: process.env.VITE_API_TARGET ?? "http://127.0.0.1:3333",
        changeOrigin: true,
        ws: true,
      },
      "/api": {
        target: process.env.VITE_API_TARGET ?? "http://127.0.0.1:3333",
        changeOrigin: true,
      },
    },
  },
  build: { sourcemap: true, target: "es2022" },
});
