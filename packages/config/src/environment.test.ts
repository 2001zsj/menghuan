import { describe, expect, it } from "vitest";
import { EnvironmentValidationError, parseEnvironment } from "./environment";

describe("parseEnvironment", () => {
  it("accepts valid configuration", () => {
    expect(
      parseEnvironment({
        APP_ENV: "preview",
        NEXT_PUBLIC_SITE_URL: "https://preview.menghuan.example",
        LOG_LEVEL: "warn",
      }),
    ).toEqual({
      APP_ENV: "preview",
      NEXT_PUBLIC_SITE_URL: "https://preview.menghuan.example",
      LOG_LEVEL: "warn",
    });
  });

  it("provides safe local defaults", () => {
    expect(parseEnvironment({})).toEqual({
      APP_ENV: "local",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      LOG_LEVEL: "info",
    });
  });

  it("rejects an invalid APP_ENV with a clear error", () => {
    expect(() =>
      parseEnvironment({
        APP_ENV: "staging",
      }),
    ).toThrowError(EnvironmentValidationError);
    expect(() =>
      parseEnvironment({
        APP_ENV: "staging",
      }),
    ).toThrowError(/APP_ENV/);
  });

  it("rejects an invalid site URL with a clear error", () => {
    expect(() =>
      parseEnvironment({
        NEXT_PUBLIC_SITE_URL: "not-a-url",
      }),
    ).toThrowError(/NEXT_PUBLIC_SITE_URL/);
  });
});
