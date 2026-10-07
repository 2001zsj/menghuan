import { expect, it } from "vitest";
import { createSyntheticFlowSamples } from "../src/sources/synthetic-flow.js";

it("synthetic samples carry explicit provenance and preserve late-night time", () => {
  const samples = createSyntheticFlowSamples();
  expect(samples).toHaveLength(3);
  expect(
    samples.every((s) => s.kind === "synthetic" && s.page.syntheticSource?.kind === "synthetic"),
  ).toBe(true);
  expect(samples[1]?.record.fields.broadcast.rawTimeText).toBe("25:15");
  expect(samples[1]?.page.broadcast?.sourceOriginalTimeText).toBe("25:15");
});
