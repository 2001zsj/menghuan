import { afterAll, beforeAll, expect, it } from "vitest";
import { createSyntheticFlowSamples, parseYucHtml } from "@menghuan/domain";
import { createDatabaseClient } from "../src/client.js";
import {
  migrateStage3Database,
  migrateSyntheticYucDatabase,
  rollbackStage3DatabaseForTest,
  rollbackSyntheticYucDatabase,
} from "../src/migrations.js";
import { seedStage3Fixture } from "../src/seed.js";
import { DatabaseAnimeRepository } from "../src/database-anime-repository.js";
import { SyntheticAnimeRepository } from "../src/synthetic-anime-repository.js";
import { SyntheticYucStore } from "../src/synthetic-yuc-store.js";

const url = process.env.TEST_DATABASE_URL;
if (
  !url ||
  !["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname) ||
  !/^\/menghuan_stage5_test_[a-z0-9_]+$/.test(new URL(url).pathname)
)
  throw new Error("This suite requires the explicitly approved local Stage5 test database");
const client = createDatabaseClient(url, { maxConnections: 3 });
const journal = `stage5_integration_${Date.now()}`;
const store = new SyntheticYucStore(client.sql);
const baseline = new DatabaseAnimeRepository(client.db);
const repository = new SyntheticAnimeRepository(baseline, store);
const samples = createSyntheticFlowSamples();
const envelope = (s: (typeof samples)[number]) => ({
  kind: s.kind,
  fixtureCreatedAt: s.fixtureCreatedAt,
  record: s.record,
});

beforeAll(async () => {
  const [identity] =
    await client.sql`select current_database() as name,current_setting('server_version_num') as version`;
  expect(identity?.version).toBe("170010");
  expect(identity?.name).toBe(new URL(url).pathname.slice(1));
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

it("imports durably and idempotently; candidates do not enter discovery until explicit mapping", async () => {
  expect(await store.isEnabled()).toBe(false);
  await expect(store.importCandidates(samples.map(envelope))).rejects.toThrow("disabled");
  await store.setEnabled(true);
  expect(await store.importCandidates(samples.map(envelope))).toBe(3);
  expect(await store.importCandidates(samples.map(envelope))).toBe(0);
  expect(await store.listCandidates()).toHaveLength(3);
  expect(await repository.listAnime()).toHaveLength(10);
  const reopened = createDatabaseClient(url);
  try {
    expect(await new SyntheticYucStore(reopened.sql).listCandidates()).toHaveLength(3);
  } finally {
    await reopened.close();
  }
  expect(
    await store.adopt(
      samples[0]!.record.sourceRecordId,
      samples[0]!.page,
      "Reviewed synthetic mapping",
    ),
  ).toBe("adopted");
  expect(await repository.getAnimeBySlug("synthetic-yuc-1")).toMatchObject({
    syntheticSource: { kind: "synthetic" },
  });
  expect(await repository.listAnime()).toHaveLength(11);
});

it("invalid input and a real mid-transaction write failure preserve candidates and adopted data", async () => {
  const before = await store.listCandidates();
  await expect(
    store.importCandidates([{ ...envelope(samples[0]!), secretForbiddenField: "bad" }]),
  ).rejects.toThrow();
  expect(await store.listCandidates()).toEqual(before);
  const make = (entity: string) => ({
    ...envelope(samples[0]!),
    record: parseYucHtml(
      `<article data-yuc-entry data-entity-id="${entity}" data-title="Synthetic interruption"></article>`,
      "https://yuc.wiki/202610/",
      "2026-07-01T00:00:00Z",
    )[0],
  });
  await client.sql.unsafe(
    `CREATE FUNCTION stage5_test_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.payload->'record'->>'sourceEntityId' = 'synthetic-reject' THEN RAISE EXCEPTION 'synthetic transaction interruption'; END IF; RETURN NEW; END; $$; CREATE TRIGGER stage5_test_reject BEFORE INSERT ON stage5_yuc_candidates FOR EACH ROW EXECUTE FUNCTION stage5_test_reject();`,
  );
  try {
    await expect(
      store.importCandidates([make("synthetic-first"), make("synthetic-reject")]),
    ).rejects.toThrow();
  } finally {
    await client.sql.unsafe(
      "DROP TRIGGER stage5_test_reject ON stage5_yuc_candidates; DROP FUNCTION stage5_test_reject();",
    );
  }
  expect(await store.listCandidates()).toEqual(before);
  expect(await store.adoptedPages()).toHaveLength(1);
});

it("date revisions remain one entity and concurrent adoption requires explicit expected version", async () => {
  const first = samples[0]!;
  const changed = parseYucHtml(
    `<article data-yuc-entry data-entity-id="${first.record.sourceEntityId}" data-title="${first.page.anime.title}" data-date="2026-07-28" data-time="22:00" data-timezone="Asia/Tokyo" data-year="2026" data-quarter="summer"></article>`,
    "https://yuc.wiki/202610/",
    first.fixtureCreatedAt,
  )[0]!;
  expect(changed.stableKey).toBe(first.record.stableKey);
  const revisedPage = structuredClone(first.page);
  revisedPage.broadcast!.sourceOriginalTimeText = "22:00";
  revisedPage.broadcast!.sourceOriginalDateText = "2026-07-28";
  revisedPage.broadcast!.originalExpression = "日本时间 2026-07-28 22:00";
  revisedPage.broadcast!.normalizedStartAt = "2026-07-28T13:00:00.000Z";
  revisedPage.broadcast!.isTentative = false;
  await store.importCandidates([{ ...envelope(first), record: changed }]);
  const outcomes = await Promise.all([
    store.adopt(changed.sourceRecordId, revisedPage, "Explicit revised synthetic mapping"),
    store.adopt(changed.sourceRecordId, revisedPage, "Explicit revised synthetic mapping"),
  ]);
  expect(outcomes).toEqual(["conflict", "conflict"]);
  expect(await store.adoptedPages()).toHaveLength(1);
  expect(
    await store.adopt(
      changed.sourceRecordId,
      revisedPage,
      "Explicit revised synthetic mapping",
      first.record.sourceRecordId,
    ),
  ).toBe("adopted");
  expect(await store.adoptedPages()).toHaveLength(1);
  await store.withdraw(changed.sourceRecordId);
  await store.adopt(
    first.record.sourceRecordId,
    first.page,
    "Explicit restore prior synthetic mapping",
  );
});

it("database uniqueness rejects colliding mapping and rolls back without losing the adopted record", async () => {
  const other = structuredClone(samples[1]!);
  other.page.anime.id = samples[0]!.page.anime.id;
  await expect(
    store.adopt(other.record.sourceRecordId, other.page, "Conflicting synthetic mapping"),
  ).rejects.toThrow();
  expect(await store.adoptedPages()).toHaveLength(1);
});

it("upgrade rejects duplicate active slugs, preserves mapping, and permits explicit slug reuse after withdrawal", async () => {
  // Simulate the previous addon structure on this dedicated local database.
  await client.sql.unsafe("DROP INDEX IF EXISTS stage5_yuc_one_active_slug");
  const original = samples[0]!;
  const other = structuredClone(samples[1]!);
  other.page.anime.slug = original.page.anime.slug;
  expect(other.page.anime.id).not.toBe(original.page.anime.id);
  const snapshots = await store.mappingSnapshots();
  await migrateSyntheticYucDatabase(client.sql);
  await migrateSyntheticYucDatabase(client.sql);
  expect(await store.mappingSnapshots()).toEqual(snapshots);
  await expect(
    store.adopt(other.record.sourceRecordId, other.page, "Duplicate slug mapping"),
  ).rejects.toMatchObject({ code: "23505" });
  expect(await store.mappingSnapshots()).toEqual(snapshots);
  expect((await repository.getAnimeBySlug(original.page.anime.slug))?.anime.id).toBe(
    original.page.anime.id,
  );
  expect(await repository.getAnimeById(other.page.anime.id)).toBeNull();
  const listed = await repository.listAnime();
  expect(new Set(listed.map((item) => item.anime.slug)).size).toBe(listed.length);
  await store.withdraw(original.record.sourceRecordId);
  expect(
    await store.adopt(other.record.sourceRecordId, other.page, "Explicit withdrawn slug reuse"),
  ).toBe("adopted");
  expect((await repository.getAnimeBySlug(original.page.anime.slug))?.anime.id).toBe(
    other.page.anime.id,
  );
  await store.withdraw(other.record.sourceRecordId);
  await store.adopt(
    original.record.sourceRecordId,
    original.page,
    "Restore original reviewed mapping",
  );
  // Existing old-schema duplicate data must block upgrade, never be silently deleted.
  await client.sql.unsafe("DROP INDEX stage5_yuc_one_active_slug");
  await store.adopt(other.record.sourceRecordId, other.page, "Old-schema duplicate simulation");
  const conflictingSnapshots = await store.mappingSnapshots();
  await expect(migrateSyntheticYucDatabase(client.sql)).rejects.toMatchObject({ code: "23505" });
  expect(await store.mappingSnapshots()).toEqual(conflictingSnapshots);
  await store.withdraw(other.record.sourceRecordId);
  await migrateSyntheticYucDatabase(client.sql);
  expect((await repository.getAnimeBySlug(original.page.anime.slug))?.anime.id).toBe(
    original.page.anime.id,
  );
});

it("source disable preserves adopted snapshots and prevents imports/adoptions; explicit withdrawal restores baseline", async () => {
  await store.setEnabled(false);
  await expect(
    store.adopt(
      samples[1]!.record.sourceRecordId,
      samples[1]!.page,
      "Synthetic mapping after disable",
    ),
  ).rejects.toThrow("disabled");
  await expect(store.importCandidates(samples.map(envelope))).rejects.toThrow("disabled");
  expect(await repository.listAnime()).toHaveLength(11);
  const snapshot = (await store.mappingSnapshots()).find((row) => row.active)!;
  await store.withdraw(snapshot.recordId);
  expect(await repository.listAnime()).toHaveLength(10);
  await store.setEnabled(true);
  await store.adopt(snapshot.recordId, snapshot.page, snapshot.reason);
  expect(await repository.listAnime()).toHaveLength(11);
});

it("concurrent first adoption of two revisions has exactly one winner in the real database", async () => {
  const original = samples[1]!;
  const revised = parseYucHtml(
    `<article data-yuc-entry data-entity-id="${original.record.sourceEntityId}" data-title="${original.page.anime.title}" data-date="2026-08-02" data-time="25:16" data-timezone="Asia/Tokyo" data-year="2026" data-quarter="summer"></article>`,
    "https://yuc.wiki/202610/",
    original.fixtureCreatedAt,
  )[0]!;
  await store.importCandidates([{ ...envelope(original), record: revised }]);
  const revisedPage = structuredClone(original.page);
  revisedPage.broadcast!.sourceOriginalTimeText = "25:16";
  revisedPage.broadcast!.originalExpression = "日本时间 周日 25:16";
  revisedPage.broadcast!.normalizedStartAt = "2026-08-02T16:16:00.000Z";
  const results = await Promise.all([
    store.adopt(
      original.record.sourceRecordId,
      original.page,
      "Concurrent synthetic mapping original",
    ),
    store.adopt(revised.sourceRecordId, revisedPage, "Concurrent synthetic mapping revision"),
  ]);
  expect(results.sort()).toEqual(["adopted", "conflict"]);
  expect(await store.adoptedPages()).toHaveLength(2);
  await store.withdraw(original.record.sourceRecordId);
  await store.withdraw(revised.sourceRecordId);
});

it("addon down/up and synthetic snapshot recovery leave Stage4 baseline readable", async () => {
  const candidates = await store.listCandidates();
  const snapshots = await store.mappingSnapshots();
  await rollbackSyntheticYucDatabase(client.sql);
  expect(await baseline.listAnime()).toHaveLength(10);
  await migrateSyntheticYucDatabase(client.sql);
  await migrateSyntheticYucDatabase(client.sql);
  await store.setEnabled(true);
  await store.importCandidates(candidates);
  for (const snapshot of snapshots.filter((row) => !row.active)) {
    await store.adopt(snapshot.recordId, snapshot.page, snapshot.reason);
    await store.withdraw(snapshot.recordId);
  }
  for (const snapshot of snapshots.filter((row) => row.active))
    await store.adopt(snapshot.recordId, snapshot.page, snapshot.reason);
  expect(await store.mappingSnapshots()).toEqual(snapshots);
  expect(await repository.listAnime()).toHaveLength(11);
  expect((await repository.getAnimeBySlug("night-tram"))?.broadcast?.sourceOriginalTimeText).toBe(
    "25:15",
  );
});
