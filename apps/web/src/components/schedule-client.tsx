"use client";

import { useMemo, useState } from "react";
import type { AnimePageData } from "@menghuan/domain";
import { SectionHeader, Tabs } from "@menghuan/ui";
import { BroadcastList } from "@/components/broadcast-list";
import { TimezoneControl } from "@/components/preference-controls";
import {
  STAGE4_REFERENCE_INSTANT,
  currentSeasonSchedule,
  unresolvedCurrentSeasonRecords,
} from "@/lib/discovery";
import { timezoneLabel, type WeekdayKey } from "@/lib/timezone";
import { useUiPreferences } from "@/providers/ui-preferences-provider";

const days = [
  { value: "mon", label: "周一" },
  { value: "tue", label: "周二" },
  { value: "wed", label: "周三" },
  { value: "thu", label: "周四" },
  { value: "fri", label: "周五" },
  { value: "sat", label: "周六" },
  { value: "sun", label: "周日" },
] as const;

export function ScheduleClient({ items }: { items: AnimePageData[] }) {
  const { timezone } = useUiPreferences();
  const [day, setDay] = useState<WeekdayKey>("mon");
  const groups = useMemo(
    () => currentSeasonSchedule(items, timezone, STAGE4_REFERENCE_INSTANT),
    [items, timezone],
  );
  const unresolved = useMemo(
    () => unresolvedCurrentSeasonRecords(items, STAGE4_REFERENCE_INSTANT),
    [items],
  );
  const grouped = groups[day];

  return (
    <>
      <div className="timezone-summary">
        <p>
          当前季度：<strong>2026年夏季</strong> · 当前按
          <strong>{timezoneLabel(timezone)}</strong>重新计算星期。原始来源表达始终保留。
        </p>
        <TimezoneControl />
      </div>
      <Tabs label="选择星期" value={day} options={days} onChange={setDay} />
      <section className="page-section">
        <SectionHeader
          title={days.find((item) => item.value === day)?.label ?? "放送"}
          description="同一天按当前展示时区中的时间升序排列；移动端继续使用纵向列表。"
        />
        <BroadcastList items={grouped} timezone={timezone} emptyTitle="这一天暂无受控Fixture放送" />
      </section>
      <section className="page-section">
        <SectionHeader
          title="时间未定"
          description="没有规范化时刻的当前季度记录不会被强行归入任何星期；时间暂定与时间未知分别展示。"
        />
        <BroadcastList items={unresolved} timezone={timezone} emptyTitle="当前季度没有未定时间" />
      </section>
    </>
  );
}
