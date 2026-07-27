"use client";

import { useMemo, useState } from "react";
import { Container, SectionHeader, Tabs } from "@menghuan/ui";
import { BroadcastList } from "@/components/broadcast-list";
import { MockBanner } from "@/components/mock-banner";
import { TimezoneControl } from "@/components/preference-controls";
import { stage2MockAnime } from "@/mocks/stage2";
import { formatBroadcastTime, timezoneLabel, type WeekdayKey } from "@/lib/timezone";
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

export default function SchedulePage() {
  const { timezone } = useUiPreferences();
  const [day, setDay] = useState<WeekdayKey>("mon");
  const grouped = useMemo(
    () =>
      stage2MockAnime.filter(
        (anime) => formatBroadcastTime(anime.broadcast.normalizedIso, timezone).weekday === day,
      ),
    [day, timezone],
  );

  return (
    <Container className="page-shell">
      <MockBanner />
      <header className="page-header">
        <h1>每周放送表</h1>
        <p>条目会按所选展示时区重新归入星期，跨日变化清晰可见。</p>
      </header>
      <div className="timezone-summary">
        <p>
          当前按<strong>{timezoneLabel(timezone)}</strong>分组。原始时间文本保留在每个条目下方。
        </p>
        <TimezoneControl />
      </div>
      <Tabs label="选择星期" value={day} options={days} onChange={setDay} />
      <section className="page-section">
        <SectionHeader
          title={days.find((item) => item.value === day)?.label ?? "放送"}
          description="移动端采用纵向条目，不使用横向宽表格。"
        />
        <BroadcastList items={grouped} timezone={timezone} emptyTitle="这一天暂无Mock放送" />
      </section>
    </Container>
  );
}
