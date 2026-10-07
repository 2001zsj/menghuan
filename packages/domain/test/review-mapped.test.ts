import { expect, it } from "vitest";
import { reviewObservationSchema } from "../src/sources/review-mapped.js";
import { createReviewFixtures } from "../src/fixtures/review-mapped.js";

it("synthetic observation has nullable website identity and rejects body fields", () => {
  const observation = createReviewFixtures().observations[0]!;
  expect(reviewObservationSchema.parse(observation).sourceEntityId).toBeNull();
  expect(() => reviewObservationSchema.parse({ ...observation, body: "not permitted" })).toThrow();
  expect(() => reviewObservationSchema.parse({ ...observation, dataNature: "real" })).toThrow();
});
it("invalid dates, invented year, invalid timezone and inconsistent extended-hour values are rejected", () => {
  const original = createReviewFixtures().observations[0]!;
  for (const mutate of [
    (o: typeof original) => {
      o.fields.releaseDate = { rawText: "2026-02-30", normalizedDate: "2026-02-30" };
      o.fields.broadcast.rawDateText = "2026-02-30";
    },
    (o: typeof original) => {
      o.fields.broadcast.rawTimezoneText = "Not/AZone";
    },
    (o: typeof original) => {
      o.fields.season.rawYearText = null;
    },
    (o: typeof original) => {
      o.fields.broadcast.parsedTime!.dayOffset = 0;
    },
    (o: typeof original) => {
      Object.assign(o.fields.broadcast, { synopsis: "forbidden" });
    },
  ]) {
    const changed = structuredClone(original);
    mutate(changed);
    expect(() => reviewObservationSchema.parse(changed)).toThrow();
  }
});
