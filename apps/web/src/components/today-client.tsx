"use client";

import type { AnimePageData } from "@menghuan/domain";
import { SectionHeader } from "@menghuan/ui";
import { BroadcastList } from "@/components/broadcast-list";
import { TimezoneControl } from "@/components/preference-controls";
import { timezoneLabel } from "@/lib/timezone";
import { useUiPreferences } from "@/providers/ui-preferences-provider";

export function TodayClient({ items }: { items: AnimePageData[] }) {
  const { timezone } = useUiPreferences();
  return (
    <>
      <div className="timezone-summary">
        <p>
          当前展示：<strong>{timezoneLabel(timezone)}</strong>。时间待定条目不会生成虚假时间。
        </p>
        <TimezoneControl />
      </div>
      <section className="page-section">
        <SectionHeader title="已更新" description="Mock状态用于验证分组层级。" />
        <BroadcastList
          items={items.filter((item) => item.broadcast?.availabilityState === "updated")}
          timezone={timezone}
        />
      </section>
      <section className="page-section">
        <SectionHeader title="即将更新" description="切换时区不会修改原始字段。" />
        <BroadcastList
          items={items.filter((item) => item.broadcast?.availabilityState === "upcoming")}
          timezone={timezone}
        />
      </section>
      <section className="page-section">
        <SectionHeader title="时间待定" description="未知时间保持未知。" />
        <BroadcastList
          items={items.filter((item) => item.broadcast?.availabilityState === "tbd")}
          timezone={timezone}
        />
      </section>
      <section className="page-section">
        <SectionHeader title="空状态骨架" description="用于确认真实数据为空时页面仍清晰。" />
        <BroadcastList items={[]} timezone={timezone} emptyTitle="没有额外更新" />
      </section>
    </>
  );
}
