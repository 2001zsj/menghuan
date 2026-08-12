import { describe, expect, it } from "vitest";
import {
  EnvironmentValidationError,
  parseEnvironment,
  parseServerEnvironment,
  requireDatabaseUrl,
} from "./environment";

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
    expect(() => parseEnvironment({ APP_ENV: "staging" })).toThrowError(EnvironmentValidationError);
    expect(() => parseEnvironment({ APP_ENV: "staging" })).toThrowError(/APP_ENV/);
  });

  it("rejects an invalid site URL with a clear error", () => {
    expect(() => parseEnvironment({ NEXT_PUBLIC_SITE_URL: "not-a-url" })).toThrowError(
      /NEXT_PUBLIC_SITE_URL/,
    );
  });
});

describe("parseServerEnvironment", () => {
  it("defaults to mock mode without requiring a database", () => {
    expect(parseServerEnvironment({}).MENGHUAN_DATA_REPOSITORY).toBe("mock");
    expect(parseServerEnvironment({}).DATABASE_URL).toBeUndefined();
  });

  it("treats an empty database URL as absent in mock mode", () => {
    expect(
      parseServerEnvironment({
        MENGHUAN_DATA_REPOSITORY: "mock",
        DATABASE_URL: "",
      }).DATABASE_URL,
    ).toBeUndefined();
  });

  it("accepts database mode with a PostgreSQL URL", () => {
    expect(
      parseServerEnvironment({
        MENGHUAN_DATA_REPOSITORY: "database",
        DATABASE_URL: "postgresql://example:example@localhost:5432/menghuan",
      }).MENGHUAN_DATA_REPOSITORY,
    ).toBe("database");
  });

  it("rejects database mode without DATABASE_URL", () => {
    expect(() => parseServerEnvironment({ MENGHUAN_DATA_REPOSITORY: "database" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("rejects non-PostgreSQL database URLs", () => {
    expect(() =>
      parseServerEnvironment({
        MENGHUAN_DATA_REPOSITORY: "database",
        DATABASE_URL: "https://example.com/database",
      }),
    ).toThrow(/postgres/);
  });

  it("requires a database URL for database commands", () => {
    expect(() => requireDatabaseUrl({})).toThrow(/DATABASE_URL/);
  });
});
