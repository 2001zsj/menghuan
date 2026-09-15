import Link from "next/link";
import { Card, Container, SectionHeader } from "@menghuan/ui";
import { AnimeCardGrid } from "@/components/anime-card-grid";
import { BroadcastList } from "@/components/broadcast-list";
import { MockBanner } from "@/components/mock-banner";
import {
  STAGE4_REFERENCE_INSTANT,
  calendarDateLabelAt,
  currentSeasonAt,
  currentSeasonRecords,
  seasonChoiceLabel,
  seasonRelationAt,
  todaySummary,
} from "@/lib/discovery";
import { getAnimeRepository } from "@/server/anime-repository";

export default async function HomePage() {
  const repository = await getAnimeRepository();
  const records = await repository.listAnime();
  const timezone = "Asia/Shanghai" as const;
  const today = todaySummary(records, timezone, STAGE4_REFERENCE_INSTANT);
  const currentSeason = currentSeasonAt(STAGE4_REFERENCE_INSTANT);
  const current = currentSeasonRecords(records, STAGE4_REFERENCE_INSTANT);
  const scheduledThisWeek = current.filter((item) => item.broadcast?.normalizedStartAt != null);
  const future = records.filter(
    (item) => item.season && seasonRelationAt(item.season, STAGE4_REFERENCE_INSTANT) === "future",
  );

  return (
    <Container className="page-shell">
      <MockBanner />
      <section className="hero" aria-labelledby="home-title">
        <div className="hero__content">
          <span className="hero__eyebrow">Dream Archive / Stage 4</span>
          <h1 id="home-title">在安静的档案中，找到下一部想看的作品。</h1>
          <p>
            本阶段用10部完全虚构作品验证首页、今日、周放送与季度发现流程。演示日期固定，可重复验证，不代表现实当天信息。
          </p>
          <div className="hero__actions">
            <Link href="/today">查看今日更新</Link>
            <Link href="/season">查看季度新番</Link>
          </div>
        </div>
      </section>
      <section className="page-section">
        <SectionHeader
          title="发现概览"
          description={`服务器首次展示固定使用北京时间；受控演示日为${calendarDateLabelAt(
            STAGE4_REFERENCE_INSTANT,
            timezone,
          )}。`}
        />
        <div className="summary-grid summary-grid--four">
          <Card className="summary-card">
            <span>今日已更新</span>
            <strong>{today.updated}</strong>
            <small>
              即将更新 {today.upcoming} · 含暂定 {today.tentative}
            </small>
            <Link href="/today">查看演示日详情</Link>
          </Card>
          <Card className="summary-card">
            <span>本周放送</span>
            <strong>{scheduledThisWeek.length}</strong>
            <small>仅统计当前季度且具有规范化时刻的作品</small>
            <Link href="/schedule">查看每周放送表</Link>
          </Card>
          <Card className="summary-card">
            <span>当前季度</span>
            <strong>{current.length}</strong>
            <small>{seasonChoiceLabel(currentSeason)}</small>
            <Link href="/season">查看当前季度</Link>
          </Card>
          <Card className="summary-card">
            <span>未来新番</span>
            <strong>{future.length}</strong>
            <small>未知或暂定时间不会被自动补全</small>
            <Link href="/season">查看未来新番</Link>
          </Card>
        </div>
      </section>
      <section className="page-section">
        <SectionHeader
          title="今日更新"
          description="只展示能安全换算到北京时间演示日的记录；原始来源表达始终保留。"
          action={<Link href="/today">查看全部</Link>}
        />
        <BroadcastList items={today.items} timezone={timezone} />
      </section>
      <section className="page-section">
        <SectionHeader
          title={`${seasonChoiceLabel(currentSeason)}作品`}
          description="当前季度关系来自Season.year与Season.quarter，不根据放送状态猜测。"
          action={<Link href="/season">打开季度页</Link>}
        />
        <AnimeCardGrid items={current.slice(0, 4)} />
      </section>
      <section className="page-section">
        <Card className="summary-card">
          <span>资料库入口</span>
          <strong>{records.length}部完全虚构作品</strong>
          <p>资料库继续使用现有本地筛选；Stage 4不提前实现正式全文搜索。</p>
          <Link href="/library">进入资料库</Link>
        </Card>
      </section>
    </Container>
  );
}
