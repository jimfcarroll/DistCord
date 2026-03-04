/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
    build: {
      outDir: "dist",
      target: "es2022",
    },
    server: {
      host: true,
      allowedHosts: true,
      // Proxy relay info for localhost dev (LAN dev uses the TLS reverse proxy instead)
      proxy: {
        "/relay-info": {
          target: `http://localhost:${env.VITE_RELAY_INFO_PORT || "9002"}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/relay-info/, "/"),
        },
      },
    },
    test: {
      setupFiles: ["./vitest.setup.ts"],
      exclude: ["e2e/**", "node_modules/**"],
    },
  };
});
