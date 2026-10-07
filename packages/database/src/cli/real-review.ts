import { randomUUID } from "node:crypto";
import { getServerEnvironment } from "@menghuan/config";
import { createRealPathFixtures, realObservationSchema, reviewFieldValues } from "@menghuan/domain";
import { createRealReviewClient, RealReviewStore } from "../real-review-store.js";
import { migrateRealReviewDatabase } from "../migrations.js";
import { assertLocalDatabase } from "../local-identity.js";
const e = getServerEnvironment();
if (
  e.APP_ENV !== "local" ||
  e.MENGHUAN_REAL_REVIEW_MODE !== "local-evaluation" ||
  !e.MENGHUAN_REAL_REVIEW_DATABASE_URL ||
  !e.MENGHUAN_REAL_REVIEW_SESSION_ID ||
  !process.argv.includes("--local-evaluation")
)
  throw new Error(
    "Explicit local-evaluation mode, session, dedicated database and CLI flag required",
  );
const client = createRealReviewClient(e.MENGHUAN_REAL_REVIEW_DATABASE_URL),
  name = new URL(e.MENGHUAN_REAL_REVIEW_DATABASE_URL).pathname.slice(1),
  sessionId = e.MENGHUAN_REAL_REVIEW_SESSION_ID;
const store = new RealReviewStore(client.sql, name, sessionId),
  testContent = process.argv.includes("--synthetic-path-test");
const [action, ...args] = process.argv
  .slice(2)
  .filter((a) => !["--local-evaluation", "--synthetic-path-test"].includes(a));
const arg = (i: number) => {
  const v = args[i];
  if (!v) throw new Error("Missing explicit review argument");
  return v;
};
try {
  await assertLocalDatabase(client.sql, "real-local", name);
  switch (action) {
    case "init": {
      await migrateRealReviewDatabase(client.sql, name);
      const now = new Date().toISOString();
      await store.startLocalSession({
        id: sessionId,
        purpose: "local-noncommercial-evaluation",
        dataNature: testContent ? "synthetic-path-test" : "real",
        approvedPage: "https://yuc.wiki/202610/",
        createdAt: now,
        expiresAt: new Date(Date.parse(now) + 7 * 86400000).toISOString(),
        enabled: false,
        publicDisplay: false,
        actor: "Codex engineering review",
      });
      console.log(
        JSON.stringify({
          initialized: true,
          enabled: false,
          dataNature: testContent ? "synthetic-path-test" : "real",
          expiresAt: new Date(Date.parse(now) + 7 * 86400000).toISOString(),
        }),
      );
      break;
    }
    case "fixture-load": {
      if (!testContent || (await store.scopeState()).dataNature !== "synthetic-path-test")
        throw new Error("Authored fixture operation cannot enter a real session");
      for (const o of createRealPathFixtures(sessionId, new Date().toISOString()))
        await store.saveObservation(sessionId, o);
      console.log("Three self-authored synthetic-path candidates saved; zero source requests");
      break;
    }
    case "list":
      console.log(
        JSON.stringify({
          scope: await store.scopeState(),
          candidates: (await store.listObservations(sessionId)).map((c) => ({
            observationId: c.observation.observationId,
            version: c.version,
            digest: c.digest,
            ordinal: c.observation.ordinal,
            dataNature: c.observation.dataNature,
          })),
          works: (await store.listWorks(sessionId)).map((w) => ({
            id: w.id,
            slug: w.slug,
            version: w.version,
            adoptedFields: Object.keys(w.owners),
          })),
        }),
      );
      break;
    case "inspect": {
      // Private terminal only. Never include this output in a source/evidence package.
      const c = (await store.listObservations(sessionId)).find(
        (c) => c.observation.observationId === arg(0),
      );
      if (!c) throw new Error("Observation missing");
      console.log(JSON.stringify(c));
      break;
    }
    case "entity": {
      const c = (await store.listObservations(sessionId)).find(
        (c) => c.observation.observationId === arg(0),
      );
      if (!c) throw new Error("Observation missing");
      const o = realObservationSchema.parse(c.observation),
        id = arg(1),
        values = reviewFieldValues(o.fields);
      await store.createLocalWork({
        id,
        slug: id,
        sessionId,
        dataNature: o.dataNature,
        values: {
          ...values,
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
        evidence: arg(2),
      });
      console.log("Temporary snapshot-local identity recorded; no fields automatically adopted");
      break;
    }
    case "map":
      console.log(
        await store.map({
          decisionId: arg(0),
          sessionId,
          observationId: arg(1),
          expectedCandidateVersion: Number(arg(2)),
          expectedDigest: arg(3),
          internalAnimeId: arg(4),
          expectedEntityVersion: Number(arg(5)),
          projectMappingKey: arg(6),
          reason: arg(7),
          evidence: arg(8),
          supersedes: args[9] ?? null,
        }),
      );
      break;
    case "adopt":
      console.log(
        await store.adopt({
          adoptionId: arg(0),
          sessionId,
          mappingId: arg(1),
          expectedCandidateVersion: Number(arg(2)),
          expectedDigest: arg(3),
          expectedEntityVersion: Number(arg(4)),
          fields: arg(5).split(","),
          reason: arg(6),
          resolvesConflicts: args[7] === "resolve",
        }),
      );
      break;
    case "hold":
    case "reject":
      await store.dispose(sessionId, arg(0), action === "hold" ? "pending" : "rejected", arg(1));
      console.log(action);
      break;
    case "withdraw":
      await store.withdraw(sessionId, arg(0), arg(1));
      console.log("withdrawn");
      break;
    case "on":
    case "off":
      await store.setEnabled(sessionId, action === "on");
      console.log(action);
      break;
    case "purge":
      console.log(JSON.stringify(await store.purgeSession()));
      break;
    case "uuid":
      console.log(randomUUID());
      break;
    default:
      throw new Error(
        "init/fixture-load/list/private inspect/entity/map/adopt/hold/reject/withdraw/on/off/purge/uuid only. No URL, file import, GET or scheduler entry.",
      );
  }
} finally {
  await client.close();
}
