import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testMatch: "stage5d-preview.spec.ts",
  webServer: {
    command: "pnpm --filter @menghuan/web start --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      APP_ENV: "preview",
      MENGHUAN_PREVIEW_REVIEW_MODE: "synthetic-readonly",
      MENGHUAN_DATA_REPOSITORY: "mock",
      MENGHUAN_REAL_REVIEW_MODE: "off",
      MENGHUAN_REVIEW_MODE: "off",
      MENGHUAN_SYNTHETIC_MODE: "off",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
