import { z } from "zod";
import { parseYucRealPage, type YucObservedCandidate } from "./yuc-real.js";

export const YUC_SOURCE_KEY = "yuc" as const;
export const YUC_PARSER_VERSION = "yuc-offline-v3" as const;
export const YUC_ALLOWED_ORIGIN = "https://yuc.wiki" as const;
export const YUC_ALLOWED_PAGE_PATHS = ["/", "/index/", "/new/", "/sp/"] as const;

export type YucQuarter = "winter" | "spring" | "summer" | "autumn";
export type YucTimeStatus = "known" | "tentative" | "unknown";
export type YucFieldName = "title" | "releaseDate" | "broadcast" | "season" | "sourcePageUrl";

export interface YucParsedTime {
  hour: number;
  minute: number;
  dayOffset: number;
}

export interface YucBroadcastCandidate {
  rawDateText: string | null;
  rawTimeText: string | null;
  rawTimezoneText: string | null;
  originalExpression: string;
  parsedTime: YucParsedTime | null;
  normalizedStartAt: null;
  timeStatus: YucTimeStatus;
}

export interface YucReleaseDateCandidate {
  rawText: string | null;
  normalizedDate: string | null;
}

export interface YucSeasonCandidate {
  rawYearText: string | null;
  rawQuarterText: string | null;
  year: number | null;
  quarter: YucQuarter | null;
}

export interface YucCandidateFields {
  title: string;
  releaseDate: YucReleaseDateCandidate;
  broadcast: YucBroadcastCandidate;
  season: YucSeasonCandidate;
}

export interface YucFieldProvenance {
  field: YucFieldName;
  sourcePageUrl: string;
  sourceSelector: string;
  rawValue: string | null;
  normalizedValue: string | null;
  capturedAt: string;
}

export interface YucSourceRecord {
  sourceKey: typeof YUC_SOURCE_KEY;
  sourceRecordId: string;
  sourceEntityId: string;
  stableKey: string;
  sourcePageUrl: string;
  fetchedAt: string;
  parserVersion: typeof YUC_PARSER_VERSION;
  payloadDigest: string;
  fields: YucCandidateFields;
  provenance: readonly YucFieldProvenance[];
  validationStatus: "candidate";
  mergeStatus: "staged" | "conflicted";
  publicVisibility: "internal-only";
}

export interface YucHttpResponse {
  status: number;
  body: string;
  headers: Readonly<Record<string, string>>;
}

export type YucFetcher = (url: string, signal: AbortSignal) => Promise<unknown>;

export interface YucRequestPolicy {
  minIntervalMs?: number;
  timeoutMs?: number;
  maxRetries?: number;
  backoffMs?: number;
  jitterMs?: number;
  circuitFailureThreshold?: number;
}

export type YucFailureReason =
  | "forbidden"
  | "rate-limited"
  | "timeout"
  | "http-error"
  | "network-error"
  | "invalid-response"
  | "circuit-open";

export interface YucAdapterRunResult {
  status: "disabled" | "success" | "failed";
  reason: YucFailureReason | null;
  requestCount: number;
  records: readonly YucSourceRecord[];
  emptyResult: boolean;
  preservedExistingData: true;
  pendingCandidates?: readonly YucObservedCandidate[];
}

export interface YucAdapterOptions {
  enabled: boolean;
  fetcher: YucFetcher;
  sourcePageUrl: string;
  now?: () => string;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
  policy?: YucRequestPolicy;
  pageFormat?: "synthetic" | "observed-dom";
}

const defaultPolicy: Required<YucRequestPolicy> = {
  minIntervalMs: 10_000,
  timeoutMs: 20_000,
  maxRetries: 1,
  backoffMs: 500,
  jitterMs: 100,
  circuitFailureThreshold: 3,
};

function textOrNull(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? decodeEntities(trimmed) : null;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function readAttribute(tag: string, attribute: string): string | null {
  const escapedAttribute = attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`\\b${escapedAttribute}\\s*=\\s*(["'])(.*?)\\1`, "is"));
  return match?.[2] ?? null;
}

