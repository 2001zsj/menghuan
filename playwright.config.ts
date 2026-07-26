import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";
const linuxChromium = "/usr/bin/chromium";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
  (existsSync(linuxChromium) ? linuxChromium : undefined);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    browserName: "chromium",
    trace: "retain-on-failure",
    ...(executablePath
      ? {
          launchOptions: {
            executablePath,
            args: ["--no-sandbox"],
          },
        }
      : {}),
  },
  webServer: {
    command: "pnpm --filter @menghuan/web dev --hostname 127.0.0.1 --port 3100",
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      APP_ENV: "local",
      NEXT_PUBLIC_SITE_URL: baseURL,
      LOG_LEVEL: "info",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
