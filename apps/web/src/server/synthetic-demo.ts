import { getServerEnvironment } from "@menghuan/config";
import {
  FixtureAnimeRepository,
  createSyntheticFlowSamples,
  type AnimeRepository,
} from "@menghuan/domain";

let clientPromise: Promise<Awaited<ReturnType<typeof createClient>>> | null = null;
async function createClient(url: string) {
  const {
    createDatabaseClient,
    SyntheticYucStore,
    DatabaseAnimeRepository,
    SyntheticAnimeRepository,
  } = await import("@menghuan/database");
  const client = createDatabaseClient(url, { applicationName: "menghuan-stage5-local-demo" });
  const store = new SyntheticYucStore(client.sql);
  return {
    client,
    store,
    repository: new SyntheticAnimeRepository(new DatabaseAnimeRepository(client.db), store),
  };
}

async function getClient() {
  const env = getServerEnvironment();
  if (env.MENGHUAN_SYNTHETIC_MODE !== "database" || !env.MENGHUAN_SYNTHETIC_DATABASE_URL)
    throw new Error("Local demo database not configured");
  clientPromise ??= createClient(env.MENGHUAN_SYNTHETIC_DATABASE_URL);
  return await clientPromise;
}

export async function syntheticRepository(): Promise<AnimeRepository | null> {
  const env = getServerEnvironment();
  if (env.MENGHUAN_SYNTHETIC_MODE === "off") return null;
  if (env.MENGHUAN_SYNTHETIC_MODE === "database") return (await getClient()).repository;
  const baseline = new FixtureAnimeRepository();
  const { SyntheticAnimeRepository } = await import("@menghuan/database");
  return new SyntheticAnimeRepository(baseline, {
    adoptedPages: async () => createSyntheticFlowSamples().map((s) => s.page),
  });
}

export async function syntheticDemoState() {
  const mode = getServerEnvironment().MENGHUAN_SYNTHETIC_MODE;
  return {
    mode,
    enabled: mode === "database" ? await (await getClient()).store.isEnabled() : mode === "mock",
  };
}