function normalizeDate(value: string | null): string | null {
  const candidate = textOrNull(value);
  if (!candidate || !/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    return null;
  }
  const parsed = new Date(`${candidate}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== candidate
    ? null
    : candidate;
}

function normalizeQuarter(value: string | null): YucQuarter | null {
  const candidate = textOrNull(value)?.toLowerCase();
  if (!candidate) return null;
  const quarterMap: Record<string, YucQuarter> = {
    winter: "winter",
    spring: "spring",
    summer: "summer",
    autumn: "autumn",
    fall: "autumn",
    冬: "winter",
    春: "spring",
    夏: "summer",
    秋: "autumn",
  };
  return quarterMap[candidate] ?? null;
}

function isYucSourcePageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const path = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
    const approvedPath =
      YUC_ALLOWED_PAGE_PATHS.includes(path as (typeof YUC_ALLOWED_PAGE_PATHS)[number]) ||
      /^\/20\d{4}\/$/.test(path);
    return (
      url.origin === YUC_ALLOWED_ORIGIN &&
      url.username === "" &&
      url.password === "" &&
      url.search === "" &&
      url.hash === "" &&
      approvedPath
    );
  } catch {
    return false;
  }
}

function isValidTimeZone(value: string | null): boolean {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

function parseTime(value: string | null): YucParsedTime | null {
  const candidate = textOrNull(value);
  const match = candidate?.match(/^(2[0-9]|[01][0-9]):([0-5][0-9])$/);
  if (!match) return null;
  const hour = Number(match[1]);
  return { hour: hour % 24, minute: Number(match[2]), dayOffset: hour >= 24 ? 1 : 0 };
}

function buildBroadcast(
  dateText: string | null,
  timeText: string | null,
  timezoneText: string | null,
  dateIsValid: boolean,
  tentative: boolean,
): YucBroadcastCandidate {
  const rawDateText = textOrNull(dateText);
  const rawTimeText = textOrNull(timeText);
  const rawTimezoneText = textOrNull(timezoneText);
  const parsedTime = parseTime(rawTimeText);
  const expression = [rawTimezoneText, rawDateText, rawTimeText].filter(Boolean).join(" ");
  const timeStatus: YucTimeStatus = tentative
    ? "tentative"
    : dateIsValid && rawTimeText && isValidTimeZone(rawTimezoneText) && parsedTime
      ? "known"
      : "unknown";

  return {
    rawDateText,
    rawTimeText,
    rawTimezoneText,
    originalExpression: expression,
    parsedTime,
    normalizedStartAt: null,
    timeStatus,
  };
}

/** Shares accepted normalization; absent year/timezone remain unknown. */
export function buildYucObservedFields(
  title: string,
  rawDate: string | null,
  rawTime: string | null,
): YucCandidateFields {
  const releaseDate = { rawText: rawDate, normalizedDate: normalizeDate(rawDate) };
  return {
    title,
    releaseDate,
    broadcast: buildBroadcast(
      rawDate,
      rawTime,
      null,
      releaseDate.normalizedDate !== null,
      /未定|暂定|暫定|予定|延期|待定/.test([rawDate, rawTime].filter(Boolean).join(" ")),
    ),
    season: { rawYearText: null, rawQuarterText: null, year: null, quarter: null },
  };
}

function stableDigest(value: string): string {
  let left = 2166136261;
  let right = 2246822519;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    left = Math.imul(left ^ code, 16777619) >>> 0;
    right = Math.imul(right ^ code, 3266489917) >>> 0;
  }
  return `${left.toString(16).padStart(8, "0")}${right.toString(16).padStart(8, "0")}`;
}

function provenance(
  field: YucFieldName,
  sourcePageUrl: string,
  sourceSelector: string,
  rawValue: string | null,
  normalizedValue: string | null,
  capturedAt: string,
): YucFieldProvenance {
  return { field, sourcePageUrl, sourceSelector, rawValue, normalizedValue, capturedAt };
}

export const yucHttpResponseSchema = z
  .object({
    status: z.number().int().min(100).max(599),
    body: z.string(),
    headers: z.record(z.string(), z.string()),
  })
  .strict();

const yucParsedTimeSchema = z
  .object({
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
    dayOffset: z.number().int().min(0).max(1),
  })
  .strict();

export const yucCandidateFieldsSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    releaseDate: z
      .object({ rawText: z.string().nullable(), normalizedDate: z.string().nullable() })
      .strict(),
    broadcast: z
      .object({
        rawDateText: z.string().nullable(),
        rawTimeText: z.string().nullable(),
        rawTimezoneText: z.string().nullable(),
        originalExpression: z.string(),
        parsedTime: yucParsedTimeSchema.nullable(),
        normalizedStartAt: z.null(),
        timeStatus: z.enum(["known", "tentative", "unknown"]),
      })
      .strict(),
    season: z
      .object({
        rawYearText: z.string().nullable(),
        rawQuarterText: z.string().nullable(),
        year: z.number().int().min(1900).max(2200).nullable(),
        quarter: z.enum(["winter", "spring", "summer", "autumn"]).nullable(),
      })
      .strict(),
  })
  .strict();

const yucProvenanceSchema = z
  .object({
    field: z.enum(["title", "releaseDate", "broadcast", "season", "sourcePageUrl"]),
    sourcePageUrl: z.string().url().refine(isYucSourcePageUrl),
    sourceSelector: z.string().min(1),
    rawValue: z.string().nullable(),
    normalizedValue: z.string().nullable(),
    capturedAt: z.string().datetime(),
  })
  .strict();

export const yucSourceRecordSchema = z
  .object({
    sourceKey: z.literal(YUC_SOURCE_KEY),
    sourceRecordId: z.string().regex(/^yuc-[0-9a-f]{16}$/),
    sourceEntityId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
    stableKey: z.string().regex(/^yuc-entity-[0-9a-f]{16}$/),
    sourcePageUrl: z.string().url().refine(isYucSourcePageUrl),
    fetchedAt: z.string().datetime(),
    parserVersion: z.literal(YUC_PARSER_VERSION),
    payloadDigest: z.string().regex(/^[0-9a-f]{16}$/),
    fields: yucCandidateFieldsSchema,
    provenance: z.array(yucProvenanceSchema).min(5),
    validationStatus: z.literal("candidate"),
    mergeStatus: z.enum(["staged", "conflicted"]),
    publicVisibility: z.literal("internal-only"),
  })
  .strict()
  .superRefine((record, context) => {
    const expectedKey = `yuc-entity-${stableDigest(JSON.stringify([YUC_ALLOWED_ORIGIN, record.sourceEntityId]))}`;
    const expectedVersion = `yuc-${stableDigest(JSON.stringify([expectedKey, record.fields]))}`;
    if (
      record.stableKey !== expectedKey ||
      record.sourceRecordId !== expectedVersion ||
      record.payloadDigest !== stableDigest(JSON.stringify(record.fields))
    ) {
      context.addIssue({ code: "custom", message: "Candidate identity or digest is inconsistent" });
    }
    if (
      record.provenance.some(
        (field) =>
          field.sourcePageUrl !== record.sourcePageUrl || field.capturedAt !== record.fetchedAt,
      )
    ) {
      context.addIssue({ code: "custom", message: "Candidate evidence source is inconsistent" });
    }
  });

export function parseYucHtml(
  html: string,
  sourcePageUrl: string,
  fetchedAt: string,
  parserVersion: typeof YUC_PARSER_VERSION = YUC_PARSER_VERSION,
): readonly YucSourceRecord[] {
  if (!isYucSourcePageUrl(sourcePageUrl)) {
    throw new RangeError(`YUC adapter only accepts pages under ${YUC_ALLOWED_ORIGIN}`);
  }
  const records: YucSourceRecord[] = [];
  // This deliberately validates the synthetic fixture dialect, not real YUC HTML.
  const structuralStack: string[] = [];
  for (const match of html.matchAll(/<\/?(main|article)\b[^>]*>/gi)) {
    const tagName = match[1]!.toLowerCase();
    if (match[0].startsWith("</")) {
      if (structuralStack.pop() !== tagName) throw new RangeError("Truncated or mismatched list");
    } else {
      if (structuralStack.includes(tagName)) throw new RangeError("Nested synthetic list");
      structuralStack.push(tagName);
    }
  }
  if (structuralStack.length > 0) throw new RangeError("Truncated synthetic list");
  const markerTags = [...html.matchAll(/<[^>]*\bdata-yuc-entry\b[^>]*>/gi)];
  if (
    markerTags.some(([tag]) => !/^<article\b/i.test(tag) || !/\sdata-yuc-entry(?=\s|>)/i.test(tag))
  ) {
    throw new RangeError("Malformed synthetic entry marker");
  }
  const articlePattern = /<article\b[^>]*\sdata-yuc-entry(?=\s|>)[^>]*>/gi;
  const hasArticleMarker = articlePattern.test(html);
  articlePattern.lastIndex = 0;
  const hasDeclaredEmptyList = /^\s*<main\s+data-yuc-list=["']true["']\s*>\s*<\/main>\s*$/i.test(
    html,
  );
  if (!hasArticleMarker && !hasDeclaredEmptyList) {
    throw new RangeError("YUC response does not contain a recognized list structure");
  }
  for (const match of html.matchAll(articlePattern)) {
    const tag = match[0];
    const title = textOrNull(readAttribute(tag, "data-title"));
    const sourceEntityId = textOrNull(readAttribute(tag, "data-entity-id"));
    if (!title || !sourceEntityId || !/^[A-Za-z0-9_-]{1,100}$/.test(sourceEntityId)) {
      throw new RangeError(
        "YUC entry requires a valid title and explicit synthetic entity identity",
      );
    }

    const rawDateText = textOrNull(readAttribute(tag, "data-date"));
    const rawTimeText = textOrNull(readAttribute(tag, "data-time"));
    const rawTimezoneText = textOrNull(readAttribute(tag, "data-timezone"));
    const rawYearText = textOrNull(readAttribute(tag, "data-year"));
    const rawQuarterText = textOrNull(readAttribute(tag, "data-quarter"));
    const releaseDate: YucReleaseDateCandidate = {
      rawText: rawDateText,
      normalizedDate: normalizeDate(rawDateText),
    };
    const yearNumber = rawYearText && /^\d{4}$/.test(rawYearText) ? Number(rawYearText) : null;
    const season: YucSeasonCandidate = {
      rawYearText,
      rawQuarterText,
      year: yearNumber && yearNumber >= 1900 && yearNumber <= 2200 ? yearNumber : null,
      quarter: normalizeQuarter(rawQuarterText),
    };
    const tentative = readAttribute(tag, "data-tentative")?.toLowerCase() === "true";
    const broadcast = buildBroadcast(
      rawDateText,
      rawTimeText,
      rawTimezoneText,
      releaseDate.normalizedDate !== null,
      tentative,
    );
    const fields: YucCandidateFields = { title, releaseDate, broadcast, season };
    const stableKey = `yuc-entity-${stableDigest(JSON.stringify([YUC_ALLOWED_ORIGIN, sourceEntityId]))}`;
    const identity = JSON.stringify([stableKey, fields]);
    const selector = `article[data-yuc-entry][data-entity-id="${sourceEntityId}"]`;
    records.push({
      sourceKey: YUC_SOURCE_KEY,
      sourceRecordId: `yuc-${stableDigest(identity)}`,
      sourceEntityId,
      stableKey,
      sourcePageUrl,
      fetchedAt,
      parserVersion,
      payloadDigest: stableDigest(JSON.stringify(fields)),
      fields,
      provenance: [
        provenance("title", sourcePageUrl, selector, title, title, fetchedAt),
        provenance(
          "releaseDate",
          sourcePageUrl,
          selector,
          releaseDate.rawText,
          releaseDate.normalizedDate,
          fetchedAt,
        ),
        provenance(
          "broadcast",
          sourcePageUrl,
          selector,
          broadcast.originalExpression || null,
          null,
          fetchedAt,
        ),
        provenance(
          "season",
          sourcePageUrl,
          selector,
          [season.rawYearText, season.rawQuarterText].filter(Boolean).join(" ") || null,
          season.year && season.quarter ? `${season.year}-${season.quarter}` : null,
          fetchedAt,
        ),
        provenance(
          "sourcePageUrl",
          sourcePageUrl,
          selector,
          sourcePageUrl,
          sourcePageUrl,
          fetchedAt,
        ),
      ],
      validationStatus: "candidate",
      mergeStatus: "staged",
      publicVisibility: "internal-only",
    });
  }
  if (hasArticleMarker && records.length === 0) {
    throw new RangeError("YUC response contains entries but no valid candidate titles");
  }
  for (const record of records) {
    if (!yucSourceRecordSchema.safeParse(record).success) {
      throw new RangeError("YUC candidate failed runtime contract validation");
    }
  }
  return records;
}

class YucTimeoutError extends Error {
  constructor() {
    super("YUC request timed out");
    this.name = "YucTimeoutError";
  }
}

interface YucOriginScheduler {
  tail: Promise<void>;
  lastRequestAtMs: number | null;
}

const originSchedulers = new Map<string, YucOriginScheduler>();

function schedulerFor(sourcePageUrl: string): YucOriginScheduler {
  const origin = new URL(sourcePageUrl).origin;
  const existing = originSchedulers.get(origin);
  if (existing) return existing;
  const scheduler: YucOriginScheduler = { tail: Promise.resolve(), lastRequestAtMs: null };
  originSchedulers.set(origin, scheduler);
  return scheduler;
}

function currentTime(now: () => string): number {
  const value = Date.parse(now());
  return Number.isNaN(value) ? Date.now() : value;
}

export interface YucCandidateStore {
  stage(record: unknown): { status: "staged" | "duplicate"; sourceRecordId: string };
  listCandidates(): readonly YucSourceRecord[];
  setVerified(record: YucVerifiedRecord): void;
  getVerified(stableKey: string): YucVerifiedRecord | null;
  promote(sourceRecordId: string): YucMergeResult;
}

export interface YucVerifiedRecord {
  stableKey: string;
  title: string;
  broadcastExpression: string | null;
  fields?: YucCandidateFields;
}

export interface YucMergeResult {
  status: "not-found" | "merged" | "unchanged" | "conflict";
  conflicts: readonly YucFieldName[];
  preservedVerifiedData: true;
}

export class InMemoryYucCandidateStore implements YucCandidateStore {
  private readonly candidates = new Map<string, YucSourceRecord>();
  private readonly verified = new Map<string, YucVerifiedRecord>();

  stage(input: unknown): { status: "staged" | "duplicate"; sourceRecordId: string } {
    const record = yucSourceRecordSchema.parse(input);
    if (this.candidates.has(record.sourceRecordId)) {
      return { status: "duplicate", sourceRecordId: record.sourceRecordId };
    }
    this.candidates.set(record.sourceRecordId, record);
    return { status: "staged", sourceRecordId: record.sourceRecordId };
  }

  listCandidates(): readonly YucSourceRecord[] {
    return structuredClone([...this.candidates.values()]);
  }

  setVerified(record: YucVerifiedRecord): void {
    this.verified.set(record.stableKey, structuredClone(record));
  }

  getVerified(stableKey: string): YucVerifiedRecord | null {
    const record = this.verified.get(stableKey);
    return record ? structuredClone(record) : null;
  }

  promote(sourceRecordId: string): YucMergeResult {
    const candidate = this.candidates.get(sourceRecordId);
    if (!candidate) {
      return { status: "not-found", conflicts: [], preservedVerifiedData: true };
    }
    const existing = this.verified.get(candidate.stableKey);
    if (!existing) {
      this.verified.set(candidate.stableKey, {
        stableKey: candidate.stableKey,
        title: candidate.fields.title,
        broadcastExpression: candidate.fields.broadcast.originalExpression || null,
        fields: structuredClone(candidate.fields),
      });
      return { status: "merged", conflicts: [], preservedVerifiedData: true };
    }

    const conflicts: YucFieldName[] = [];
    if (existing.title !== candidate.fields.title) conflicts.push("title");
    if (existing.broadcastExpression !== (candidate.fields.broadcast.originalExpression || null)) {
      conflicts.push("broadcast");
    }
    if (existing.fields) {
      for (const field of ["releaseDate", "broadcast", "season"] as const) {
        if (
          JSON.stringify(existing.fields[field]) !== JSON.stringify(candidate.fields[field]) &&
          !conflicts.includes(field)
        )
          conflicts.push(field);
      }
    } else if (!conflicts.includes("broadcast")) {
      // Legacy manual snapshots cannot confirm tentative/known semantics.
      conflicts.push("broadcast");
    }
    if (conflicts.length > 0) {
      this.candidates.set(sourceRecordId, { ...candidate, mergeStatus: "conflicted" });
      return { status: "conflict", conflicts, preservedVerifiedData: true };
    }
    return { status: "unchanged", conflicts: [], preservedVerifiedData: true };
  }
}

export class YucAdapter {
  private readonly options: YucAdapterOptions;
  private readonly policy: Required<YucRequestPolicy>;
  private readonly now: () => string;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly random: () => number;
  private consecutiveFailures = 0;

  constructor(options: YucAdapterOptions) {
    if (
      options.pageFormat !== undefined &&
      !["synthetic", "observed-dom"].includes(options.pageFormat)
    )
      throw new RangeError("Unknown page format");
    if (!isYucSourcePageUrl(options.sourcePageUrl)) {
      throw new RangeError(`YUC adapter only accepts pages under ${YUC_ALLOWED_ORIGIN}`);
    }
    this.options = options;
    this.policy = { ...defaultPolicy, ...options.policy };
    this.now = options.now ?? (() => new Date().toISOString());
    this.sleep =
      options.sleep ??
      ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.random = options.random ?? Math.random;
  }

  async run(): Promise<YucAdapterRunResult> {
    const scheduler = schedulerFor(this.options.sourcePageUrl);
    const previous = scheduler.tail;
    let release!: () => void;
    scheduler.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await this.runAtQueueHead();
    } finally {
      release();
    }
  }

  private async runAtQueueHead(): Promise<YucAdapterRunResult> {
    if (!this.options.enabled) {
      return {
        status: "disabled",
        reason: null,
        requestCount: 0,
        records: [],
        emptyResult: false,
        preservedExistingData: true,
      };
    }
    if (this.consecutiveFailures >= this.policy.circuitFailureThreshold) {
      return this.failed("circuit-open", 0);
    }

    let requestCount = 0;
    for (let attempt = 0; attempt <= this.policy.maxRetries; attempt += 1) {
      requestCount += 1;
      try {
        const rawResponse = await this.scheduledRequest();
        const parsedResponse = yucHttpResponseSchema.safeParse(rawResponse);
        if (!parsedResponse.success) {
          return this.failed("invalid-response", requestCount);
        }
        const response = parsedResponse.data;
        if (response.status >= 200 && response.status < 300) {
          try {
            if (this.options.pageFormat === "observed-dom") {
              if (
                response.status !== 200 ||
                !/^text\/html(?:;|$)/i.test(response.headers["content-type"] ?? "")
              )
                return this.failed("invalid-response", requestCount);
              const parsed = parseYucRealPage(response.body, {
                sourceUrl: this.options.sourcePageUrl,
                observedAt: this.now(),
              });
              this.consecutiveFailures = 0;
              return {
                status: "success",
                reason: null,
                requestCount,
                records: [],
                pendingCandidates: parsed.candidates,
                emptyResult: false,
                preservedExistingData: true,
              };
            }
            const records = parseYucHtml(response.body, this.options.sourcePageUrl, this.now());
            this.consecutiveFailures = 0;
            return {
              status: "success",
              reason: null,
              requestCount,
              records,
              emptyResult: records.length === 0,
              preservedExistingData: true,
            };
          } catch {
            return this.failed("invalid-response", requestCount);
          }
        }
        const reason =
          response.status === 403
            ? "forbidden"
            : response.status === 429
              ? "rate-limited"
              : "http-error";
        const retryable =
          response.status === 502 || response.status === 503 || response.status === 504;
        if (retryable && attempt < this.policy.maxRetries) {
          await this.backoff(attempt);
          continue;
        }
        return this.failed(reason, requestCount);
      } catch (error) {
        if (attempt < this.policy.maxRetries) {
          await this.backoff(attempt);
          continue;
        }
        return this.failed(
          error instanceof YucTimeoutError ? "timeout" : "network-error",
          requestCount,
        );
      }
    }
    return this.failed("network-error", requestCount);
  }

  async sync(store: YucCandidateStore): Promise<YucAdapterRunResult & { stagedCount: number }> {
    const result = await this.run();
    let stagedCount = 0;
    if (result.status === "success") {
      for (const record of result.records) {
        if (store.stage(record).status === "staged") stagedCount += 1;
      }
    }
    return { ...result, stagedCount };
  }

  private async scheduledRequest(): Promise<unknown> {
    const scheduler = schedulerFor(this.options.sourcePageUrl);
    const current = currentTime(this.now);
    if (scheduler.lastRequestAtMs !== null) {
      const elapsed = current - scheduler.lastRequestAtMs;
      if (elapsed >= 0) {
        const remaining = this.policy.minIntervalMs - elapsed;
        if (remaining > 0) await this.sleep(remaining);
      }
    }
    scheduler.lastRequestAtMs = currentTime(this.now);
    return await this.requestWithTimeout();
  }

  private async requestWithTimeout(): Promise<unknown> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        this.options.fetcher(this.options.sourcePageUrl, controller.signal),
        new Promise<unknown>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new YucTimeoutError());
          }, this.policy.timeoutMs);
        }),
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      controller.abort();
    }
  }

  private async backoff(attempt: number): Promise<void> {
    const jitter = this.policy.jitterMs * this.random();
    await this.sleep(this.policy.backoffMs * 2 ** attempt + jitter);
  }

  private failed(reason: YucFailureReason, requestCount: number): YucAdapterRunResult {
    if (reason !== "circuit-open") this.consecutiveFailures += 1;
    return {
      status: "failed",
      reason,
      requestCount,
      records: [],
      emptyResult: false,
      preservedExistingData: true,
    };
  }
}
