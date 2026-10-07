import { z } from "zod";
import { yucCandidateFieldsSchema } from "./yuc.js";
import { domainIdSchema, animeSlugSchema } from "../schemas.js";

const pageUrl = z.literal("https://yuc.wiki/202610/");
export const reviewUuidSchema = z.uuid();
export const reviewReasonSchema = z.string().trim().min(5).max(500);
export const reviewDispositionSchema = z.enum(["pending", "rejected"]);
export const reviewFieldSchema = z.enum([
  "title",
  "date",
  "time",
  "timezone",
  "year",
  "quarter",
  "status",
]);
export type ReviewField = z.infer<typeof reviewFieldSchema>;
export const reviewObservationBaseSchema = z
  .object({
    observationId: z.uuid(),
    snapshotId: z.uuid(),
    version: z.number().int().positive(),
    sessionId: z.uuid(),
    dataNature: z.literal("synthetic-test"),
    sourceEntityId: z.null(),
    sourcePageUrl: pageUrl,
    observedAt: z.iso.datetime(),
    parserVersion: z.literal("authored-review-fixture-v1"),
    ordinal: z.number().int().positive().max(3),
    fields: yucCandidateFieldsSchema,
    provenance: z
      .array(
        z
          .object({
            field: reviewFieldSchema,
            sourcePageUrl: pageUrl,
            rawValue: z.string().max(500).nullable(),
            normalizedValue: z.string().max(500).nullable(),
            basis: z.literal("self-authored synthetic observation"),
          })
          .strict(),
      )
      .length(7),
  })
  .strict();
export function reviewFieldEvidence(f: z.infer<typeof yucCandidateFieldsSchema>) {
  return {
    title: { rawValue: f.title, normalizedValue: f.title },
    date: { rawValue: f.releaseDate.rawText, normalizedValue: f.releaseDate.normalizedDate },
    time: {
      rawValue: f.broadcast.rawTimeText,
      normalizedValue: f.broadcast.parsedTime ? JSON.stringify(f.broadcast.parsedTime) : null,
    },
    timezone: {
      rawValue: f.broadcast.rawTimezoneText,
      normalizedValue: f.broadcast.rawTimezoneText,
    },
    year: {
      rawValue: f.season.rawYearText,
      normalizedValue: f.season.year === null ? null : String(f.season.year),
    },
    quarter: { rawValue: f.season.rawQuarterText, normalizedValue: f.season.quarter },
    status: { rawValue: f.broadcast.timeStatus, normalizedValue: f.broadcast.timeStatus },
  };
}
export function validateReviewObservation(
  v: {
    fields: z.infer<typeof yucCandidateFieldsSchema>;
    provenance: { field: ReviewField; rawValue: string | null; normalizedValue: string | null }[];
  },
  c: z.RefinementCtx,
) {
  if (new Set(v.provenance.map((p) => p.field)).size !== 7)
    c.addIssue({ code: "custom", message: "Every allowed field requires provenance" });
  const expected = reviewFieldEvidence(v.fields);
  for (const p of v.provenance) {
    if (
      p.rawValue !== expected[p.field].rawValue ||
      p.normalizedValue !== expected[p.field].normalizedValue
    )
      c.addIssue({ code: "custom", message: `Provenance differs from actual ${p.field}` });
  }
  const f = v.fields,
    b = f.broadcast,
    s = f.season;
  if (
    [b.rawDateText, b.rawTimeText, b.rawTimezoneText].some(
      (raw) => raw !== null && !b.originalExpression.includes(raw),
    )
  )
    c.addIssue({
      code: "custom",
      message: "Original expression must retain the current explicit raw fields",
    });
  const date = f.releaseDate.normalizedDate;
  if (
    date !== null &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date ||
      f.releaseDate.rawText !== date)
  )
    c.addIssue({
      code: "custom",
      message: "Normalized date requires a valid explicit original date",
    });
  const match = b.rawTimeText?.match(/^([012][0-9]):([0-5][0-9])$/);
  if (
    b.parsedTime &&
    (!match ||
      b.parsedTime.hour !== Number(match[1]) % 24 ||
      b.parsedTime.minute !== Number(match[2]) ||
      b.parsedTime.dayOffset !== Math.floor(Number(match[1]) / 24))
  )
    c.addIssue({
      code: "custom",
      message: "Parsed time must preserve the original extended-hour expression",
    });
  if (b.rawTimezoneText !== null) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: b.rawTimezoneText });
    } catch {
      c.addIssue({ code: "custom", message: "Invalid explicit timezone" });
    }
  }
  if (b.rawDateText !== f.releaseDate.rawText)
    c.addIssue({ code: "custom", message: "Date expressions disagree" });
  if (b.timeStatus === "known" && (!date || !b.parsedTime || !b.rawTimezoneText))
    c.addIssue({
      code: "custom",
      message: "Known time requires explicit date, time and timezone",
    });
  if (s.year !== null && s.rawYearText !== String(s.year))
    c.addIssue({ code: "custom", message: "Year must have explicit original evidence" });
  if (s.quarter !== null && s.rawQuarterText !== s.quarter)
    c.addIssue({ code: "custom", message: "Quarter must have explicit original evidence" });
}
export const reviewObservationSchema =
  reviewObservationBaseSchema.superRefine(validateReviewObservation);
