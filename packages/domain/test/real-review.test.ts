import { expect, it } from "vitest";
import {
  createRealObservation,
  realObservationSchema,
  realSessionSchema,
} from "../src/sources/real-review.js";
import { parseYucRealPage, reviewObservationSchema } from "../src/index.js";
import { YUC_OBSERVED_SYNTHETIC_HTML } from "../src/fixtures/yuc-observed.js";
const sessionId = "10000000-0000-4000-8000-000000000001",
  snapshotId = "10000000-0000-4000-8000-000000000002";
it("synthetic content tests the separate real-local contract without becoming a real observation", () => {
  const candidate = parseYucRealPage(YUC_OBSERVED_SYNTHETIC_HTML, {
    sourceUrl: "https://yuc.wiki/202610/",
    observedAt: "2026-10-05T00:00:00.000Z",
  }).candidates[0]!;
  const o = createRealObservation(candidate, {
    sessionId,
    snapshotId,
    observationId: "10000000-0000-4000-8000-000000000003",
    testContent: true,
  });
  expect(o.dataNature).toBe("synthetic-path-test");
  expect(o.fields.broadcast.rawTimezoneText).toBeNull();
  expect(o.provenance.find((p) => p.field === "time")!.rawValue).toBe(
    o.fields.broadcast.rawTimeText,
  );
  expect(() => reviewObservationSchema.parse(o)).toThrow();
  const wrong = structuredClone(o);
  wrong.provenance[0]!.capturedAt = "2026-10-04T00:00:00.000Z";
  expect(() => realObservationSchema.parse(wrong)).toThrow();
});
it("local scope requires a finite seven-day session, no public permission and source disabled initially", () => {
  const scope = {
    id: sessionId,
    purpose: "local-noncommercial-evaluation",
    dataNature: "real",
    approvedPage: "https://yuc.wiki/202610/",
    createdAt: "2026-10-05T00:00:00.000Z",
    expiresAt: "2026-10-12T00:00:00.000Z",
    enabled: false,
    publicDisplay: false,
    actor: "Codex engineering review",
  };
  expect(realSessionSchema.parse(scope).enabled).toBe(false);
  expect(() =>
    realSessionSchema.parse({ ...scope, expiresAt: "2026-10-13T00:00:00.000Z" }),
  ).toThrow();
  expect(() => realSessionSchema.parse({ ...scope, publicDisplay: true })).toThrow();
});
