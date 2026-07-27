import Link from "next/link";
import { Card, Container, SectionHeader } from "@menghuan/ui";
import { AnimeCardGrid } from "@/components/anime-card-grid";
import { BroadcastList } from "@/components/broadcast-list";
import { MockBanner } from "@/components/mock-banner";
import { stage2MockAnime } from "@/mocks/stage2";

export default function HomePage() {
  const updated = stage2MockAnime.filter((anime) => anime.broadcast.state === "updated");
  const current = stage2MockAnime
    .filter((anime) => anime.season.year === 2026 && anime.season.quarter === "夏")
    .slice(0, 4);
  return (
    <Container className="page-shell">
      <MockBanner />
      <section className="hero" aria-labelledby="home-title">
        <div className="hero__content">
          <span className="hero__eyebrow">Dream Archive / Stage 2</span>
          <h1 id="home-title">在安静的档案中，找到下一部想看的作品。</h1>
          <p>
            梦幻正在建立全新的动漫资料与放送发现界面。本阶段仅使用完全虚构的Mock内容验证视觉、布局与交互结构。
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
              {stage2MockAnime.filter((anime) => anime.broadcast.normalizedIso).length}
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
          <strong>10部虚构作品</strong>
          <p>使用纯前端搜索与筛选骨架验证资料浏览信息架构，不提供正式全局搜索。</p>
          <Link href="/library">进入资料库</Link>
        </Card>
      </section>
    </Container>
  );
}
