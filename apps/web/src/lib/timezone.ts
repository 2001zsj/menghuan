export const DISPLAY_TIMEZONES = ["Asia/Shanghai", "Asia/Tokyo"] as const;
export type DisplayTimezone = (typeof DISPLAY_TIMEZONES)[number];

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export interface FormattedBroadcastTime {
  isTbd: boolean;
  text: string;
  dateText: string | null;
  timeText: string | null;
  weekday: WeekdayKey | null;
}

export function timezoneLabel(timezone: DisplayTimezone): string {
  return timezone === "Asia/Shanghai" ? "北京时间" : "日本时间";
}

function isWeekdayKey(value: string): value is WeekdayKey {
  return WEEKDAY_KEYS.includes(value as WeekdayKey);
}

export function formatBroadcastTime(
  normalizedIso: string | null,
  timezone: DisplayTimezone,
): FormattedBroadcastTime {
  if (!normalizedIso) {
    return { isTbd: true, text: "时间待定", dateText: null, timeText: null, weekday: null };
  }
  const date = new Date(normalizedIso);
  if (Number.isNaN(date.getTime())) {
    return { isTbd: true, text: "时间待定", dateText: null, timeText: null, weekday: null };
  }
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  const englishWeekday = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" })
    .format(date)
    .slice(0, 3)
    .toLowerCase();
  const weekday = isWeekdayKey(englishWeekday) ? englishWeekday : null;
  const dateText = `${Number(part("month"))}月${Number(part("day"))}日 ${part("weekday")}`;
  const timeText = `${part("hour").padStart(2, "0")}:${part("minute").padStart(2, "0")}`;
  return { isTbd: false, text: `${dateText} ${timeText}`, dateText, timeText, weekday };
}
