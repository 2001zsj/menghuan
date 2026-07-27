"use client";
import { BroadcastItem, Card, EmptyState } from "@menghuan/ui";
import type { Stage2MockAnime } from "@/mocks/stage2";
import { formatBroadcastTime, timezoneLabel, type DisplayTimezone } from "@/lib/timezone";
const stateLabels = { updated: "已更新", upcoming: "即将更新", tbd: "时间待定" } as const;
export function BroadcastList({
  items,
  timezone,
  emptyTitle = "暂无条目",
}: {
  items: Stage2MockAnime[];
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
      {items.map((anime) => {
        const time = formatBroadcastTime(anime.broadcast.normalizedIso, timezone);
        return (
          <BroadcastItem
            key={anime.id}
            title={anime.title}
            href={`/anime/${anime.slug}`}
            status={stateLabels[anime.broadcast.state]}
            convertedTime={time.isTbd ? "时间待定" : `${timezoneLabel(timezone)} ${time.text}`}
            originalTime={anime.broadcast.originalText}
            {...(anime.slug === "starlight-memo" ? { testId: "broadcast-time-cross-day" } : {})}
          />
        );
      })}
    </Card>
  );
}