export type ReviewObservation = z.infer<typeof reviewObservationSchema>;
export const reviewValuesSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    date: z
      .object({ raw: z.string().max(200).nullable(), normalized: z.iso.date().nullable() })
      .strict(),
    time: z
      .object({
        raw: z.string().max(200).nullable(),
        parsed: z
          .object({
            hour: z.number().int().min(0).max(23),
            minute: z.number().int().min(0).max(59),
            dayOffset: z.number().int().min(0).max(1),
          })
          .strict()
          .nullable(),
      })
      .strict(),
    timezone: z
      .string()
      .nullable()
      .refine((v) => {
        if (v === null) return true;
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }),
    year: z.number().int().min(1900).max(2200).nullable(),
    quarter: z.enum(["winter", "spring", "summer", "autumn"]).nullable(),
    status: z.enum(["known", "tentative", "unknown"]),
  })
  .strict();
export type ReviewValues = z.infer<typeof reviewValuesSchema>;
export function observationValues(input: unknown): ReviewValues {
  const f = reviewObservationSchema.parse(input).fields;
  return reviewFieldValues(f);
}
export function reviewFieldValues(f: z.infer<typeof yucCandidateFieldsSchema>): ReviewValues {
  return reviewValuesSchema.parse({
    title: f.title,
    date: { raw: f.releaseDate.rawText, normalized: f.releaseDate.normalizedDate },
    time: { raw: f.broadcast.rawTimeText, parsed: f.broadcast.parsedTime },
    timezone: f.broadcast.rawTimezoneText,
    year: f.season.year,
    quarter: f.season.quarter,
    status: f.broadcast.timeStatus,
  });
}
export const reviewWorkSchema = z
  .object({
    id: domainIdSchema,
    slug: animeSlugSchema,
    values: reviewValuesSchema,
    sessionId: z.uuid(),
    dataNature: z.literal("synthetic-test"),
  })
  .strict()
  .refine(
    (v) => v.id.startsWith("review-") && v.slug.startsWith("review-"),
    "Separate authored review works required",
  );
export type ReviewWork = z.infer<typeof reviewWorkSchema>;
export const mappingDecisionSchema = z
  .object({
    decisionId: z.uuid(),
    sessionId: z.uuid(),
    observationId: z.uuid(),
    expectedCandidateVersion: z.number().int().positive(),
    expectedDigest: z.string().regex(/^[a-f0-9]{64}$/),
    internalAnimeId: domainIdSchema,
    expectedEntityVersion: z.number().int().positive(),
    projectMappingKey: z.uuid(),
    reason: z.string().trim().min(5).max(500),
    evidence: z.string().trim().min(5).max(500),
    supersedes: z.uuid().nullable(),
  })
  .strict();
export const adoptionDecisionSchema = z
  .object({
    adoptionId: z.uuid(),
    mappingId: z.uuid(),
    sessionId: z.uuid(),
    expectedCandidateVersion: z.number().int().positive(),
    expectedDigest: z.string().regex(/^[a-f0-9]{64}$/),
    expectedEntityVersion: z.number().int().positive(),
    fields: z.array(reviewFieldSchema).min(1).max(7),
    reason: z.string().trim().min(5).max(500),
    resolvesConflicts: z.boolean().default(false),
  })
  .strict()
  .refine((v) => new Set(v.fields).size === v.fields.length, "Duplicate field selection");
