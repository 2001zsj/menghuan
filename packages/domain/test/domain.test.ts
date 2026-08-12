import { describe, expect, it } from "vitest";
import {
  RESOURCE_CATEGORIES,
  animePageDataSchema,
  animeSlugSchema,
  broadcastInfoSchema,
  seasonQuarterFromLabel,
  seasonQuarterLabel,
  serializeAnimePageDataList,
  stage3AnimeFixture,
} from "../src/index.js";

function containsDate(value: unknown): boolean {
  if (value instanceof Date) return true;
  if (Array.isArray(value)) return value.some(containsDate);
  if (value && typeof value === "object") return Object.values(value).some(containsDate);
  return false;
}

describe("stage 3 domain", () => {
  it("validates a complete fixture entity", () => {
    expect(animePageDataSchema.parse(stage3AnimeFixture[0])).toEqual(stage3AnimeFixture[0]);
  });

  it("validates legal and illegal slugs", () => {
    expect(animeSlugSchema.safeParse("moonlit-archive").success).toBe(true);
    expect(animeSlugSchema.safeParse("Moonlit Archive").success).toBe(false);
    expect(animeSlugSchema.safeParse("moonlit--archive").success).toBe(false);
  });

  it("maps Chinese quarter labels without changing canonical values", () => {
    expect(seasonQuarterFromLabel("春")).toBe("spring");
    expect(seasonQuarterFromLabel("夏")).toBe("summer");
    expect(seasonQuarterLabel("autumn")).toBe("秋");
    expect(seasonQuarterFromLabel("未知")).toBeNull();
  });

  it("keeps unknown broadcast time and timezone unknown", () => {
    const unknown = stage3AnimeFixture.find((item) => item.anime.id === "mock-silent-orbit");
    expect(unknown?.broadcast?.normalizedStartAt).toBeNull();
    expect(unknown?.broadcast?.sourceTimezone).toBeNull();
    if (!unknown?.broadcast) throw new Error("缺少时间待定Fixture");
    expect(() =>
      broadcastInfoSchema.parse({
        ...unknown.broadcast,
        normalizedStartAt: "2026-08-01T00:00:00.000Z",
      }),
    ).toThrow(/来源时区/);
  });

  it("accepts only approved external resource categories", () => {
    expect(RESOURCE_CATEGORIES).toContain("verified_licensed_streaming");
    expect(RESOURCE_CATEGORIES).not.toContain("download");
    expect(RESOURCE_CATEGORIES).not.toContain("magnet");
  });

  it("validates every fixture and preserves the ten fictional works", () => {
    expect(stage3AnimeFixture).toHaveLength(10);
    expect(stage3AnimeFixture.every((item) => item.anime.isMock)).toBe(true);
    expect(stage3AnimeFixture.every((item) => item.anime.dataStatus === "mock")).toBe(true);
    expect(() => serializeAnimePageDataList(stage3AnimeFixture)).not.toThrow();
  });

  it("serializes without Date or database implementation objects", () => {
    const serialized = serializeAnimePageDataList(stage3AnimeFixture);
    expect(containsDate(serialized)).toBe(false);
    expect(JSON.stringify(serialized)).not.toMatch(/drizzle|postgres|database_url/i);
  });

  it("contains no real URL, YUC, AGE, or real anime source data", () => {
    const serialized = JSON.stringify(stage3AnimeFixture);
    expect(serialized).not.toMatch(/https?:\/\//);
    expect(serialized).not.toMatch(/yuc|agefans|bangumi|bilibili/i);
  });
});
