import { defineConfig } from "@playwright/test";

const apiURL = process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:8015";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.api.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/api" }]],
  outputDir: "test-results/api",
  use: { baseURL: apiURL, trace: "retain-on-failure" },
  webServer: process.env.PLAYWRIGHT_API_URL ? undefined : {
    command: "python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8015",
    url: `${apiURL}/health`,
    reuseExistingServer: false,
    env: {
      PROOFLINE_DEV_AUTH: "true",
      PROOFLINE_ENV: "test",
      GEMINI_API_KEY: "",
    },
    timeout: 30_000,
  },
});
