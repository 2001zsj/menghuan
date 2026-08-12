import { RESOURCE_CATEGORIES, stage3AnimeFixture } from "@menghuan/domain";
import { describe, expect, it } from "vitest";

describe("Stage 3 shared fixture", () => {
  it("marks every record explicitly as mock", () => {
    expect(stage3AnimeFixture.length).toBeGreaterThanOrEqual(8);
    expect(stage3AnimeFixture.length).toBeLessThanOrEqual(12);
    expect(stage3AnimeFixture.every((item) => item.anime.isMock)).toBe(true);
  });

  it("contains no real external URLs or image URLs", () => {
    const serialized = JSON.stringify(stage3AnimeFixture);
    expect(serialized).not.toMatch(/https?:\/\//);
    expect(serialized).not.toMatch(/yuc|agefans|bangumi|bilibili/i);
  });

  it("uses only approved resource placeholder categories", () => {
    const allowed = new Set<string>(RESOURCE_CATEGORIES);
    expect(
      stage3AnimeFixture
        .flatMap((item) => item.resourceCategories)
        .every((category) => allowed.has(category)),
    ).toBe(true);
  });
});
