import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/.next/**",
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
    },
    settings: {
      next: {
        rootDir: "apps/web/",
      },
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  {
    files: ["packages/ui/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: [
      "**/*.config.{js,mjs,cjs,ts}",
      "apps/sync-worker/**/*.ts",
      "packages/config/**/*.ts",
      "packages/domain/**/*.ts",
      "packages/database/**/*.ts",
      "tests/**/*.ts",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);
