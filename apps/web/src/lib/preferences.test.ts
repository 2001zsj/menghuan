import { describe, expect, it } from "vitest";
import { DEFAULT_UI_PREFERENCES, parseUiPreferences, serializeUiPreferences } from "./preferences";
describe("UI preferences", () => {
  it("validates theme and timezone preferences", () => {
    const value = { version: 1 as const, theme: "dark" as const, timezone: "Asia/Tokyo" as const };
    expect(parseUiPreferences(serializeUiPreferences(value))).toEqual(value);
  });
  it("falls back safely for damaged preferences", () => {
    expect(parseUiPreferences("{broken")).toEqual(DEFAULT_UI_PREFERENCES);
    expect(
      parseUiPreferences(JSON.stringify({ version: 1, theme: "neon", timezone: "UTC" })),
    ).toEqual(DEFAULT_UI_PREFERENCES);
  });
});
