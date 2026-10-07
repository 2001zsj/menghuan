import { afterAll, beforeAll, expect, it } from "vitest";
import { createReviewFixtures, syncReviewProvenance } from "@menghuan/domain";
import { randomUUID } from "node:crypto";
import { createDatabaseClient } from "../src/client.js";
import { ReviewMappedStore } from "../src/review-mapped-store.js";
import {
  migrateReviewMappedDatabase,
  rollbackReviewMappedDatabase,
  migrateStage3Database,
  rollbackStage3DatabaseForTest,
} from "../src/migrations.js";
import { seedStage3Fixture } from "../src/seed.js";
import { DatabaseAnimeRepository } from "../src/database-anime-repository.js";
import { reviewDigest } from "../src/review-mapped-store.js";

const url = process.env.TEST_DATABASE_URL;
if (
  !url ||
  new URL(url).hostname !== "127.0.0.1" ||
  !/^\/menghuan_stage5_test_(?:mapping|real)_[a-z0-9_]+$/.test(new URL(url).pathname)
)
  throw new Error("Dedicated mapping test database required");
const client = createDatabaseClient(url);
const store = new ReviewMappedStore(client.sql);
const fixtures = createReviewFixtures();
beforeAll(async () => {
  await migrateReviewMappedDatabase(client.sql);
  await store.startTestSession(fixtures.sessionId);
});
afterAll(async () => {
  try {
    await rollbackReviewMappedDatabase(client.sql);
  } finally {
    await client.close();
  }
});
it("saved observations never auto-map or become public pages", async () => {
  await store.saveObservation(fixtures.sessionId, fixtures.observations[0]);
  expect(await store.listObservations(fixtures.sessionId)).toHaveLength(1);
  expect(await store.adoptedPages()).toEqual([]);
});
it("explicit mapping adopts only selected fields and preserves verified title conflict", async () => {
  for (const w of fixtures.works) await store.createTestWork(w);
  const [candidate] = await store.listObservations(fixtures.sessionId);
  const mapping = {
    decisionId: randomUUID(),
    sessionId: fixtures.sessionId,
    observationId: candidate!.observation.observationId,
    expectedCandidateVersion: 1,
    expectedDigest: candidate!.digest,
    internalAnimeId: fixtures.works[0]!.id,
    expectedEntityVersion: 1,
    projectMappingKey: randomUUID(),
    reason: "Self-authored explicit identity review",
    evidence: "Separate synthetic internal work worksheet",
    supersedes: null,
  };
  expect(await store.map(mapping)).toBe("mapped");
  expect(await store.map(mapping)).toBe("duplicate");
  expect(await store.adoptedPages()).toEqual([]);
  const adoption = {
    adoptionId: randomUUID(),
    mappingId: mapping.decisionId,
    sessionId: fixtures.sessionId,
    expectedCandidateVersion: 1,
    expectedDigest: candidate!.digest,
    expectedEntityVersion: 1,
    fields: ["title"],
    reason: "Reviewed title conflict",
    resolvesConflicts: false,
  };
  expect(await store.adopt(adoption)).toBe("conflict");
  expect((await store.listWorks(fixtures.sessionId))[0]!.values.title).toBe("人工合成内部作品1");
  expect(await store.adopt({ ...adoption, adoptionId: randomUUID(), fields: ["time"] })).toBe(
    "adopted",
  );
  const [page] = await store.adoptedPages();
  expect(page!.anime.title).toBe("人工合成内部作品1");
  expect(page!.broadcast).toMatchObject({
    sourceOriginalTimeText: "25:15",
    sourceTimezone: null,
    normalizedStartAt: null,
  });
  expect(page!.season).toBeNull();
});
it("rejection is an executable boundary, not only a history label", async () => {
  const observation = fixtures.observations[1]!;
  await store.saveObservation(fixtures.sessionId, observation);
  await store.dispose(
    fixtures.sessionId,
    observation.observationId,
    "rejected",
    "Same title alone is insufficient evidence",
  );
  const candidates = await store.listObservations(fixtures.sessionId);
  const candidate = candidates.find(
    (c) => c.observation.observationId === observation.observationId,
  )!;
  await expect(
    store.map({
      decisionId: randomUUID(),
      sessionId: fixtures.sessionId,
      observationId: observation.observationId,
      expectedCandidateVersion: 1,
      expectedDigest: candidate.digest,
      internalAnimeId: fixtures.works[1]!.id,
      expectedEntityVersion: 1,
      projectMappingKey: randomUUID(),
      reason: "Would bypass rejected observation",
      evidence: "Synthetic test negative case",
      supersedes: null,
    }),
  ).rejects.toThrow("rejected");
});

