import {
  reviewObservationSchema,
  reviewWorkSchema,
  type ReviewField,
  reviewFieldEvidence,
} from "../sources/review-mapped.js";
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const REVIEW_TEST_SESSION = uid(1);
export function createReviewFixtures() {
  const names = ["审核星灯：特别长的合成标题与跨日旅程", "同名合成作品", "同名合成作品"];
  const observations = names.map((title, i) =>
    syncReviewProvenance({
      observationId: uid(10 + i),
      snapshotId: uid(2),
      sessionId: REVIEW_TEST_SESSION,
      version: 1,
      dataNature: "synthetic-test",
      sourceEntityId: null,
      sourcePageUrl: "https://yuc.wiki/202610/",
      observedAt: "2026-10-04T00:00:00.000Z",
      parserVersion: "authored-review-fixture-v1",
      ordinal: i + 1,
      fields: {
        title,
        releaseDate: {
          rawText: i === 0 ? "2026-10-04" : null,
          normalizedDate: i === 0 ? "2026-10-04" : null,
        },
        broadcast: {
          rawDateText: i === 0 ? "2026-10-04" : null,
          rawTimeText: i === 0 ? "25:15" : null,
          rawTimezoneText: i === 0 ? "Asia/Tokyo" : null,
          originalExpression: i === 0 ? "2026-10-04 25:15 Asia/Tokyo" : "日期、时间和时区未知",
          parsedTime: i === 0 ? { hour: 1, minute: 15, dayOffset: 1 } : null,
          normalizedStartAt: null,
          timeStatus: i === 0 ? "known" : "unknown",
        },
        season: {
          rawYearText: i === 0 ? "2026" : null,
          rawQuarterText: i === 0 ? "autumn" : null,
          year: i === 0 ? 2026 : null,
          quarter: i === 0 ? "autumn" : null,
        },
      },
      provenance: (
        ["title", "date", "time", "timezone", "year", "quarter", "status"] as ReviewField[]
      ).map((field) => ({
        field,
        sourcePageUrl: "https://yuc.wiki/202610/",
        rawValue: null,
        normalizedValue: null,
        basis: "self-authored synthetic observation",
      })),
    }),
  );
  const works = names.map((_, i) =>
    reviewWorkSchema.parse({
      id: `review-work-${i + 1}`,
      slug: `review-work-${i + 1}`,
      sessionId: REVIEW_TEST_SESSION,
      dataNature: "synthetic-test",
      values: {
        title: `人工合成内部作品${i + 1}`,
        date: { raw: null, normalized: null },
        time: { raw: null, parsed: null },
        timezone: null,
        year: null,
        quarter: null,
        status: "unknown",
      },
    }),
  );
  return { sessionId: REVIEW_TEST_SESSION, observations, works };
}

/** Authored fixture helper only; production storage validates and never repairs input. */
export function syncReviewProvenance(input: unknown) {
  const value = structuredClone(input) as ReturnType<typeof reviewObservationSchema.parse>;
  const evidence = reviewFieldEvidence(value.fields);
  value.provenance = value.provenance.map((p) => ({ ...p, ...evidence[p.field] }));
  return reviewObservationSchema.parse(value);
}

/** A separately authored calendar scenario, not inferred from the planned source URL. */
export function createReviewDiscoveryFixture() {
  const original = createReviewFixtures();
  const observation = structuredClone(original.observations[0]!);
  observation.observationId = uid(30);
  observation.snapshotId = uid(31);
  observation.fields.title = "合成审核今日跨日演示";
  observation.fields.releaseDate = { rawText: "2026-07-26", normalizedDate: "2026-07-26" };
  observation.fields.broadcast.rawDateText = "2026-07-26";
  observation.fields.broadcast.originalExpression = "2026-07-26 25:15 Asia/Tokyo";
  observation.fields.season = {
    rawYearText: "2026",
    rawQuarterText: "summer",
    year: 2026,
    quarter: "summer",
  };
  return {
    observation: syncReviewProvenance(observation),
    work: reviewWorkSchema.parse({
      ...original.works[0]!,
      id: "review-discovery-demo",
      slug: "review-discovery-demo",
    }),
  };
}
