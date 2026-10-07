import { getServerEnvironment } from "@menghuan/config";
import {
  createSyntheticFlowSamples,
  FixtureAnimeRepository,
  type AnimeRepository,
} from "@menghuan/domain";

// Authored fixtures only. This entry cannot fetch a source, open a DB or accept imported data.
export async function previewReviewRepository(): Promise<AnimeRepository | null> {
  if (getServerEnvironment().MENGHUAN_PREVIEW_REVIEW_MODE === "off") return null;
  const { SyntheticAnimeRepository } = await import("@menghuan/database");
  return new SyntheticAnimeRepository(new FixtureAnimeRepository(), {
    adoptedPages: async () => createSyntheticFlowSamples().map(({ page }) => page),
  });
}
