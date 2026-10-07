import { expect, it } from "vitest";
import { createReviewFixtures, reviewObservationSchema } from "../src/index.js";

it("provenance contains the actual raw and normalized field values, never placeholders", () => {
  const o = createReviewFixtures().observations[0]!;
  expect(o.provenance.find((p) => p.field === "title")!.rawValue).toBe(o.fields.title);
  expect(o.provenance.find((p) => p.field === "time")!.rawValue).toBe("25:15");
  expect(o.provenance.find((p) => p.field === "time")!.normalizedValue).toBe(
    '{"hour":1,"minute":15,"dayOffset":1}',
  );
  const wrong = structuredClone(o);
  wrong.provenance[0]!.rawValue = "stale previous title";
  expect(() => reviewObservationSchema.parse(wrong)).toThrow();
});
