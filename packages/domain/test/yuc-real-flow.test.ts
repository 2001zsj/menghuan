import { expect, it } from "vitest";
import { createObservedSyntheticFlowSamples } from "../src/index";
it("only authored anonymous-shape candidates receive explicit local synthetic mappings", () => {
  const samples = createObservedSyntheticFlowSamples();
  expect(samples).toHaveLength(3);
  expect(samples[0]!.record.fields.title).toBe("合成作品1");
  expect(samples[0]!.record.fields.broadcast).toMatchObject({
    rawTimeText: "25:15",
    rawTimezoneText: null,
    timeStatus: "unknown",
    normalizedStartAt: null,
  });
  expect(samples[0]!.page.broadcast).toMatchObject({
    sourceOriginalTimeText: "25:15",
    sourceTimezone: null,
    normalizedStartAt: null,
  });
  expect(samples[0]!.page.syntheticSource!.mappingReason).toContain("显式");
  expect(samples[0]!.page.season).toBeNull();
});
