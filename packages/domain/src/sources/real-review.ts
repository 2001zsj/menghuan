import { z } from "zod";
import {
  reviewObservationBaseSchema,
  validateReviewObservation,
  reviewFieldEvidence,
  reviewFieldSchema,
  reviewValuesSchema,
} from "./review-mapped.js";
import { yucObservedCandidateSchema, type YucObservedCandidate } from "./yuc-real.js";
export const REAL_PAGE = "https://yuc.wiki/202610/" as const;
export const realSessionSchema = z
  .object({
    id: z.uuid(),
    purpose: z.literal("local-noncommercial-evaluation"),
    dataNature: z.enum(["real", "synthetic-path-test"]),
    approvedPage: z.literal(REAL_PAGE),
    createdAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    enabled: z.literal(false),
    publicDisplay: z.literal(false),
    actor: z.literal("Codex engineering review"),
  })
  .strict()
  .refine(
    (v) =>
      Date.parse(v.expiresAt) > Date.parse(v.createdAt) &&
      Date.parse(v.expiresAt) - Date.parse(v.createdAt) <= 7 * 86400000,
    "At most seven-day retention",
  );
export const realObservationSchema = z
  .object({
    ...reviewObservationBaseSchema.shape,
    dataNature: z.enum(["real", "synthetic-path-test"]),
    parserVersion: z.literal("yuc-observed-dom-v1"),
    publicVisibility: z.literal("local-only"),
    provenance: z
      .array(
        z
          .object({
            field: reviewFieldSchema,
            sourcePageUrl: z.literal(REAL_PAGE),
            rawValue: z.string().max(500).nullable(),
            normalizedValue: z.string().max(500).nullable(),
            sourceSelector: z.string().min(1).max(3000),
            capturedAt: z.iso.datetime(),
            basis: z.enum([
              "explicit entry field",
              "absent in approved entry",
              "derived from explicit entry fields",
            ]),
          })
          .strict(),
      )
      .length(7),
  })
  .strict()
  .superRefine(validateReviewObservation)
  .superRefine((v, c) => {
    for (const p of v.provenance) {
      if (p.capturedAt !== v.observedAt)
        c.addIssue({ code: "custom", message: "Observation/provenance time mismatch" });
      if (p.rawValue === null && p.basis !== "absent in approved entry")
        c.addIssue({ code: "custom", message: "Absent evidence must remain explicitly absent" });
      if (p.field !== "status" && p.rawValue !== null && p.basis !== "explicit entry field")
        c.addIssue({
          code: "custom",
          message: "Non-derived field requires explicit entry evidence",
        });
    }
  });
export type RealObservation = z.infer<typeof realObservationSchema>;
export function createRealObservation(
  input: YucObservedCandidate,
  ids: { sessionId: string; snapshotId: string; observationId: string; testContent: boolean },
): RealObservation {
  const c = yucObservedCandidateSchema.parse(input),
    e = reviewFieldEvidence(c.fields);
  const selectors = {
    title: "title",
    date: "releaseDate",
    time: "broadcast",
    timezone: "broadcast",
    year: "season",
    quarter: "season",
    status: "broadcast",
  } as const;
  return realObservationSchema.parse({
    observationId: ids.observationId,
    snapshotId: ids.snapshotId,
    sessionId: ids.sessionId,
    version: 1,
    dataNature: ids.testContent ? "synthetic-path-test" : "real",
    sourceEntityId: null,
    sourcePageUrl: REAL_PAGE,
    observedAt: c.observedAt,
    parserVersion: c.parserVersion,
    ordinal: c.observationOrdinal,
    publicVisibility: "local-only",
    fields: c.fields,
    provenance: Object.entries(e).map(([field, value]) => ({
      field,
      ...value,
      sourcePageUrl: REAL_PAGE,
      capturedAt: c.observedAt,
      sourceSelector: c.provenance.find(
        (p) => p.field === selectors[field as keyof typeof selectors],
      )!.sourceSelector,
      basis:
        value.rawValue === null
          ? "absent in approved entry"
          : field === "status"
            ? "derived from explicit entry fields"
            : "explicit entry field",
    })),
  });
}
export const realWorkSchema = z
  .object({
    id: z.string().regex(/^real-local-[a-f0-9-]{36}$/),
    slug: z.string().regex(/^real-local-[a-f0-9-]{36}$/),
    sessionId: z.uuid(),
    dataNature: z.enum(["real", "synthetic-path-test"]),
    values: reviewValuesSchema,
    originObservationId: z.uuid(),
    identityScope: z.literal("single approved snapshot entry; not global verified identity"),
    reviewer: z.literal("Codex engineering review"),
    evidence: z.string().min(5).max(500),
  })
  .strict();
export type RealWork = z.infer<typeof realWorkSchema>;
