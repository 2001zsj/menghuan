import { it, expect } from "vitest";
import { parseServerEnvironment } from "./environment.js";
it("real evaluation is default off and rejected outside a dedicated loopback scope", () => {
  expect(parseServerEnvironment({}).MENGHUAN_REAL_REVIEW_MODE).toBe("off");
  const e = {
    APP_ENV: "local",
    MENGHUAN_REAL_REVIEW_MODE: "local-evaluation",
    MENGHUAN_REAL_REVIEW_DATABASE_URL:
      "postgresql://postgres@127.0.0.1:55439/menghuan_stage5_test_real_a",
    MENGHUAN_REAL_REVIEW_SESSION_ID: "20000000-0000-4000-8000-000000000001",
  };
  expect(parseServerEnvironment(e).MENGHUAN_REAL_REVIEW_MODE).toBe("local-evaluation");
  for (const patch of [
    { APP_ENV: "preview" },
    { MENGHUAN_SYNTHETIC_MODE: "mock" },
    { MENGHUAN_REVIEW_MODE: "synthetic-test" },
    { MENGHUAN_REAL_REVIEW_DATABASE_URL: "postgresql://postgres@127.0.0.1/neondb" },
    { MENGHUAN_REAL_REVIEW_SESSION_ID: undefined },
  ])
    expect(() => parseServerEnvironment({ ...e, ...patch })).toThrow();
});
