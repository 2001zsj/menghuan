import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
const projectRoot = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig({
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },
  resolve: {
    alias: {
      "@menghuan/config": `${projectRoot}packages/config/src/index.ts`,
      "@menghuan/ui": `${projectRoot}packages/ui/src/index.tsx`,
      "@": `${projectRoot}apps/web/src`,
    },
  },
  test: {
    environment: "node",
    include: ["apps/**/*.test.{ts,tsx}", "packages/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**", "**/node_modules/**", "**/dist/**"],
    coverage: { reporter: ["text", "html"] },
  },
});
