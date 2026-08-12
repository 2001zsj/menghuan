import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@menghuan/config": `${projectRoot}packages/config/src/index.ts`,
      "@menghuan/domain": `${projectRoot}packages/domain/src/index.ts`,
      "@menghuan/database": `${projectRoot}packages/database/src/index.ts`,
    },
  },
  test: {
    environment: "node",
    include: ["packages/database/test/**/*.integration.test.ts"],
    sequence: { concurrent: false },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
