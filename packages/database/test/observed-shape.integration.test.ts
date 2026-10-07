import { afterAll, beforeAll, expect, it } from "vitest";
import { createObservedSyntheticFlowSamples } from "@menghuan/domain";
import { createDatabaseClient } from "../src/client.js";
import {
  migrateStage3Database,
  migrateSyntheticYucDatabase,
  rollbackStage3DatabaseForTest,
  rollbackSyntheticYucDatabase,
} from "../src/migrations.js";
import { seedStage3Fixture } from "../src/seed.js";
import { SyntheticYucStore } from "../src/synthetic-yuc-store.js";
import { SyntheticAnimeRepository } from "../src/synthetic-anime-repository.js";
import { DatabaseAnimeRepository } from "../src/database-anime-repository.js";

const url = process.env.TEST_DATABASE_URL;
if (
  !url ||
  new URL(url).hostname !== "127.0.0.1" ||
  !/^\/menghuan_stage5_test_[a-z0-9_]+$/.test(new URL(url).pathname)
)
  throw new Error("Dedicated local test target required");
const client = createDatabaseClient(url);
const store = new SyntheticYucStore(client.sql);
const repository = new SyntheticAnimeRepository(new DatabaseAnimeRepository(client.db), store);
const samples = createObservedSyntheticFlowSamples();
const envelope = (s: (typeof samples)[number]) => ({
  kind: s.kind,
  fixtureCreatedAt: s.fixtureCreatedAt,
  record: s.record,
});
const journal = `stage5_observed_${Date.now()}`;
beforeAll(async () => {
  const [identity] =
    await client.sql`select current_database() as name,current_setting('server_version_num') as version`;
  expect(identity?.name).toBe(new URL(url).pathname.slice(1));
  expect(identity?.version).toBe("170010");
  await migrateStage3Database(client.db, { migrationsSchema: journal });
  await migrateSyntheticYucDatabase(client.sql);
  await seedStage3Fixture(client.db);
});
afterAll(async () => {
  try {
    await rollbackSyntheticYucDatabase(client.sql);
    await rollbackStage3DatabaseForTest(client.sql);
    await client.sql.unsafe(`DROP SCHEMA IF EXISTS "${journal}" CASCADE`);
  } finally {
    await client.close();
  }
});
it("observed-shape synthetic values persist pending review, adopt explicitly, survive disable/failure and withdraw", async () => {
  await expect(store.importCandidates(samples.map(envelope))).rejects.toThrow("disabled");
  await store.setEnabled(true);
  expect(await store.importCandidates(samples.map(envelope))).toBe(3);
  expect(await store.importCandidates(samples.map(envelope))).toBe(0);
  expect(await repository.getAnimeBySlug(samples[0]!.page.anime.slug)).toBeNull();
  const reopened = createDatabaseClient(url);
  try {
    expect(await new SyntheticYucStore(reopened.sql).listCandidates()).toHaveLength(3);
  } finally {
    await reopened.close();
  }
  await expect(store.importCandidates([samples[0]!.observation])).rejects.toThrow();
  expect(await store.listCandidates()).toHaveLength(3);
  expect(
    await store.adopt(
      samples[0]!.record.sourceRecordId,
      samples[0]!.page,
      samples[0]!.page.syntheticSource!.mappingReason,
    ),
  ).toBe("adopted");
  expect((await repository.getAnimeBySlug(samples[0]!.page.anime.slug))?.broadcast).toMatchObject({
    sourceOriginalTimeText: "25:15",
    sourceTimezone: null,
    normalizedStartAt: null,
  });
  const snapshots = await store.mappingSnapshots();
  await store.setEnabled(false);
  await expect(store.importCandidates(samples.map(envelope))).rejects.toThrow("disabled");
  expect(await store.mappingSnapshots()).toEqual(snapshots);
  expect(await repository.getAnimeBySlug(samples[0]!.page.anime.slug)).not.toBeNull();
  await store.withdraw(samples[0]!.record.sourceRecordId);
  expect(await repository.getAnimeBySlug(samples[0]!.page.anime.slug)).toBeNull();
});
