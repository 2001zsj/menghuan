"use client";

import { useMemo, useState } from "react";
import type { AnimePageData } from "@menghuan/domain";
import { Button, SectionHeader, Tabs } from "@menghuan/ui";
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
  const nextDay = days.find((item) => groups[item.value].length > 0);

  return (
    <>
      <div className="timezone-summary">
        <p>
          <strong>2026年夏季</strong> · <strong>{timezoneLabel(timezone)}</strong>
        </p>
        <TimezoneControl />
      </div>
      <Tabs label="选择星期" value={day} options={days} onChange={setDay} />
      <section className="page-section">
        <SectionHeader title={days.find((item) => item.value === day)?.label ?? "放送"} />
        <BroadcastList
          items={grouped}
          timezone={timezone}
          emptyTitle="这一天暂无演示放送"
          emptyAction={
            nextDay ? (
              <Button onClick={() => setDay(nextDay.value)}>查看{nextDay.label}放送</Button>
            ) : (
              <a href="/season">查看季度作品</a>
            )
          }
        />
      </section>
      <section className="page-section">
        <SectionHeader title="时间未定" description="尚未确认的时间，不归入任何星期。" />
        <BroadcastList items={unresolved} timezone={timezone} emptyTitle="当前季度没有未定时间" />
      </section>
    </>
  );
}
