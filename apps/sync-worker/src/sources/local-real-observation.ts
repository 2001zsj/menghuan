import { randomUUID } from "node:crypto";
import {
  realSessionSchema,
  createRealObservation,
  parseYucRealPage,
  REAL_PAGE,
} from "@menghuan/domain";
import { YucNodeAcquisition } from "./yuc-fetch.js";
/** One approved response only. No persistence, automatic identity or field adoption. */
export async function observeLocalReal(acquisition: YucNodeAcquisition, input: unknown) {
  const scope = realSessionSchema.parse(input);
  if (
    scope.dataNature !== "real" ||
    Date.parse(scope.expiresAt) <= Date.now() ||
    Date.parse(scope.createdAt) > Date.now()
  )
    throw new Error("Current explicit real local scope required");
  let body = "";
  try {
    body = (await acquisition.fetch(REAL_PAGE, new AbortController().signal)).body;
    if (
      /<title[^>]*>[^<]*(?:captcha|access denied|just a moment)|cf-chl-|g-recaptcha|h-captcha|访问受限|访问被拒绝/i.test(
        body,
      )
    )
      throw new Error("Access restriction response; stop entire observation");
    const observedAt = new Date().toISOString(),
      snapshotId = randomUUID();
    return parseYucRealPage(body, { sourceUrl: REAL_PAGE, observedAt, limit: 3 }).candidates.map(
      (c) =>
        createRealObservation(c, {
          sessionId: scope.id,
          snapshotId,
          observationId: randomUUID(),
          testContent: false,
        }),
    );
  } finally {
    body = "";
  }
}