async function scenario() {
  const observation = {
    ...structuredClone(fixtures.observations[0]!),
    observationId: randomUUID(),
    snapshotId: randomUUID(),
  };
  const id = `review-${randomUUID()}`;
  const work = { ...structuredClone(fixtures.works[0]!), id, slug: id };
  await store.createTestWork(work);
  await store.saveObservation(fixtures.sessionId, observation);
  const mapping = {
    decisionId: randomUUID(),
    sessionId: fixtures.sessionId,
    observationId: observation.observationId,
    expectedCandidateVersion: 1,
    expectedDigest: reviewDigest(observation),
    internalAnimeId: id,
    expectedEntityVersion: 1,
    projectMappingKey: randomUUID(),
    reason: "Authored explicit identity review",
    evidence: "Distinct synthetic work worksheet reference",
    supersedes: null,
  };
  const adoption = {
    adoptionId: randomUUID(),
    mappingId: mapping.decisionId,
    sessionId: fixtures.sessionId,
    expectedCandidateVersion: 1,
    expectedDigest: reviewDigest(observation),
    expectedEntityVersion: 1,
    fields: ["title", "date", "time", "timezone", "year", "quarter", "status"],
    reason: "Explicit synthetic field review",
    resolvesConflicts: true,
  };
  return { observation, work, mapping, adoption };
}
it("same-title observations and shuffled ordinals remain unassociated until explicit decisions", async () => {
  const a = await scenario();
  const b = await scenario();
  b.observation.fields.title = a.observation.fields.title;
  b.observation.version = 2;
  b.observation.ordinal = 3;
  await store.saveObservation(fixtures.sessionId, syncReviewProvenance(b.observation));
  const history = await store.history(fixtures.sessionId);
  expect(
    history.mappings.some(
      (m) =>
        m.observation_id === a.observation.observationId ||
        m.observation_id === b.observation.observationId,
    ),
  ).toBe(false);
});
it("candidate changes invalidate stale decisions and are saved with a new version", async () => {
  const c = await scenario();
  const changed = structuredClone(c.observation);
  changed.version = 2;
  changed.fields.title = "合成修订标题";
  await store.saveObservation(fixtures.sessionId, syncReviewProvenance(changed));
  await expect(store.map(c.mapping)).rejects.toThrow("Candidate changed");
  expect(
    (await store.listObservations(fixtures.sessionId)).find(
      (o) => o.observation.observationId === changed.observationId,
    )!.version,
  ).toBe(2);
});
it("entity changes invalidate an already reviewed adoption; the same decision is idempotent", async () => {
  const c = await scenario();
  await store.map(c.mapping);
  expect(await store.adopt(c.adoption)).toBe("adopted");
  expect(await store.adopt(c.adoption)).toBe("duplicate");
  await expect(store.adopt({ ...c.adoption, adoptionId: randomUUID() })).rejects.toThrow(
    "Internal entity changed",
  );
  expect((await store.listWorks(fixtures.sessionId)).find((w) => w.id === c.work.id)!.version).toBe(
    2,
  );
});
it("concurrent mapping submissions have one winner and preserve one active mapping", async () => {
  const c = await scenario();
  const results = await Promise.allSettled([
    store.map(c.mapping),
    store.map({ ...c.mapping, decisionId: randomUUID() }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(
    (await store.history(fixtures.sessionId)).mappings.filter(
      (m) => m.observation_id === c.observation.observationId && m.status === "approved",
    ),
  ).toHaveLength(1);
});
it("explicit reschedule stays on the chosen entity, creates conflict, and old withdrawal cannot overwrite its later contribution", async () => {
  const c = await scenario();
  await store.map(c.mapping);
  await store.adopt(c.adoption);
  const revision = {
    ...structuredClone(c.observation),
    observationId: randomUUID(),
    snapshotId: randomUUID(),
  };
  revision.fields.releaseDate = { rawText: "2026-10-05", normalizedDate: "2026-10-05" };
  revision.fields.broadcast.rawDateText = "2026-10-05";
  revision.fields.broadcast.originalExpression = "2026-10-05 25:15 Asia/Tokyo";
  Object.assign(revision, syncReviewProvenance(revision));
  await store.saveObservation(fixtures.sessionId, revision);
  const second = {
    ...c.mapping,
    decisionId: randomUUID(),
    observationId: revision.observationId,
    expectedDigest: reviewDigest(revision),
    expectedEntityVersion: 2,
  };
  await store.map(second);
  const reschedule = {
    ...c.adoption,
    adoptionId: randomUUID(),
    mappingId: second.decisionId,
    expectedDigest: reviewDigest(revision),
    expectedEntityVersion: 2,
    fields: ["date"],
    resolvesConflicts: false,
  };
  expect(await store.adopt(reschedule)).toBe("conflict");
  expect(
    (await store.listWorks(fixtures.sessionId)).find((w) => w.id === c.work.id)!.values.date
      .normalized,
  ).toBe("2026-10-04");
  await store.adopt({ ...reschedule, adoptionId: randomUUID(), resolvesConflicts: true });
  await store.withdraw(
    fixtures.sessionId,
    c.mapping.decisionId,
    "Withdraw older wrong mapping contribution",
  );
  const work = (await store.listWorks(fixtures.sessionId)).find((w) => w.id === c.work.id)!;
  expect(work.values.date.normalized).toBe("2026-10-05");
  expect(work.values.time.raw).toBeNull();
  await store.withdraw(fixtures.sessionId, second.decisionId, "Withdraw later adoption separately");
  expect(
    (await store.listWorks(fixtures.sessionId)).find((w) => w.id === c.work.id)!.values.date
      .normalized,
  ).toBeNull();
  expect((await store.adoptedPages()).some((p) => p.anime.id === c.work.id)).toBe(false);
});
it("a real mid-transaction failure rolls back the decision, contributions and entity together", async () => {
  const c = await scenario();
  await store.map(c.mapping);
  await client.sql
    .unsafe(`CREATE FUNCTION stage5_review_fail_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='${c.work.id}' THEN RAISE EXCEPTION 'injected final-write failure'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER stage5_review_fail_trigger BEFORE UPDATE ON stage5_review_works FOR EACH ROW EXECUTE FUNCTION stage5_review_fail_test();`);
  try {
    await expect(store.adopt(c.adoption)).rejects.toThrow("injected final-write failure");
    expect(
      (await store.history(fixtures.sessionId)).adoptions.some(
        (a) => a.id === c.adoption.adoptionId,
      ),
    ).toBe(false);
    expect(
      (await store.listWorks(fixtures.sessionId)).find((w) => w.id === c.work.id)!.version,
    ).toBe(1);
  } finally {
    await client.sql.unsafe(
      "DROP TRIGGER stage5_review_fail_trigger ON stage5_review_works; DROP FUNCTION stage5_review_fail_test();",
    );
  }
});
it("strict input and database whitelist reject forbidden fields without changing saved data", async () => {
  const c = await scenario();
  await expect(
    store.saveObservation(fixtures.sessionId, { ...c.observation, body: "not allowed" }),
  ).rejects.toThrow();
  await store.map(c.mapping);
  await expect(store.adopt({ ...c.adoption, fields: ["synopsis"] })).rejects.toThrow();
  await expect(
    client.sql`update stage5_review_observations set payload=payload || '{"image":"forbidden"}'::jsonb where id=${c.observation.observationId}`,
  ).rejects.toThrow();
  expect(
    (await store.listObservations(fixtures.sessionId)).find(
      (o) => o.observation.observationId === c.observation.observationId,
    )!.digest,
  ).toBe(reviewDigest(c.observation));
});
it("source disabling blocks new import and adoption, retains adopted pages and permits separate withdrawal", async () => {
  const c = await scenario();
  await store.map(c.mapping);
  await store.adopt(c.adoption);
  await store.setEnabled(fixtures.sessionId, false);
  try {
    await expect(
      store.saveObservation(fixtures.sessionId, { ...c.observation, observationId: randomUUID() }),
    ).rejects.toThrow("disabled");
    expect(
      (await store.adoptedPages()).find((p) => p.anime.id === c.work.id)!.reviewSource!
        .sourceEnabled,
    ).toBe(false);
    await store.withdraw(
      fixtures.sessionId,
      c.mapping.decisionId,
      "Separate withdrawal while source off",
    );
    expect((await store.adoptedPages()).some((p) => p.anime.id === c.work.id)).toBe(false);
  } finally {
    await store.setEnabled(fixtures.sessionId, true);
  }
});
it("unknown context stays unknown; known 25:15 normalizes across midnight without replacing its original", async () => {
  const c = await scenario();
  await store.map(c.mapping);
  await store.adopt(c.adoption);
  const page = (await store.adoptedPages()).find((p) => p.anime.id === c.work.id)!;
  expect(page.broadcast).toMatchObject({
    sourceOriginalTimeText: "25:15",
    normalizedStartAt: "2026-10-04T16:15:00.000Z",
  });
  const unknown = await scenario();
  unknown.observation.version = 2;
  unknown.observation.fields = {
    ...structuredClone(fixtures.observations[1]!.fields),
    title: "合成时区未知",
  };
  Object.assign(unknown.observation, syncReviewProvenance(unknown.observation));
  await store.saveObservation(fixtures.sessionId, unknown.observation);
  const mapping = {
    ...unknown.mapping,
    expectedCandidateVersion: 2,
    expectedDigest: reviewDigest(unknown.observation),
  };
  await store.map(mapping);
  await store.adopt({
    ...unknown.adoption,
    expectedCandidateVersion: 2,
    expectedDigest: mapping.expectedDigest,
  });
  const unknownPage = (await store.adoptedPages()).find((p) => p.anime.id === unknown.work.id)!;
  expect(unknownPage.season).toBeNull();
  expect(unknownPage.broadcast?.normalizedStartAt).toBeNull();
});
it("incorrect mapping is corrected by a new decision with history and leaves the unrelated work intact", async () => {
  const c = await scenario();
  await store.map(c.mapping);
  await store.adopt(c.adoption);
  const other = await scenario();
  await store.withdraw(
    fixtures.sessionId,
    c.mapping.decisionId,
    "Incorrect synthetic identity; preserve history",
  );
  const corrected = {
    ...c.mapping,
    decisionId: randomUUID(),
    internalAnimeId: other.work.id,
    expectedEntityVersion: 1,
    supersedes: c.mapping.decisionId,
  };
  await store.map(corrected);
  expect(
    (await store.listWorks(fixtures.sessionId)).find((w) => w.id === other.work.id)!.values,
  ).toEqual(other.work.values);
  const history = await store.history(fixtures.sessionId);
  expect(history.mappings.find((m) => m.id === c.mapping.decisionId)!.status).toBe("revoked");
  expect(history.mappings.find((m) => m.id === corrected.decisionId)!.status).toBe("approved");
});
it("additive migration is repeatable and its rollback preserves foundational records byte-for-byte", async () => {
  const journal = `review_rollback_${Date.now()}`;
  await migrateStage3Database(client.db, { migrationsSchema: journal });
  await seedStage3Fixture(client.db);
  const repository = new DatabaseAnimeRepository(client.db);
  const before = await repository.listAnime();
  expect(before).toHaveLength(10);
  try {
    await migrateReviewMappedDatabase(client.sql);
    await rollbackReviewMappedDatabase(client.sql);
    expect(await repository.listAnime()).toEqual(before);
    await migrateReviewMappedDatabase(client.sql);
    expect(await repository.listAnime()).toEqual(before);
  } finally {
    await rollbackStage3DatabaseForTest(client.sql);
    await client.sql.unsafe(`DROP SCHEMA IF EXISTS "${journal}" CASCADE`);
  }
});
