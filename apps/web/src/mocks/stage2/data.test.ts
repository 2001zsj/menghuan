import { describe, expect, it } from "vitest";
import { stage2MockAnime } from "./data";
describe("Stage 2 mock data", () => {
  it("marks every record explicitly as mock", () => {
    expect(stage2MockAnime.length).toBeGreaterThanOrEqual(8);
    expect(stage2MockAnime.length).toBeLessThanOrEqual(12);
    expect(stage2MockAnime.every((anime) => anime.isMock === true)).toBe(true);
  });
  it("contains no real external URLs or image URLs", () => {
    const serialized = JSON.stringify(stage2MockAnime);
    expect(serialized).not.toMatch(/https?:\/\//);
    expect(serialized).not.toMatch(/yuc|agefans|bangumi|bilibili/i);
  });
  it("uses only approved resource placeholder categories", () => {
    const allowed = new Set([
      "official_site",
      "official_social",
      "official_video_channel",
      "broadcaster",
      "verified_licensed_streaming",
      "distributor",
      "encyclopedia",
      "rating_site",
      "database",
      "news",
      "search",
      "approved_other",
    ]);
    expect(
      stage2MockAnime
        .flatMap((anime) => anime.resourceCategories)
        .every((category) => allowed.has(category)),
    ).toBe(true);
  });
});
