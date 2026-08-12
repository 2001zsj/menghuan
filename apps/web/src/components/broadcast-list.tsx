"use client";

import { broadcastStateLabel, type AnimePageData } from "@menghuan/domain";
import { BroadcastItem, Card, EmptyState } from "@menghuan/ui";
import { formatBroadcastTime, timezoneLabel, type DisplayTimezone } from "@/lib/timezone";

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
        description="当前Mock筛选条件下没有条目，页面保留空状态以验证真实使用场景。"
      />
    );

  return (
    <Card className="broadcast-list">
      {items.map((item) => {
        const broadcast = item.broadcast;
        const time = formatBroadcastTime(broadcast?.normalizedStartAt ?? null, timezone);
        return (
          <BroadcastItem
            key={item.anime.id}
            title={item.anime.title}
            href={`/anime/${item.anime.slug}`}
            status={broadcast ? broadcastStateLabel(broadcast.availabilityState) : "时间待定"}
            convertedTime={time.isTbd ? "时间待定" : `${timezoneLabel(timezone)} ${time.text}`}
            originalTime={broadcast?.originalExpression ?? "原始时间待定"}
            {...(item.anime.slug === "starlight-memo"
              ? { testId: "broadcast-time-cross-day" }
              : {})}
          />
        );
      })}
    </Card>
  );
}
