import { animePageDataSchema, type ReviewField, type ReviewValues } from "@menghuan/domain";

// Normalize only explicit adopted date/time/timezone. Never infer them from URL or mapping.
function normalized(values: ReviewValues): string | null {
  if (
    !values.date.normalized ||
    !values.time.parsed ||
    !values.timezone ||
    values.status === "unknown"
  )
    return null;
  const t = values.time.parsed;
  const local =
    new Date(`${values.date.normalized}T00:00:00.000Z`).getTime() +
    (t.dayOffset * 24 + t.hour) * 3600000 +
    t.minute * 60000;
  let instant = local;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: values.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(
      fmt.formatToParts(new Date(instant)).map((v) => [v.type, v.value]),
    );
    const asUTC = Date.parse(
      `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.000Z`,
    );
    const next = instant + local - asUTC;
    if (next === instant) return new Date(instant).toISOString();
    instant = next;
  }
  return null;
}
export function reviewPage(input: {
  id: string;
  slug: string;
  values: ReviewValues;
  enabled: boolean;
  adoptedFields: ReviewField[];
  realNature?: "real" | "synthetic-path-test";
  localCreatedAt?: string;
}) {
  const { id, slug, values: v, enabled, adoptedFields } = input;
  const real = input.realNature === "real",
    local = input.realNature !== undefined;
  const createdAt = input.localCreatedAt ?? "2026-10-04T00:00:00.000Z";
  const normalizedStartAt = normalized(v);
  const expression =
    [v.date.raw, v.time.raw, v.timezone].filter(Boolean).join(" ") || "日期、时间和时区未知";
  return animePageDataSchema.parse({
    reviewSource: {
      kind: "review-mapped",
      dataNature: input.realNature ?? "synthetic-test",
      label: real
        ? "YUC 独立来源 / 非官方 · 本地评估"
        : local
          ? "真实路径合成测试，非真实 YUC 资料"
          : "合成审核演示，非真实 YUC 资料",
      sourceEnabled: enabled,
      sourcePageUrl: "https://yuc.wiki/202610/",
      adoptedFields,
      originalExpression: expression,
    },
    anime: {
      id,
      slug,
      title: v.title,
      aliases: [],
      synopsis: real
        ? "本机来源评估记录；未采集简介。"
        : local
          ? "自行编写内容，仅验证真实候选代码路径。"
          : "自行编写的合成审核作品，仅用于本地流程验证。",
      mediaType: local ? "unknown" : "tv",
      releaseStatus: local ? "unknown" : "upcoming",
      tags: [],
      dataStatus: real ? "draft" : "mock",
      isMock: !real,
      createdAt,
      updatedAt: createdAt,
    },
    season:
      v.year !== null && v.quarter !== null
        ? {
            id: `review-season-${v.year}-${v.quarter}`,
            year: v.year,
            quarter: v.quarter,
            label: real ? "来源明确季度" : "合成审核季度",
            startDate: null,
            endDate: null,
            referenceTimezone: v.timezone,
            seasonType: "broadcast",
            dataStatus: real ? "draft" : "mock",
          }
        : null,
    animeSeason:
      v.year !== null && v.quarter !== null
        ? {
            animeId: id,
            seasonId: `review-season-${v.year}-${v.quarter}`,
            relationType: "primary",
            isPrimary: true,
            createdAt,
          }
        : null,
    broadcast: {
      id: `${id}-broadcast`,
      animeId: id,
      broadcastType: "broadcast",
      sourceTimezone: v.timezone,
      sourceOriginalDateText: v.date.raw,
      sourceOriginalTimeText: v.time.raw,
      originalExpression: expression,
      normalizedStartAt,
      sourceWeekday: null,
      availabilityState: normalizedStartAt ? "upcoming" : "tbd",
      isPrimary: true,
      isTentative: v.status === "tentative",
      note: null,
      dataStatus: real ? "draft" : "mock",
      createdAt,
      updatedAt: createdAt,
    },
    episodes: [],
    staffCredits: [],
    castCredits: [],
    resourceCategories: [],
  });
}
