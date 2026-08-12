import Link from "next/link";
import { Card, Container, SectionHeader } from "@menghuan/ui";
import { AnimeCardGrid } from "@/components/anime-card-grid";
import { BroadcastList } from "@/components/broadcast-list";
import { MockBanner } from "@/components/mock-banner";
import { getAnimeRepository } from "@/server/anime-repository";

export default async function HomePage() {
  const repository = await getAnimeRepository();
  const records = await repository.listAnime();
  const updated = records.filter((item) => item.broadcast?.availabilityState === "updated");
  const current = records
    .filter((item) => item.season?.year === 2026 && item.season.quarter === "summer")
    .slice(0, 4);

  return (
    <Container className="page-shell">
      <MockBanner />
      <section className="hero" aria-labelledby="home-title">
        <div className="hero__content">
          <span className="hero__eyebrow">Dream Archive / Stage 3</span>
          <h1 id="home-title">在安静的档案中，找到下一部想看的作品。</h1>
          <p>
            梦幻正在验证统一领域与Repository边界。本阶段继续只使用完全虚构内容，页面视觉和本地交互保持不变。
          </p>
          <div className="hero__actions">
            <Link href="/today">查看今日更新</Link>
            <Link href="/library">浏览Mock资料库</Link>
          </div>
        </div>
      </section>
      <section className="page-section">
        <SectionHeader
          title="今日概览"
          description="以北京时区为默认展示，原始时间表达始终保留。"
        />
        <div className="summary-grid">
          <Card className="summary-card">
            <span>已更新Mock条目</span>
            <strong>{updated.length}</strong>
            <Link href="/today">查看分组</Link>
          </Card>
          <Card className="summary-card">
            <span>本周有明确时间</span>
            <strong>
              {records.filter((item) => item.broadcast?.normalizedStartAt !== null).length}
            </strong>
            <Link href="/schedule">打开放送表</Link>
          </Card>
          <Card className="summary-card">
            <span>当前季度Mock作品</span>
            <strong>{current.length}</strong>
            <Link href="/season">查看新番骨架</Link>
          </Card>
        </div>
      </section>
      <section className="page-section">
        <SectionHeader
          title="今日更新摘要"
          description="以下条目均为虚构演示。"
          action={<Link href="/today">查看全部</Link>}
        />
        <BroadcastList items={updated.slice(0, 3)} timezone="Asia/Shanghai" />
      </section>
      <section className="page-section">
        <SectionHeader
          title="当前季度Mock作品"
          description="卡片优先展示海报占位、标题、状态与标签。"
          action={<Link href="/season">打开季度页</Link>}
        />
        <AnimeCardGrid items={current} />
      </section>
      <section className="page-section">
        <Card className="summary-card">
          <span>资料库入口</span>
          <strong>{records.length}部虚构作品</strong>
          <p>使用纯前端筛选验证资料浏览，阶段3仍不提供正式全文搜索。</p>
          <Link href="/library">进入资料库</Link>
        </Card>
      </section>
    </Container>
  );
}
