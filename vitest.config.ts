import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@menghuan/config": `${projectRoot}packages/config/src/index.ts`,
    },
  },
  test: {
    environment: "node",
    include: ["apps/**/*.test.ts", "packages/**/*.test.ts"],
    exclude: ["tests/e2e/**", "**/node_modules/**", "**/dist/**"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
