"use client";

import { useMemo } from "react";
import type { AnimePageData } from "@menghuan/domain";
import { Card, SectionHeader } from "@menghuan/ui";
import { BroadcastList } from "@/components/broadcast-list";
import { TimezoneControl } from "@/components/preference-controls";
import {
  STAGE4_REFERENCE_INSTANT,
  calendarDateLabelAt,
  todayRecords,
  unresolvedCurrentSeasonRecords,
} from "@/lib/discovery";
import { timezoneLabel } from "@/lib/timezone";
import { useUiPreferences } from "@/providers/ui-preferences-provider";

export function TodayClient({ items }: { items: AnimePageData[] }) {
  const { timezone } = useUiPreferences();
  const today = useMemo(
    () => todayRecords(items, timezone, STAGE4_REFERENCE_INSTANT),
    [items, timezone],
  );
  const unresolved = useMemo(
    () => unresolvedCurrentSeasonRecords(items, STAGE4_REFERENCE_INSTANT),
    [items],
  );
  const updated = today.filter((item) => item.broadcast?.availabilityState === "updated");
  const upcoming = today.filter((item) => item.broadcast?.availabilityState === "upcoming");
  const tentative = today.filter((item) => item.broadcast?.isTentative === true);

  return (
    <>
      <div className="timezone-summary" data-testid="today-reference-summary">
        <p>
          当前展示：<strong>{timezoneLabel(timezone)}</strong> · 演示日期：
          <strong>{calendarDateLabelAt(STAGE4_REFERENCE_INSTANT, timezone)}</strong>
          。这是受控Fixture 演示日，不代表现实中的今天。
        </p>
        <TimezoneControl />
      </div>
      <div className="summary-grid summary-grid--compact" aria-label="今日更新统计">
        <Card className="summary-card">
          <span>已更新</span>
          <strong>{updated.length}</strong>
        </Card>
        <Card className="summary-card">
          <span>即将更新</span>
          <strong>{upcoming.length}</strong>
        </Card>
        <Card className="summary-card">
          <span>含暂定时间</span>
          <strong>{tentative.length}</strong>
        </Card>
      </div>
      <section className="page-section">
        <SectionHeader title="已更新" description="只包含规范化日期能安全落在当前演示日的记录。" />
        <BroadcastList items={updated} timezone={timezone} emptyTitle="演示日暂无已更新条目" />
      </section>
      <section className="page-section">
        <SectionHeader
          title="即将更新"
          description="同一条记录可以同时标记为即将更新和时间暂定。"
        />
        <BroadcastList items={upcoming} timezone={timezone} emptyTitle="演示日暂无即将更新条目" />
      </section>
      <section className="page-section">
        <SectionHeader
          title="时间未能安全归日"
          description="当前季度中没有规范化时刻的记录不会被猜测为今天，也不会生成00:00。"
        />
        <BroadcastList items={unresolved} timezone={timezone} emptyTitle="没有无法安全归日的条目" />
      </section>
    </>
  );
}
