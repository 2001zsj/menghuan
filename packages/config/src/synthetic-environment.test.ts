import { expect, it } from "vitest";
import { parseServerEnvironment } from "./environment.js";

it("synthetic mode defaults off", () =>
  expect(parseServerEnvironment({}).MENGHUAN_SYNTHETIC_MODE).toBe("off"));
it.each([
  { APP_ENV: "preview", MENGHUAN_SYNTHETIC_MODE: "mock" },
  { APP_ENV: "production", MENGHUAN_SYNTHETIC_MODE: "database" },
  {
    MENGHUAN_SYNTHETIC_MODE: "database",
    MENGHUAN_SYNTHETIC_DATABASE_URL: "postgresql://example.org/menghuan_stage5_test_x",
  },
  {
    MENGHUAN_SYNTHETIC_MODE: "database",
    MENGHUAN_SYNTHETIC_DATABASE_URL: "postgresql://127.0.0.1/neondb",
  },
  { MENGHUAN_SYNTHETIC_MODE: "database" },
])("rejects non-local or ambiguous demo target", (input) =>
  expect(() => parseServerEnvironment(input)).toThrow(),
);

it("accepts explicit local database and explicit mock modes without fallback", () => {
  expect(parseServerEnvironment({ MENGHUAN_SYNTHETIC_MODE: "mock" }).MENGHUAN_SYNTHETIC_MODE).toBe(
    "mock",
  );
  expect(
    parseServerEnvironment({
      MENGHUAN_SYNTHETIC_MODE: "database",
      MENGHUAN_SYNTHETIC_DATABASE_URL: "postgresql://127.0.0.1/menghuan_stage5_test_demo",
    }).MENGHUAN_SYNTHETIC_MODE,
  ).toBe("database");
});
