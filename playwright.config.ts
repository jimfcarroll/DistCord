import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000, // 2 min — DHT discovery + WebRTC negotiation is slow
  expect: {
    timeout: 60_000, // assertions that wait for network events
  },
  fullyParallel: false, // tests share relay state, run sequentially
  retries: 0,
  use: {
    baseURL: "https://localhost:8443",
    ignoreHTTPSErrors: true, // self-signed cert
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  // Start services if not already running.
  // Order matters: relay first, then Vite, then proxy (proxy routes to both).
  webServer: [
    {
      command: "npm run relay",
      url: "http://localhost:9002",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "npm run dev",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "npm run proxy",
      url: "https://localhost:8443",
      ignoreHTTPSErrors: true,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
