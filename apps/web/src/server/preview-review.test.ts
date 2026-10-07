import { afterEach, expect, it, vi } from "vitest";
import { previewReviewRepository } from "./preview-review";

afterEach(() => vi.unstubAllEnvs());
it("default off creates no preview repository", async () => {
  vi.stubEnv("MENGHUAN_PREVIEW_REVIEW_MODE", "off");
  expect(await previewReviewRepository()).toBeNull();
});
it("isolated preview exposes authored samples, raw time and unknown state without a database", async () => {
  vi.stubEnv("APP_ENV", "preview");
  vi.stubEnv("MENGHUAN_PREVIEW_REVIEW_MODE", "synthetic-readonly");
  const repository = (await previewReviewRepository())!;
  expect(await repository.listAnime()).toHaveLength(13);
  const night = await repository.getAnimeBySlug("synthetic-yuc-2");
  expect(night?.broadcast?.sourceOriginalTimeText).toBe("25:15");
  const unknown = await repository.getAnimeBySlug("synthetic-yuc-3");
  expect(unknown?.syntheticSource?.kind).toBe("synthetic");
  expect(unknown?.anime.isMock).toBe(true);
  expect(unknown?.resourceCategories).toEqual([]);
  expect(
    (await repository.listAnimeSlugs()).filter((s) => s.startsWith("synthetic-yuc-")),
  ).toHaveLength(3);
});
