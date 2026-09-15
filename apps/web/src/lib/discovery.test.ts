import { describe, expect, it } from "vitest";
import { stage3AnimeFixture, type AnimePageData } from "@menghuan/domain";
import {
  STAGE4_REFERENCE_INSTANT,
  broadcastTimeState,
  calendarDateAt,
  compareSeasons,
  currentSeasonAt,
  currentSeasonSchedule,
  isCrossWeekday,
  isLateNightSourceTime,
  listSeasonChoices,
  seasonRelationAt,
  sortByDisplayTime,
  todayRecords,
  todaySummary,
  unresolvedCurrentSeasonRecords,
  weekdayAt,
} from "./discovery";

function bySlug(slug: string): AnimePageData {
  const record = stage3AnimeFixture.find((item) => item.anime.slug === slug);
  if (!record) throw new Error(`缺少Fixture：${slug}`);
  return record;
}

describe("Stage 4 discovery", () => {
  it("uses the fixed reference instant for Beijing and Japan calendar dates", () => {
    expect(calendarDateAt(STAGE4_REFERENCE_INSTANT, "Asia/Shanghai")).toBe("2026-07-27");
    expect(calendarDateAt(STAGE4_REFERENCE_INSTANT, "Asia/Tokyo")).toBe("2026-07-28");
  });

  it("keeps starlight-memo on Beijing Monday and Japan Tuesday", () => {
    const instant = bySlug("starlight-memo").broadcast?.normalizedStartAt;
    expect(instant).toBe("2026-07-27T15:30:00.000Z");
    expect(weekdayAt(instant!, "Asia/Shanghai")).toBe("mon");
    expect(weekdayAt(instant!, "Asia/Tokyo")).toBe("tue");
  });

  it("detects source weekday crossing without changing the source weekday", () => {
    const star = bySlug("starlight-memo").broadcast;
    const night = bySlug("night-tram").broadcast;
    expect(isCrossWeekday(star, "Asia/Shanghai")).toBe(true);
    expect(isCrossWeekday(star, "Asia/Tokyo")).toBe(false);
    expect(isCrossWeekday(night, "Asia/Shanghai")).toBe(true);
    expect(star?.sourceWeekday).toBe("tue");
    expect(night?.sourceWeekday).toBe("sun");
  });

  it("recognizes 25:15 as a late-night source expression without rewriting it", () => {
    const broadcast = bySlug("night-tram").broadcast;
    expect(isLateNightSourceTime(broadcast?.sourceOriginalTimeText ?? null)).toBe(true);
    expect(broadcast?.sourceOriginalTimeText).toBe("25:15");
    expect(broadcast?.originalExpression).toContain("25:15");
    expect(weekdayAt(broadcast!.normalizedStartAt!, "Asia/Tokyo")).toBe("mon");
  });

  it("distinguishes known tentative, null tentative, and null unknown times", () => {
    expect(broadcastTimeState(bySlug("starlight-memo").broadcast)).toBe("known-tentative");
    expect(broadcastTimeState(bySlug("wind-notes").broadcast)).toBe("tentative");
    expect(broadcastTimeState(bySlug("rain-library").broadcast)).toBe("unknown");
  });

  it("never generates 00:00 for an unknown time", () => {
    const rain = bySlug("rain-library");
    expect(rain.broadcast?.normalizedStartAt).toBeNull();
    expect(rain.broadcast?.sourceOriginalTimeText).toBeNull();
    expect(JSON.stringify(rain.broadcast)).not.toContain("00:00");
  });

  it("summarizes the controlled Beijing demo day for the home page", () => {
    const summary = todaySummary(stage3AnimeFixture, "Asia/Shanghai", STAGE4_REFERENCE_INSTANT);
    expect(summary.updated).toBe(1);
    expect(summary.upcoming).toBe(1);
    expect(summary.tentative).toBe(1);
  });

  it("puts only safely dated records into today", () => {
    const beijing = todayRecords(stage3AnimeFixture, "Asia/Shanghai", STAGE4_REFERENCE_INSTANT);
    const japan = todayRecords(stage3AnimeFixture, "Asia/Tokyo", STAGE4_REFERENCE_INSTANT);
    expect(beijing.map((item) => item.anime.slug)).toEqual(["moonlit-archive", "starlight-memo"]);
    expect(japan.map((item) => item.anime.slug)).toEqual(["starlight-memo"]);
    expect(beijing.some((item) => item.anime.slug === "rain-library")).toBe(false);
  });

  it("keeps undated current-season records outside the dated schedule", () => {
    const unresolved = unresolvedCurrentSeasonRecords(stage3AnimeFixture, STAGE4_REFERENCE_INSTANT);
    expect(unresolved.map((item) => item.anime.slug)).toEqual(["rain-library"]);
  });

  it("sorts same-day broadcasts by displayed time", () => {
    const moon = bySlug("moonlit-archive");
    const star = bySlug("starlight-memo");
    expect(sortByDisplayTime([star, moon], "Asia/Shanghai").map((item) => item.anime.slug)).toEqual(
      ["moonlit-archive", "starlight-memo"],
    );
  });

  it("groups the cross-day fixture by the selected display timezone", () => {
    const shanghai = currentSeasonSchedule(
      stage3AnimeFixture,
      "Asia/Shanghai",
      STAGE4_REFERENCE_INSTANT,
    );
    const tokyo = currentSeasonSchedule(stage3AnimeFixture, "Asia/Tokyo", STAGE4_REFERENCE_INSTANT);
    expect(shanghai.mon.some((item) => item.anime.slug === "starlight-memo")).toBe(true);
    expect(tokyo.tue.some((item) => item.anime.slug === "starlight-memo")).toBe(true);
  });

  it("classifies 2026 Summer as current, Spring as history, and Autumn as future", () => {
    expect(currentSeasonAt(STAGE4_REFERENCE_INSTANT)).toEqual({ year: 2026, quarter: "summer" });
    expect(seasonRelationAt({ year: 2026, quarter: "summer" }, STAGE4_REFERENCE_INSTANT)).toBe(
      "current",
    );
    expect(seasonRelationAt({ year: 2026, quarter: "spring" }, STAGE4_REFERENCE_INSTANT)).toBe(
      "history",
    );
    expect(seasonRelationAt({ year: 2026, quarter: "autumn" }, STAGE4_REFERENCE_INSTANT)).toBe(
      "future",
    );
  });

  it("sorts seasons correctly across years", () => {
    const seasons = [
      { year: 2027, quarter: "winter" as const },
      { year: 2026, quarter: "autumn" as const },
      { year: 2026, quarter: "winter" as const },
    ].sort(compareSeasons);
    expect(seasons).toEqual([
      { year: 2026, quarter: "winter" },
      { year: 2026, quarter: "autumn" },
      { year: 2027, quarter: "winter" },
    ]);
  });

  it("derives season choices from fixture relations", () => {
    expect(listSeasonChoices(stage3AnimeFixture, "history", STAGE4_REFERENCE_INSTANT)).toEqual([
      { year: 2026, quarter: "spring", key: "2026-spring", label: "2026年春季" },
    ]);
    expect(listSeasonChoices(stage3AnimeFixture, "future", STAGE4_REFERENCE_INSTANT)).toEqual([
      { year: 2026, quarter: "autumn", key: "2026-autumn", label: "2026年秋季" },
    ]);
  });

  it("keeps exactly ten completely fictional records and no source URLs", () => {
    expect(stage3AnimeFixture).toHaveLength(10);
    expect(
      stage3AnimeFixture.every((item) => item.anime.isMock && item.anime.dataStatus === "mock"),
    ).toBe(true);
    const serialized = JSON.stringify(stage3AnimeFixture);
    expect(serialized).not.toMatch(/https?:\/\//i);
    expect(serialized).not.toMatch(/yuc|agefans|bangumi|bilibili/i);
  });

  it("does not mutate fixture values while formatting and grouping", () => {
    const before = JSON.stringify(stage3AnimeFixture);
    todayRecords(stage3AnimeFixture, "Asia/Shanghai", STAGE4_REFERENCE_INSTANT);
    currentSeasonSchedule(stage3AnimeFixture, "Asia/Tokyo", STAGE4_REFERENCE_INSTANT);
    expect(JSON.stringify(stage3AnimeFixture)).toBe(before);
  });
});
