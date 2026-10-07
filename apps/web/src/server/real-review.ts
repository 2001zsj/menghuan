import { getServerEnvironment } from "@menghuan/config";
import { FixtureAnimeRepository, type AnimeRepository } from "@menghuan/domain";
let clientPromise: Promise<Awaited<ReturnType<typeof createClient>>> | null = null;
async function createClient(url: string, sessionId: string) {
  const { createRealReviewClient, RealReviewStore, SyntheticAnimeRepository } =
    await import("@menghuan/database");
  const client = createRealReviewClient(url),
    store = new RealReviewStore(client.sql, new URL(url).pathname.slice(1), sessionId);
  return { repository: new SyntheticAnimeRepository(new FixtureAnimeRepository(), store), store };
}
async function localClient() {
  const e = getServerEnvironment();
  if (e.MENGHUAN_REAL_REVIEW_MODE === "off") return null;
  clientPromise ??= createClient(
    e.MENGHUAN_REAL_REVIEW_DATABASE_URL!,
    e.MENGHUAN_REAL_REVIEW_SESSION_ID!,
  );
  return await clientPromise;
}
export async function realReviewRepository(): Promise<AnimeRepository | null> {
  return (await localClient())?.repository ?? null;
}
export async function realReviewState() {
  const c = await localClient();
  return c ? await c.store.scopeState() : null;
}
