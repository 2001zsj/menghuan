import { getServerEnvironment } from "@menghuan/config";
import { FixtureAnimeRepository, type AnimeRepository } from "@menghuan/domain";

const fixtureRepository = new FixtureAnimeRepository();
let databaseRepositoryPromise: Promise<AnimeRepository> | null = null;

async function createDatabaseRepository(databaseUrl: string): Promise<AnimeRepository> {
  const { createDatabaseClient, DatabaseAnimeRepository } = await import("@menghuan/database");
  const globalState = globalThis as typeof globalThis & {
    __menghuanDatabaseClient?: ReturnType<typeof createDatabaseClient>;
  };
  const client =
    globalState.__menghuanDatabaseClient ??
    createDatabaseClient(databaseUrl, {
      applicationName: "menghuan-web-stage3",
    });
  globalState.__menghuanDatabaseClient = client;
  return new DatabaseAnimeRepository(client.db);
}

export async function getAnimeRepository(): Promise<AnimeRepository> {
  const environment = getServerEnvironment();
  if (environment.MENGHUAN_DATA_REPOSITORY === "mock") return fixtureRepository;

  const databaseUrl = environment.DATABASE_URL;
  if (!databaseUrl) throw new Error("database模式缺少DATABASE_URL");
  databaseRepositoryPromise ??= createDatabaseRepository(databaseUrl);
  return databaseRepositoryPromise;
}
