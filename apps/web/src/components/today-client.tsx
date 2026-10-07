"use client";

import { useMemo } from "react";
import type { AnimePageData } from "@menghuan/domain";
import { SectionHeader } from "@menghuan/ui";
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
          <strong>{timezoneLabel(timezone)}</strong> · 演示日期：
          <strong>{calendarDateLabelAt(STAGE4_REFERENCE_INSTANT, timezone)}</strong>
        </p>
        <TimezoneControl />
      </div>
      <div className="discovery-counts" aria-label="今日更新统计">
        <span>
          已更新 <strong>{updated.length}</strong>
        </span>
        <span>
          即将更新 <strong>{upcoming.length}</strong>
        </span>
        <span>
          含暂定 <strong>{tentative.length}</strong>
        </span>
      </div>
      <section className="page-section">
        <SectionHeader title="已更新" />
        <BroadcastList items={updated} timezone={timezone} emptyTitle="演示日暂无已更新条目" />
      </section>
      <section className="page-section">
        <SectionHeader title="即将更新" />
        <BroadcastList items={upcoming} timezone={timezone} emptyTitle="演示日暂无即将更新条目" />
      </section>
      <section className="page-section">
        <SectionHeader
          title="时间未定"
          description="本季尚无明确日期或时间的作品，不计入演示日。"
        />
        <BroadcastList items={unresolved} timezone={timezone} emptyTitle="没有无法安全归日的条目" />
      </section>
    </>
  );
}
