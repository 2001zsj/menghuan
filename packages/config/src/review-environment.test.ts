import { expect, it } from "vitest";
import { parseServerEnvironment } from "./environment";
it("review mode defaults off and requires a separate local mapping database", () => {
  expect(parseServerEnvironment({}).MENGHUAN_REVIEW_MODE).toBe("off");
  for (const input of [
    { APP_ENV: "production", MENGHUAN_REVIEW_MODE: "synthetic-test" },
    {
      MENGHUAN_REVIEW_MODE: "synthetic-test",
      MENGHUAN_REVIEW_DATABASE_URL: "postgresql://127.0.0.1/neondb",
    },
    {
      MENGHUAN_REVIEW_MODE: "synthetic-test",
      MENGHUAN_REVIEW_DATABASE_URL: "postgresql://example.org/menghuan_stage5_test_mapping_x",
    },
  ])
    expect(() => parseServerEnvironment(input)).toThrow();
});
