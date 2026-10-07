import { describe, expect, it } from "vitest";
import { parseServerEnvironment } from "./environment";

describe("independent synthetic preview boundary", () => {
  it("is disabled by default", () => {
    expect(parseServerEnvironment({}).MENGHUAN_PREVIEW_REVIEW_MODE).toBe("off");
  });
  it("accepts explicit preview synthetic read-only mode", () => {
    expect(
      parseServerEnvironment({
        APP_ENV: "preview",
        MENGHUAN_PREVIEW_REVIEW_MODE: "synthetic-readonly",
      }).MENGHUAN_PREVIEW_REVIEW_MODE,
    ).toBe("synthetic-readonly");
  });
  it.each(["local", "production"])("rejects activation in %s", (APP_ENV) => {
    expect(() =>
      parseServerEnvironment({ APP_ENV, MENGHUAN_PREVIEW_REVIEW_MODE: "synthetic-readonly" }),
    ).toThrow();
  });
  it("cannot use a real preview mode or mix the local evaluation entry", () => {
    expect(() =>
      parseServerEnvironment({ APP_ENV: "preview", MENGHUAN_PREVIEW_REVIEW_MODE: "real" }),
    ).toThrow();
    expect(() =>
      parseServerEnvironment({
        APP_ENV: "preview",
        MENGHUAN_PREVIEW_REVIEW_MODE: "synthetic-readonly",
        MENGHUAN_REAL_REVIEW_MODE: "local-evaluation",
      }),
    ).toThrow();
  });
  it("cannot inherit a shared database or production platform environment", () => {
    expect(() =>
      parseServerEnvironment({
        APP_ENV: "preview",
        VERCEL_ENV: "production",
        MENGHUAN_PREVIEW_REVIEW_MODE: "synthetic-readonly",
      }),
    ).toThrow();
    expect(() =>
      parseServerEnvironment({
        APP_ENV: "preview",
        MENGHUAN_PREVIEW_REVIEW_MODE: "synthetic-readonly",
        DATABASE_URL: "postgresql://example:example@localhost/menghuan",
      }),
    ).toThrow();
  });
});
