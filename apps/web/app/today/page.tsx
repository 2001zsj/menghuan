"use client";
import { Container, SectionHeader } from "@menghuan/ui";
import { BroadcastList } from "@/components/broadcast-list";
import { MockBanner } from "@/components/mock-banner";
import { TimezoneControl } from "@/components/preference-controls";
import { stage2MockAnime } from "@/mocks/stage2";
import { timezoneLabel } from "@/lib/timezone";
import { useUiPreferences } from "@/providers/ui-preferences-provider";

export default function TodayPage() {
  const { timezone } = useUiPreferences();
  return (
    <Container className="page-shell">
      <MockBanner />
      <header className="page-header">
        <h1>今日更新</h1>
        <p>按演示状态分组，同时展示换算时间和不可覆盖的原始来源时间。</p>
      </header>
      <div className="timezone-summary">
        <p>
          当前展示：<strong>{timezoneLabel(timezone)}</strong>。时间待定条目不会生成虚假时间。
        </p>
        <TimezoneControl />
      </div>
      <section className="page-section">
        <SectionHeader title="已更新" description="Mock状态用于验证分组层级。" />
        <BroadcastList
          items={stage2MockAnime.filter((anime) => anime.broadcast.state === "updated")}
          timezone={timezone}
        />
      </section>
      <section className="page-section">
        <SectionHeader title="即将更新" description="切换时区不会修改原始字段。" />
        <BroadcastList
          items={stage2MockAnime.filter((anime) => anime.broadcast.state === "upcoming")}
          timezone={timezone}
        />
      </section>
      <section className="page-section">
        <SectionHeader title="时间待定" description="未知时间保持未知。" />
        <BroadcastList
          items={stage2MockAnime.filter((anime) => anime.broadcast.state === "tbd")}
          timezone={timezone}
        />
      </section>
      <section className="page-section">
        <SectionHeader title="空状态骨架" description="用于确认真实数据为空时页面仍清晰。" />
        <BroadcastList items={[]} timezone={timezone} emptyTitle="没有额外更新" />
      </section>
    </Container>
  );
}
