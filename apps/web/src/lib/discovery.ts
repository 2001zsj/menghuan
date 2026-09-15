import type { AnimePageData, BroadcastInfo, SeasonQuarter, Weekday } from "@menghuan/domain";
import type { DisplayTimezone, WeekdayKey } from "./timezone";

export const STAGE4_REFERENCE_INSTANT = "2026-07-27T15:15:00.000Z";
export const STAGE4_SEASON_REFERENCE_TIMEZONE: DisplayTimezone = "Asia/Tokyo";

const quarterOrder: Record<SeasonQuarter, number> = {
  winter: 0,
  spring: 1,
  summer: 2,
  autumn: 3,
  other: 4,
};

const quarterLabels: Record<SeasonQuarter, string> = {
  winter: "冬",
  spring: "春",
  summer: "夏",
  autumn: "秋",
  other: "其他",
};

const weekdayKeys: WeekdayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: WeekdayKey;
}

export interface SeasonKey {
  year: number;
  quarter: SeasonQuarter;
}

export type SeasonRelation = "current" | "history" | "future";
export type BroadcastTimeState = "known" | "known-tentative" | "tentative" | "unknown";

export interface SeasonChoice extends SeasonKey {
  key: string;
  label: string;
}

function parseInstant(instant: string): Date {
  const value = new Date(instant);
  if (Number.isNaN(value.getTime())) throw new Error(`无效的Reference Instant：${instant}`);
  return value;
}

function weekdayKey(value: Date, timezone: DisplayTimezone): WeekdayKey {
  const short = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" })
    .format(value)
    .slice(0, 3)
    .toLowerCase();
  const key = weekdayKeys.find((item) => item === short);
  if (!key) throw new Error(`无法解析星期：${short}`);
  return key;
}

function zonedParts(instant: string, timezone: DisplayTimezone): ZonedParts {
  const value = parseInstant(instant);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const numberPart = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((item) => item.type === type)?.value;
    if (!part) throw new Error(`无法取得${type}：${instant}`);
    return Number(part);
  };
  return {
    year: numberPart("year"),
    month: numberPart("month"),
    day: numberPart("day"),
    hour: numberPart("hour"),
    minute: numberPart("minute"),
    weekday: weekdayKey(value, timezone),
  };
}

