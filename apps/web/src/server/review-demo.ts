import { getServerEnvironment } from "@menghuan/config";
import { FixtureAnimeRepository, type AnimeRepository } from "@menghuan/domain";
let repository: Promise<AnimeRepository> | null = null;
export async function reviewRepository(): Promise<AnimeRepository | null> {
  const env = getServerEnvironment();
  if (env.MENGHUAN_REVIEW_MODE === "off") return null;
  const url = env.MENGHUAN_REVIEW_DATABASE_URL;
  if (!url) throw new Error("Review test database missing");
  repository ??= (async () => {
    const { createDatabaseClient, ReviewMappedStore, SyntheticAnimeRepository } =
      await import("@menghuan/database");
    const client = createDatabaseClient(url, {
      applicationName: "menghuan-stage5-review-readonly",
    });
    return new SyntheticAnimeRepository(
      new FixtureAnimeRepository(),
      new ReviewMappedStore(client.sql),
    );
  })();
  return repository;
}
