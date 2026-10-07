import { parse, type DefaultTreeAdapterTypes as Dom } from "parse5";
import { z } from "zod";
import { buildYucObservedFields, yucCandidateFieldsSchema, type YucFieldName } from "./yuc.js";

const page = "https://yuc.wiki/202610/";
const optionsSchema = z
  .object({
    sourceUrl: z.literal(page),
    observedAt: z.string().datetime(),
    limit: z.number().int().min(1).max(3).optional(),
  })
  .strict();
export const yucObservedCandidateSchema = z
  .object({
    parserVersion: z.literal("yuc-observed-dom-v1"),
    observationOrdinal: z.number().int().min(1).max(3),
    identity: z
      .object({
        status: z.literal("pending-review"),
        sourceEntityId: z.null(),
        reason: z.literal("No verified stable source identity; explicit review mapping required"),
      })
      .strict(),
    fields: z.lazy(() => yucCandidateFieldsSchema),
    sourcePageUrl: z.literal(page),
    observedAt: z.string().datetime(),
    publicVisibility: z.literal("internal-only"),
    provenance: z
      .array(
        z
          .object({
            field: z.enum(["title", "releaseDate", "broadcast", "season", "sourcePageUrl"]),
            sourcePageUrl: z.literal(page),
            sourceSelector: z.string().min(1),
            rawValue: z.string().nullable(),
            normalizedValue: z.string().nullable(),
            capturedAt: z.string().datetime(),
          })
          .strict(),
      )
      .length(5),
  })
  .strict();
export type YucObservedCandidate = z.infer<typeof yucObservedCandidateSchema>;
const excluded = new Set([
  "head",
  "script",
  "style",
  "nav",
  "footer",
  "header",
  "aside",
  "template",
  "iframe",
  "object",
  "svg",
  "canvas",
  "video",
  "audio",
]);
function element(n: Dom.Node): n is Dom.Element {
  return "tagName" in n;
}
function elements(n: Dom.Node): Dom.Element[] {
  return "childNodes" in n ? n.childNodes.filter(element) : [];
}
function tagText(n: Dom.Node): string {
  if (n.nodeName === "#text") return (n as Dom.TextNode).value;
  if (!element(n) || excluded.has(n.tagName) || ["a", "img", "picture"].includes(n.tagName))
    return "";
  if (n.tagName === "br") return "\n";
  return n.childNodes.map(tagText).join("");
}
function path(n: Dom.Element): string {
  const parts: string[] = [];
  let current: Dom.Node = n;
  for (let depth = 0; element(current) && depth < 256; depth++) {
    const siblings = current.parentNode
      ? elements(current.parentNode).filter((s) => s.tagName === (current as Dom.Element).tagName)
      : [];
    parts.unshift(`${current.tagName}:nth-of-type(${siblings.indexOf(current) + 1})`);
    if (!current.parentNode) break;
    current = current.parentNode;
  }
  return parts.join(" > ");
}
/** Observed three-entry layout only. No fetching, storage, inferred identity or page-derived timezone/year. */
export function parseYucRealPage(
  html: string,
  options: { sourceUrl: string; observedAt: string; limit?: number },
) {
  const config = optionsSchema.parse(options);
  if (typeof html !== "string" || new TextEncoder().encode(html).length > 1048576)
    throw new RangeError("Invalid DOM response size");
  const document = parse(html);
  const pending: Dom.Node[] = [document];
  const dateRegions: Dom.Element[] = [];
  let count = 0;
  while (pending.length) {
    const n = pending.pop()!;
    if (++count > 50000) throw new RangeError("DOM node limit");
    if (element(n) && excluded.has(n.tagName)) continue;
    if (
      element(n) &&
      n.tagName === "div" &&
      n.attrs.some((a) => a.name === "class" && a.value.split(/\s+/).includes("div_date"))
    )
      dateRegions.push(n);
    if ("childNodes" in n) pending.push(...[...n.childNodes].reverse());
  }
  if (dateRegions.length === 0)
    throw new RangeError("Observed entry layout absent; not a declared empty list");
  const candidates: YucObservedCandidate[] = [];
  for (const dateRegion of dateRegions.slice(0, config.limit ?? 3)) {
    const owner = dateRegion.parentNode;
    if (!owner || !element(owner) || owner.tagName !== "div")
      throw new RangeError("Entry boundary changed");
    const dates = elements(dateRegion).filter((n) => n.tagName !== "img");
    if (dates.length !== 2 || dates.some((n) => n.tagName !== "p"))
      throw new RangeError("Date/time positions changed");
    if (dates.some((n) => elements(n).length !== 0))
      throw new RangeError("Date/time content structure changed");
    const other = elements(owner).filter((n) => n !== dateRegion);
    if (other.length !== 1 || other[0]!.tagName !== "div")
      throw new RangeError("Title region boundary changed");
    const table = elements(other[0]!)[0];
    if (!table || table.tagName !== "table") throw new RangeError("Title table absent");
    const body = elements(table)[0];
    const row = body?.tagName === "tbody" ? elements(body)[0] : body;
    const titleCell = row?.tagName === "tr" ? elements(row)[0] : undefined;
    if (!titleCell || titleCell.tagName !== "td") throw new RangeError("Title cell absent");
    if (elements(titleCell).some((n) => n.tagName !== "br"))
      throw new RangeError("Title content structure changed");
    const title = tagText(titleCell).trim();
    if (!title || title.length > 200) throw new RangeError("Candidate title invalid");
    const time = tagText(dates[0]!).trim() || null,
      date = tagText(dates[1]!).trim() || null;
    const fields = buildYucObservedFields(title, date, time);
    const values: {
      field: YucFieldName;
      selector: string;
      raw: string | null;
      normalized: string | null;
    }[] = [
      { field: "title", selector: path(titleCell), raw: title, normalized: title },
      {
        field: "releaseDate",
        selector: path(dates[1]!),
        raw: date,
        normalized: fields.releaseDate.normalizedDate,
      },
      {
        field: "broadcast",
        selector: path(dateRegion),
        raw: fields.broadcast.originalExpression || null,
        normalized: null,
      },
      { field: "season", selector: path(owner), raw: null, normalized: null },
      { field: "sourcePageUrl", selector: "approved response origin", raw: page, normalized: page },
    ];
    candidates.push(
      yucObservedCandidateSchema.parse({
        parserVersion: "yuc-observed-dom-v1",
        observationOrdinal: candidates.length + 1,
        identity: {
          status: "pending-review",
          sourceEntityId: null,
          reason: "No verified stable source identity; explicit review mapping required",
        },
        fields,
        sourcePageUrl: page,
        observedAt: config.observedAt,
        publicVisibility: "internal-only",
        provenance: values.map((v) => ({
          field: v.field,
          sourcePageUrl: page,
          sourceSelector: v.selector,
          rawValue: v.raw,
          normalizedValue: v.normalized,
          capturedAt: config.observedAt,
        })),
      }),
    );
  }
  return { status: "pending-review" as const, candidates };
}
