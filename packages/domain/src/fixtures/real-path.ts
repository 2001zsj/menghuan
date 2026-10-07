import { YUC_OBSERVED_SYNTHETIC_HTML } from "./yuc-observed.js";
import { parseYucRealPage } from "../sources/yuc-real.js";
import { createRealObservation, REAL_PAGE } from "../sources/real-review.js";
export const REAL_PATH_TEST_SESSION = "20000000-0000-4000-8000-000000000001";
export const REAL_PATH_TEST_WORK = "real-local-20000000-0000-4000-8000-000000000010";
export function createRealPathFixtures(sessionId: string, observedAt: string) {
  return parseYucRealPage(YUC_OBSERVED_SYNTHETIC_HTML, {
    sourceUrl: REAL_PAGE,
    observedAt,
  }).candidates.map((c, i) =>
    createRealObservation(c, {
      sessionId,
      snapshotId: "20000000-0000-4000-8000-000000000002",
      observationId: `20000000-0000-4000-8000-${String(i + 3).padStart(12, "0")}`,
      testContent: true,
    }),
  );
}
