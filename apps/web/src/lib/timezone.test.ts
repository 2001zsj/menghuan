import { describe, expect, it } from "vitest";
import { DEFAULT_UI_PREFERENCES } from "./preferences";
import { formatBroadcastTime } from "./timezone";
describe("timezone display", () => {
  it("defaults to Beijing time", () => {
    expect(DEFAULT_UI_PREFERENCES.timezone).toBe("Asia/Shanghai");
  });
  it("switches the same instant to Japan time", () => {
    const result = formatBroadcastTime("2026-07-27T15:30:00.000Z", "Asia/Tokyo");
    expect(result.timeText).toBe("00:30");
    expect(result.weekday).toBe("tue");
  });
  it("handles cross-day conversion", () => {
    const shanghai = formatBroadcastTime("2026-07-27T15:30:00.000Z", "Asia/Shanghai");
    const tokyo = formatBroadcastTime("2026-07-27T15:30:00.000Z", "Asia/Tokyo");
    expect(shanghai.dateText).toContain("7月27日");
    expect(tokyo.dateText).toContain("7月28日");
    expect(shanghai.weekday).toBe("mon");
    expect(tokyo.weekday).toBe("tue");
  });
  it("does not invent a time for TBA entries", () => {
    expect(formatBroadcastTime(null, "Asia/Shanghai")).toEqual({
      isTbd: true,
      text: "时间待定",
      dateText: null,
      timeText: null,
      weekday: null,
    });
  });
});
