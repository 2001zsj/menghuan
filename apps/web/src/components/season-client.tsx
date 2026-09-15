"use client";

import { useMemo, useState } from "react";
import {
  animeMediaTypeLabel,
  animeReleaseStatusLabel,
  seasonQuarterLabel,
  type AnimeMediaType,
  type AnimePageData,
  type AnimeReleaseStatus,
  type SeasonQuarter,
} from "@menghuan/domain";
import { EmptyState, SegmentedControl, Select } from "@menghuan/ui";
import { AnimeCardGrid } from "@/components/anime-card-grid";
import { BroadcastList } from "@/components/broadcast-list";
import {
  STAGE4_REFERENCE_INSTANT,
  listSeasonChoices,
  recordsForSeason,
  type SeasonRelation,
} from "@/lib/discovery";
import { useUiPreferences } from "@/providers/ui-preferences-provider";

const modes = [
  { value: "current", label: "当前季度" },
  { value: "history", label: "历史季度" },
  { value: "future", label: "未来新番" },
] as const;

type FormatFilter = AnimeMediaType | "all";
type StatusFilter = AnimeReleaseStatus | "all";

export function SeasonClient({ records }: { records: AnimePageData[] }) {
  const { timezone } = useUiPreferences();
  const [mode, setMode] = useState<SeasonRelation>("current");
  const [year, setYear] = useState("2026");
  const [quarter, setQuarter] = useState<SeasonQuarter>("summer");
  const [format, setFormat] = useState<FormatFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const choices = useMemo(
    () => listSeasonChoices(records, mode, STAGE4_REFERENCE_INSTANT),
    [mode, records],
  );
  const years = useMemo(
    () => [...new Set(choices.map((choice) => choice.year))].sort((a, b) => b - a),
    [choices],
  );
  const quartersForYear = useMemo(
    () => choices.filter((choice) => choice.year === Number(year)),
    [choices, year],
  );
  const selectedChoice =
    choices.find((choice) => choice.year === Number(year) && choice.quarter === quarter) ??
    choices[0] ??
    null;

  const items = useMemo(() => {
    if (!selectedChoice) return [];
    return recordsForSeason(records, selectedChoice).filter(
      (item) =>
        (format === "all" || item.anime.mediaType === format) &&
        (status === "all" || item.anime.releaseStatus === status),
    );
  }, [format, records, selectedChoice, status]);

  const changeMode = (next: SeasonRelation) => {
    setMode(next);
    const first = listSeasonChoices(records, next, STAGE4_REFERENCE_INSTANT)[0];
    if (first) {
      setYear(String(first.year));
      setQuarter(first.quarter);
    }
  };

  const changeYear = (nextYear: string) => {
    setYear(nextYear);
    const first = choices.find((choice) => choice.year === Number(nextYear));
    if (first) setQuarter(first.quarter);
  };

  return (
    <>
      <div className="season-mode">
        <SegmentedControl
          label="季度范围"
          value={mode}
          options={modes}
          onChange={changeMode}
          testId="season-mode-control"
        />
        <p>季度关系按日本时间中的Stage4受控Reference Instant计算，不依据作品放送状态猜测。</p>
      </div>
      <div className="toolbar">
        <Select label="年份" value={year} onChange={(event) => changeYear(event.target.value)}>
          {years.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Select
          label="季度"
          value={selectedChoice?.quarter ?? quarter}
          onChange={(event) => setQuarter(event.target.value as SeasonQuarter)}
        >
          {quartersForYear.map((choice) => (
            <option key={choice.key} value={choice.quarter}>
              {seasonQuarterLabel(choice.quarter)}
            </option>
          ))}
        </Select>
        <Select
          label="类型"
          value={format}
          onChange={(event) => setFormat(event.target.value as FormatFilter)}
        >
          <option value="all">全部类型</option>
          <option value="tv">{animeMediaTypeLabel("tv")}</option>
          <option value="short">{animeMediaTypeLabel("short")}</option>
          <option value="movie">{animeMediaTypeLabel("movie")}</option>
        </Select>
        <Select
          label="状态"
          value={status}
          onChange={(event) => setStatus(event.target.value as StatusFilter)}
        >
          <option value="all">全部状态</option>
          <option value="airing">{animeReleaseStatusLabel("airing")}</option>
          <option value="finished">{animeReleaseStatusLabel("finished")}</option>
          <option value="upcoming">{animeReleaseStatusLabel("upcoming")}</option>
        </Select>
      </div>
      <section className="page-section" aria-labelledby="season-results-heading">
        <h2 id="season-results-heading" className="mh-results-heading">
          {selectedChoice ? `${selectedChoice.label} · 受控Fixture` : "暂无季度Fixture"}
        </h2>
        {items.length ? (
          <AnimeCardGrid items={items} />
        ) : (
          <EmptyState
            title="没有符合筛选的虚构作品"
            description="筛选结果为空时不自动放宽条件，也不生成虚假资料。"
          />
        )}
      </section>
      {mode === "future" && items.length ? (
        <section className="page-section">
          <h2 className="mh-results-heading">未来放送时间说明</h2>
          <p className="season-time-note">未来作品没有可靠时刻时保持“时间未知”或“时间暂定”。</p>
          <BroadcastList items={items} timezone={timezone} />
        </section>
      ) : null}
    </>
  );
}
