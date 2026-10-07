import { randomUUID } from "node:crypto";
import { getServerEnvironment } from "@menghuan/config";
import {
  createReviewFixtures,
  createReviewDiscoveryFixture,
  REVIEW_TEST_SESSION,
  syncReviewProvenance,
} from "@menghuan/domain";
import { createDatabaseClient } from "../client.js";
import { ReviewMappedStore } from "../review-mapped-store.js";
import { migrateReviewMappedDatabase } from "../migrations.js";

const env = getServerEnvironment();
if (
  env.MENGHUAN_REVIEW_MODE !== "synthetic-test" ||
  !env.MENGHUAN_REVIEW_DATABASE_URL ||
  !process.argv.includes("--synthetic-test")
)
  throw new Error(
    "Explicit --synthetic-test, local review mode and mapping database required; arbitrary JSON/real import is not supported",
  );
const client = createDatabaseClient(env.MENGHUAN_REVIEW_DATABASE_URL, {
  applicationName: "menghuan-review-test-cli",
});
const store = new ReviewMappedStore(client.sql);
const [action, ...args] = process.argv.slice(2).filter((a) => a !== "--synthetic-test");
const requireArg = (i: number, name: string) => {
  const v = args[i];
  if (!v) throw new Error(`Missing ${name}; use list/diff to review current versions`);
  return v;
};
try {
  switch (action) {
    case "init": {
      await migrateReviewMappedDatabase(client.sql);
      await store.startTestSession(REVIEW_TEST_SESSION);
      await store.setEnabled(REVIEW_TEST_SESSION, true);
      const f = createReviewFixtures();
      for (const w of f.works) await store.createTestWork(w);
      for (const o of f.observations) await store.saveObservation(f.sessionId, o);
      console.log("Authored synthetic session initialized; no fields adopted");
      break;
    }
    case "list":
      console.log(
        JSON.stringify(
          {
            observations: await store.listObservations(REVIEW_TEST_SESSION),
            works: await store.listWorks(REVIEW_TEST_SESSION),
            history: await store.history(REVIEW_TEST_SESSION),
          },
          null,
          2,
        ),
      );
      break;
    case "diff": {
      const candidate = (await store.listObservations(REVIEW_TEST_SESSION)).find(
        (c) => c.observation.observationId === requireArg(0, "observationId"),
      );
      const work = (await store.listWorks(REVIEW_TEST_SESSION)).find(
        (w) => w.id === requireArg(1, "internalAnimeId"),
      );
      if (!candidate || !work) throw new Error("Candidate or work missing");
      console.log(JSON.stringify({ candidate, work }, null, 2));
      break;
    }
    case "calendar-demo": {
      const f = createReviewDiscoveryFixture();
      await store.createTestWork(f.work);
      await store.saveObservation(REVIEW_TEST_SESSION, f.observation);
      console.log(
        "Separate authored calendar observation saved; explicit map/adopt still required",
      );
      break;
    }
    case "reschedule-demo": {
      const observation = structuredClone(createReviewFixtures().observations[0]!);
      observation.observationId = randomUUID();
      observation.snapshotId = randomUUID();
      observation.fields.releaseDate = { rawText: "2026-10-05", normalizedDate: "2026-10-05" };
      observation.fields.broadcast.rawDateText = "2026-10-05";
      observation.fields.broadcast.originalExpression = "2026-10-05 25:15 Asia/Tokyo";
      await store.saveObservation(REVIEW_TEST_SESSION, syncReviewProvenance(observation));
      console.log(
        JSON.stringify({
          observationId: observation.observationId,
          message:
            "Authored reschedule saved. Choose the same internal entity explicitly; conflicts are not auto-resolved.",
        }),
      );
      break;
    }
    case "map":
      console.log(
        await store.map({
          decisionId: requireArg(0, "decisionId"),
          sessionId: REVIEW_TEST_SESSION,
          observationId: requireArg(1, "observationId"),
          expectedCandidateVersion: Number(requireArg(2, "candidateVersion")),
          expectedDigest: requireArg(3, "candidateDigest"),
          internalAnimeId: requireArg(4, "internalAnimeId"),
          expectedEntityVersion: Number(requireArg(5, "entityVersion")),
          projectMappingKey: requireArg(6, "projectMappingKey"),
          reason: requireArg(7, "reason"),
          evidence: requireArg(8, "identityEvidence"),
          supersedes: args[9] ?? null,
        }),
      );
      break;
    case "adopt":
      console.log(
        await store.adopt({
          adoptionId: requireArg(0, "adoptionId"),
          sessionId: REVIEW_TEST_SESSION,
          mappingId: requireArg(1, "mappingId"),
          expectedCandidateVersion: Number(requireArg(2, "candidateVersion")),
          expectedDigest: requireArg(3, "candidateDigest"),
          expectedEntityVersion: Number(requireArg(4, "entityVersion")),
          fields: requireArg(5, "comma-separated fields").split(","),
          reason: requireArg(6, "reason"),
          resolvesConflicts: args[7] === "resolve",
        }),
      );
      break;
    case "reject":
    case "hold":
      await store.dispose(
        REVIEW_TEST_SESSION,
        requireArg(0, "observationId"),
        action === "reject" ? "rejected" : "pending",
        requireArg(1, "reason"),
      );
      console.log(action);
      break;
    case "withdraw":
      await store.withdraw(
        REVIEW_TEST_SESSION,
        requireArg(0, "mappingId"),
        requireArg(1, "reason"),
      );
      console.log("withdrawn");
      break;
    case "off":
    case "on":
      await store.setEnabled(REVIEW_TEST_SESSION, action === "on");
      console.log(action);
      break;
    case "uuid":
      console.log(randomUUID());
      break;
    default:
      throw new Error(
        "Commands: init/list/diff/map/adopt/reject/hold/withdraw/off/on/uuid. No file-import or real-source command.",
      );
  }
} finally {
  await client.close();
}