export function calendarDateAt(instant: string, timezone: DisplayTimezone): string {
  const parts = zonedParts(instant, timezone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(
    2,
    "0",
  )}`;
}

export function calendarDateLabelAt(instant: string, timezone: DisplayTimezone): string {
  const parts = zonedParts(instant, timezone);
  return `${parts.year}年${parts.month}月${parts.day}日`;
}

export function weekdayAt(instant: string, timezone: DisplayTimezone): WeekdayKey {
  return zonedParts(instant, timezone).weekday;
}

function quarterFromMonth(month: number): SeasonQuarter {
  if (month <= 3) return "winter";
  if (month <= 6) return "spring";
  if (month <= 9) return "summer";
  return "autumn";
}

export function currentSeasonAt(referenceInstant: string): SeasonKey {
  const parts = zonedParts(referenceInstant, STAGE4_SEASON_REFERENCE_TIMEZONE);
  return { year: parts.year, quarter: quarterFromMonth(parts.month) };
}

export function compareSeasons(left: SeasonKey, right: SeasonKey): number {
  if (left.year !== right.year) return left.year - right.year;
  return quarterOrder[left.quarter] - quarterOrder[right.quarter];
}

export function seasonRelationAt(season: SeasonKey, referenceInstant: string): SeasonRelation {
  const comparison = compareSeasons(season, currentSeasonAt(referenceInstant));
  if (comparison === 0) return "current";
  return comparison < 0 ? "history" : "future";
}

export function seasonChoiceKey(season: SeasonKey): string {
  return `${season.year}-${season.quarter}`;
}

export function seasonChoiceLabel(season: SeasonKey): string {
  return `${season.year}年${quarterLabels[season.quarter]}季`;
}

export function listSeasonChoices(
  records: readonly AnimePageData[],
  relation: SeasonRelation,
  referenceInstant: string,
): SeasonChoice[] {
  const unique = new Map<string, SeasonChoice>();
  for (const record of records) {
    if (!record.season) continue;
    const season = { year: record.season.year, quarter: record.season.quarter };
    if (seasonRelationAt(season, referenceInstant) !== relation) continue;
    const key = seasonChoiceKey(season);
    unique.set(key, { ...season, key, label: seasonChoiceLabel(season) });
  }
  const choices = [...unique.values()].sort(compareSeasons);
  return relation === "history" ? choices.reverse() : choices;
}

export function recordsForSeason(
  records: readonly AnimePageData[],
  season: SeasonKey,
): AnimePageData[] {
  return records.filter(
    (record) => record.season?.year === season.year && record.season.quarter === season.quarter,
  );
}

export function currentSeasonRecords(
  records: readonly AnimePageData[],
  referenceInstant: string,
): AnimePageData[] {
  return recordsForSeason(records, currentSeasonAt(referenceInstant));
}

export function broadcastTimeState(broadcast: BroadcastInfo | null): BroadcastTimeState {
  if (!broadcast?.normalizedStartAt) return broadcast?.isTentative ? "tentative" : "unknown";
  return broadcast.isTentative ? "known-tentative" : "known";
}

export function isLateNightSourceTime(sourceOriginalTimeText: string | null): boolean {
  if (!sourceOriginalTimeText) return false;
  const match = /^(\d{1,2}):(\d{2})$/.exec(sourceOriginalTimeText.trim());
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 24 && hour <= 47 && minute >= 0 && minute <= 59;
}

export function isCrossWeekday(
  broadcast: BroadcastInfo | null,
  timezone: DisplayTimezone,
): boolean {
  if (!broadcast?.normalizedStartAt || !broadcast.sourceWeekday) return false;
  return weekdayAt(broadcast.normalizedStartAt, timezone) !== broadcast.sourceWeekday;
}

export function isBroadcastOnDisplayDate(
  broadcast: BroadcastInfo | null,
  timezone: DisplayTimezone,
  referenceInstant: string,
): boolean {
  if (!broadcast?.normalizedStartAt) return false;
  return (
    calendarDateAt(broadcast.normalizedStartAt, timezone) ===
    calendarDateAt(referenceInstant, timezone)
  );
}

function displayMinuteOfDay(record: AnimePageData, timezone: DisplayTimezone): number {
  if (!record.broadcast?.normalizedStartAt) return Number.POSITIVE_INFINITY;
  const parts = zonedParts(record.broadcast.normalizedStartAt, timezone);
  return parts.hour * 60 + parts.minute;
}

export function sortByDisplayTime(
  records: readonly AnimePageData[],
  timezone: DisplayTimezone,
): AnimePageData[] {
  return [...records].sort((left, right) => {
    const byTime = displayMinuteOfDay(left, timezone) - displayMinuteOfDay(right, timezone);
    if (byTime !== 0) return byTime;
    return left.anime.title.localeCompare(right.anime.title, "zh-CN");
  });
}

export function todayRecords(
  records: readonly AnimePageData[],
  timezone: DisplayTimezone,
  referenceInstant: string,
): AnimePageData[] {
  return sortByDisplayTime(
    records.filter((record) =>
      isBroadcastOnDisplayDate(record.broadcast, timezone, referenceInstant),
    ),
    timezone,
  );
}

export function unresolvedCurrentSeasonRecords(
  records: readonly AnimePageData[],
  referenceInstant: string,
): AnimePageData[] {
  return currentSeasonRecords(records, referenceInstant).filter(
    (record) => record.broadcast?.normalizedStartAt == null,
  );
}

export function currentSeasonSchedule(
  records: readonly AnimePageData[],
  timezone: DisplayTimezone,
  referenceInstant: string,
): Record<WeekdayKey, AnimePageData[]> {
  const groups: Record<WeekdayKey, AnimePageData[]> = {
    sun: [],
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
  };
  for (const record of currentSeasonRecords(records, referenceInstant)) {
    const instant = record.broadcast?.normalizedStartAt;
    if (!instant) continue;
    groups[weekdayAt(instant, timezone)].push(record);
  }
  for (const day of weekdayKeys) groups[day] = sortByDisplayTime(groups[day], timezone);
  return groups;
}

export function todaySummary(
  records: readonly AnimePageData[],
  timezone: DisplayTimezone,
  referenceInstant: string,
) {
  const items = todayRecords(records, timezone, referenceInstant);
  return {
    items,
    updated: items.filter((item) => item.broadcast?.availabilityState === "updated").length,
    upcoming: items.filter((item) => item.broadcast?.availabilityState === "upcoming").length,
    tentative: items.filter((item) => item.broadcast?.isTentative === true).length,
  };
}

export function sourceWeekdayLabel(value: Weekday | null): string {
  const labels: Record<Weekday, string> = {
    mon: "周一",
    tue: "周二",
    wed: "周三",
    thu: "周四",
    fri: "周五",
    sat: "周六",
    sun: "周日",
  };
  return value ? labels[value] : "来源星期未知";
}
