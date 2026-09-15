"use client";

import { broadcastStateLabel, type AnimePageData } from "@menghuan/domain";
import { Badge, Card, EmptyState } from "@menghuan/ui";
import {
  broadcastTimeState,
  isCrossWeekday,
  isLateNightSourceTime,
  sourceWeekdayLabel,
} from "@/lib/discovery";
import { formatBroadcastTime, timezoneLabel, type DisplayTimezone } from "@/lib/timezone";

function displayStatus(item: AnimePageData): string {
  const state = broadcastTimeState(item.broadcast);
  if (state === "unknown") return "时间未知";
  if (state === "tentative") return "时间暂定";
  return item.broadcast ? broadcastStateLabel(item.broadcast.availabilityState) : "时间未知";
}

export function BroadcastList({
  items,
  timezone,
  emptyTitle = "暂无条目",
}: {
  items: AnimePageData[];
  timezone: DisplayTimezone;
  emptyTitle?: string;
}) {
  if (items.length === 0)
    return (
      <EmptyState
        title={emptyTitle}
        description="当前受控Fixture筛选条件下没有条目，不会自动生成或猜测资料。"
      />
    );

  return (
    <Card className="broadcast-list">
      {items.map((item) => {
        const broadcast = item.broadcast;
        const time = formatBroadcastTime(broadcast?.normalizedStartAt ?? null, timezone);
        const state = broadcastTimeState(broadcast);
        const isTentative = state === "known-tentative" || state === "tentative";
        const isLateNight = isLateNightSourceTime(broadcast?.sourceOriginalTimeText ?? null);
        const crossesWeekday = isCrossWeekday(broadcast, timezone);
        const testId =
          item.anime.slug === "starlight-memo"
            ? "broadcast-time-cross-day"
            : item.anime.slug === "night-tram"
              ? "broadcast-time-late-night"
              : item.anime.slug === "rain-library"
                ? "broadcast-time-unknown"
                : undefined;

        return (
          <article
            className="mh-broadcast-item"
            key={item.anime.id}
            {...(testId ? { "data-testid": testId } : {})}
          >
            <div>
              <div className="broadcast-statuses" aria-label="放送状态">
                <Badge tone={state === "unknown" || state === "tentative" ? "warning" : "accent"}>
                  {displayStatus(item)}
                </Badge>
                {isTentative && state === "known-tentative" ? (
                  <Badge tone="warning">暂定</Badge>
                ) : null}
                {isLateNight ? <Badge>深夜表达</Badge> : null}
                {crossesWeekday ? <Badge>跨日</Badge> : null}
              </div>
              <h3>
                <a href={`/anime/${item.anime.slug}`}>{item.anime.title}</a>
              </h3>
            </div>
            <div className="mh-broadcast-item__times">
              <strong>
                {time.isTbd
                  ? state === "tentative"
                    ? "时间暂定"
                    : "时间未知"
                  : `${timezoneLabel(timezone)} ${time.text}`}
              </strong>
              <span>原始：{broadcast?.originalExpression ?? "原始时间未知"}</span>
              {broadcast?.sourceOriginalDateText ? (
                <span>来源：{broadcast.sourceOriginalDateText}</span>
              ) : null}
              {isLateNight ? (
                <span>
                  来源深夜时刻：{broadcast?.sourceOriginalTimeText}（按原文保留，不改写为01点）
                </span>
              ) : null}
              {crossesWeekday ? (
                <span>
                  来源{sourceWeekdayLabel(broadcast?.sourceWeekday ?? null)}
                  ，换算后属于当前展示时区的
                  {time.dateText}
                </span>
              ) : null}
            </div>
          </article>
        );
      })}
    </Card>
  );
}
