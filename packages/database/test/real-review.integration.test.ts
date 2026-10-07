import { beforeAll, afterAll, beforeEach, afterEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  createRealObservation,
  parseYucRealPage,
  reviewFieldValues,
  reviewFieldEvidence,
} from "@menghuan/domain";
import { YUC_OBSERVED_SYNTHETIC_HTML } from "../../domain/src/fixtures/yuc-observed.js";
import { createRealReviewClient, RealReviewStore } from "../src/real-review-store.js";
import { createDatabaseClient } from "../src/client.js";
import { migrateRealReviewDatabase, rollbackRealReviewDatabase } from "../src/migrations.js";
import { reviewDigest, ReviewMappedStore } from "../src/review-mapped-store.js";
const url = process.env.TEST_DATABASE_URL!;
if (!url || !/^\/menghuan_stage5_test_real_[a-z0-9_]+$/.test(new URL(url).pathname))
  throw new Error("Dedicated real test DB required");
const name = new URL(url).pathname.slice(1),
  client = createRealReviewClient(url),
  publicClient = createDatabaseClient(url);
let sessionId: string, store: RealReviewStore, createdAt: string;
beforeAll(async () => {
  const before = await publicClient.sql`select nspname from pg_namespace order by nspname`;
  await expect(
    migrateRealReviewDatabase(client.sql, "menghuan_stage5_test_real_wrong"),
  ).rejects.toThrow("identity");
  expect(await publicClient.sql`select nspname from pg_namespace order by nspname`).toEqual(before);
  await migrateRealReviewDatabase(client.sql, name);
});
beforeEach(async () => {
  sessionId = randomUUID();
  store = new RealReviewStore(client.sql, name, sessionId);
  createdAt = new Date(Date.now() - 1000).toISOString();
  await store.startLocalSession({
    id: sessionId,
    purpose: "local-noncommercial-evaluation",
    dataNature: "synthetic-path-test",
    approvedPage: "https://yuc.wiki/202610/",
    createdAt,
    expiresAt: new Date(Date.parse(createdAt) + 7 * 86400000).toISOString(),
    enabled: false,
    publicDisplay: false,
    actor: "Codex engineering review",
  });
});
afterEach(async () => {
  const [s] = await client.sql`select id from stage5_review_sessions where id=${sessionId}`;
  if (s) await store.purgeSession();
});
afterAll(async () => {
  await client.close();
  await publicClient.close();
});
function observation() {
  const c = parseYucRealPage(YUC_OBSERVED_SYNTHETIC_HTML, {
    sourceUrl: "https://yuc.wiki/202610/",
    observedAt: new Date().toISOString(),
  }).candidates[0]!;
  return createRealObservation(c, {
    sessionId,
    snapshotId: randomUUID(),
    observationId: randomUUID(),
    testContent: true,
  });
}
async function scenario() {
  await store.setEnabled(sessionId, true);
  const o = observation();
  await store.saveObservation(sessionId, o);
  const id = `real-local-${randomUUID()}`,
    work = {
      id,
      slug: id,
      sessionId,
      dataNature: "synthetic-path-test",
      values: {
        title: o.fields.title,
        date: { raw: null, normalized: null },
        time: { raw: null, parsed: null },
        timezone: null,
        year: null,
        quarter: null,
        status: "unknown",
      },
      originObservationId: o.observationId,
      identityScope: "single approved snapshot entry; not global verified identity",
      reviewer: "Codex engineering review",
      evidence: "Self-authored single complete entry; snapshot-local identity only",
    };
  await store.createLocalWork(work);
  const map = {
    decisionId: randomUUID(),
    sessionId,
    observationId: o.observationId,
    expectedCandidateVersion: 1,
    expectedDigest: reviewDigest(o),
    internalAnimeId: id,
    expectedEntityVersion: 1,
    projectMappingKey: randomUUID(),
    reason: "Codex engineering review of authored entry",
    evidence: "Synthetic content testing real contract; snapshot-local only",
    supersedes: null,
  };
  const adopt = {
    adoptionId: randomUUID(),
    mappingId: map.decisionId,
    sessionId,
    expectedCandidateVersion: 1,
    expectedDigest: map.expectedDigest,
    expectedEntityVersion: 1,
    fields: ["title", "date", "time", "timezone", "year", "quarter", "status"],
    reason: "Codex explicit per-field review of synthetic content",
    resolvesConflicts: false,
  };
  return { o, work, map, adopt };
}
it("default off means zero candidate writes; old synthetic entry still rejects real type", async () => {
  const o = observation();
  await expect(store.saveObservation(sessionId, o)).rejects.toThrow("disabled");
  expect(await store.listObservations(sessionId)).toEqual([]);
  await expect(
    new ReviewMappedStore(publicClient.sql).saveObservation(sessionId, {
      ...o,
      dataNature: "real",
    }),
  ).rejects.toThrow();
});
it("mapping does not adopt; selected fields preserve originals, provenance and local synthetic label", async () => {
  const c = await scenario();
  await store.map(c.map);
  expect(await store.adoptedPages()).toEqual([]);
  expect(await store.adopt(c.adopt)).toBe("adopted");
  expect(await store.adopt(c.adopt)).toBe("duplicate");
  const [page] = await store.adoptedPages();
  expect(page!.reviewSource!.dataNature).toBe("synthetic-path-test");
  expect(page!.broadcast!.sourceTimezone).toBeNull();
  expect(page!.anime.mediaType).toBe("unknown");
  expect(page!.anime.createdAt).toBe(createdAt);
  const evidence = await store.contributionEvidence(),
    expected = reviewFieldEvidence(c.o.fields);
  for (const row of evidence)
    expect(row.provenance).toMatchObject({
      ...expected[row.field as keyof typeof expected],
      dataNature: "synthetic-path-test",
      observedAt: c.o.observedAt,
      parserVersion: "yuc-observed-dom-v1",
      candidateVersion: 1,
    });
});
it("stale or forged provenance revision rolls back and correct revision updates all provenance", async () => {
  const c = await scenario(),
    bad = structuredClone(c.o);
  bad.version = 2;
  bad.fields.title = "合成修订但尚未同步来源信息";
  await expect(store.saveObservation(sessionId, bad)).rejects.toThrow("Provenance");
  const e = reviewFieldEvidence(bad.fields);
  bad.provenance = bad.provenance.map((p) => ({ ...p, ...e[p.field] }));
  await store.saveObservation(sessionId, bad);
  await expect(store.map(c.map)).rejects.toThrow("Candidate changed");
  expect((await store.listObservations(sessionId))[0]!.observation.provenance[0]!.rawValue).toBe(
    bad.fields.title,
  );
});
it("three-observation budget and single snapshot persist across store objects", async () => {
  await store.setEnabled(sessionId, true);
  const first = observation();
  for (let i = 1; i <= 3; i++)
    await store.saveObservation(sessionId, { ...first, observationId: randomUUID(), ordinal: i });
  const reopened = new RealReviewStore(client.sql, name, sessionId);
  await expect(
    reopened.saveObservation(sessionId, { ...first, observationId: randomUUID() }),
  ).rejects.toThrow("three");
  await expect(
    reopened.saveObservation(sessionId, {
      ...first,
      observationId: randomUUID(),
      snapshotId: randomUUID(),
    }),
  ).rejects.toThrow("snapshot");
  expect(await reopened.listObservations(sessionId)).toHaveLength(3);
});
it("same-title ambiguity is pending and cannot manufacture identity", async () => {
  await store.setEnabled(sessionId, true);
  const c = observation();
  await store.saveObservation(sessionId, c);
  await store.saveObservation(sessionId, { ...c, observationId: randomUUID(), ordinal: 2 });
  const id = `real-local-${randomUUID()}`;
  await expect(
    store.createLocalWork({
      id,
      slug: id,
      sessionId,
      dataNature: "synthetic-path-test",
      values: {
        ...reviewFieldValues(c.fields),
        date: { raw: null, normalized: null },
        time: { raw: null, parsed: null },
        timezone: null,
        year: null,
        quarter: null,
        status: "unknown",
      },
      originObservationId: c.observationId,
      identityScope: "single approved snapshot entry; not global verified identity",
      reviewer: "Codex engineering review",
      evidence: "Same title cannot establish identity",
    }),
  ).rejects.toThrow("ambiguous");
  expect(await store.adoptedPages()).toEqual([]);
});
it("source closure retains adopted fields but blocks new adoption; withdrawal and purge clear every value-bearing row", async () => {
  const c = await scenario();
  await store.map(c.map);
  await store.adopt(c.adopt);
  await store.setEnabled(sessionId, false);
  expect((await store.adoptedPages())[0]!.reviewSource!.sourceEnabled).toBe(false);
  await expect(store.adopt({ ...c.adopt, adoptionId: randomUUID() })).rejects.toThrow("disabled");
  await store.withdraw(
    sessionId,
    c.map.decisionId,
    "Codex engineering review: explicit withdrawal",
  );
  expect(await store.adoptedPages()).toEqual([]);
  await store.purgeSession();
  for (const [table, column, value] of [
    ["stage5_review_sessions", "id", sessionId],
    ["stage5_review_observations", "id", c.o.observationId],
    ["stage5_review_observation_history", "observation_id", c.o.observationId],
    ["stage5_review_works", "id", c.work.id],
    ["stage5_review_mappings", "id", c.map.decisionId],
    ["stage5_review_adoptions", "id", c.adopt.adoptionId],
    ["stage5_review_contributions", "adoption_id", c.adopt.adoptionId],
    ["stage5_review_dispositions", "observation_id", c.o.observationId],
  ]) {
    const [count] =
      await client.sql`select count(*)::int as n from ${client.sql(table!)} where ${client.sql(column!)}=${value!}`;
    expect(count!.n).toBe(0);
  }
});
it("expired session hides pages and refuses new writes but allows cleanup", async () => {
  const c = await scenario();
  await store.map(c.map);
  await store.adopt(c.adopt);
  await client.sql`update stage5_review_sessions set scope=jsonb_set(jsonb_set(scope,'{createdAt}',to_jsonb(${new Date(Date.now() - 86400000).toISOString()}::text)),'{expiresAt}',to_jsonb(${new Date(Date.now() - 1000).toISOString()}::text)) where id=${sessionId}`;
  expect(await store.adoptedPages()).toEqual([]);
  await expect(store.adopt({ ...c.adopt, adoptionId: randomUUID() })).rejects.toThrow("expired");
});
it("wrong instance guard leaves a valid session unchanged", async () => {
  const before = await store.listWorks(sessionId),
    wrong = new RealReviewStore(client.sql, "menghuan_stage5_test_real_wrong", sessionId);
  await expect(wrong.setEnabled(sessionId, true)).rejects.toThrow("identity");
  expect(await store.listWorks(sessionId)).toEqual(before);
  await expect(store.saveObservation(sessionId, observation())).rejects.toThrow("disabled");
});
it("GET reservation is durable across store recreation, with zero actual network calls in this test", async () => {
  const id = randomUUID(),
    s = new RealReviewStore(client.sql, name, id),
    now = new Date(Date.now() - 1000).toISOString();
  await s.startLocalSession({
    id,
    purpose: "local-noncommercial-evaluation",
    dataNature: "real",
    approvedPage: "https://yuc.wiki/202610/",
    createdAt: now,
    expiresAt: new Date(Date.parse(now) + 86400000).toISOString(),
    enabled: false,
    publicDisplay: false,
    actor: "Codex engineering review",
  });
  try {
    await expect(s.reserveGet()).rejects.toThrow("disabled");
    await s.setEnabled(id, true);
    await s.reserveGet();
    await expect(new RealReviewStore(client.sql, name, id).reserveGet()).rejects.toThrow(
      "already spent",
    );
  } finally {
    await s.purgeSession();
  }
});
it("real namespace migration repeats and rollback preserves unrelated synthetic test data", async () => {
  await store.purgeSession();
  await publicClient.sql`create table if not exists real_review_unrelated_sentinel (id int primary key,value text)`;
  await publicClient.sql`insert into real_review_unrelated_sentinel values(1,'self-authored sentinel') on conflict(id) do nothing`;
  const before = await publicClient.sql`select * from real_review_unrelated_sentinel`;
  try {
    await migrateRealReviewDatabase(client.sql, name);
    await rollbackRealReviewDatabase(client.sql, name);
    expect(await publicClient.sql`select * from real_review_unrelated_sentinel`).toEqual(before);
    await migrateRealReviewDatabase(client.sql, name);
    expect(await publicClient.sql`select * from real_review_unrelated_sentinel`).toEqual(before);
  } finally {
    await publicClient.sql`drop table real_review_unrelated_sentinel`;
  }
});
