"use client";

import { useMemo, useState } from "react";
import { Container, EmptyState, Select } from "@menghuan/ui";
import { AnimeCardGrid } from "@/components/anime-card-grid";
import { MockBanner } from "@/components/mock-banner";
import { stage2MockAnime } from "@/mocks/stage2";

export default function SeasonPage() {
  const [year, setYear] = useState("2026");
  const [quarter, setQuarter] = useState("夏");
  const [format, setFormat] = useState("all");
  const [status, setStatus] = useState("all");
  const items = useMemo(
    () =>
      stage2MockAnime.filter(
        (anime) =>
          anime.season.year === Number(year) &&
          anime.season.quarter === quarter &&
          (format === "all" || anime.format === format) &&
          (status === "all" || anime.status === status),
      ),
    [year, quarter, format, status],
  );

  return (
    <Container className="page-shell">
      <MockBanner />
      <header className="page-header">
        <h1>季度新番</h1>
        <p>以视觉筛选骨架验证年份、季度、类型和状态的组合关系。</p>
      </header>
      <div className="toolbar">
        <Select label="年份" value={year} onChange={(event) => setYear(event.target.value)}>
          <option value="2026">2026</option>
          <option value="2025">2025（空状态）</option>
        </Select>
        <Select label="季度" value={quarter} onChange={(event) => setQuarter(event.target.value)}>
          <option value="春">春</option>
          <option value="夏">夏</option>
          <option value="秋">秋</option>
          <option value="冬">冬</option>
        </Select>
        <Select label="类型" value={format} onChange={(event) => setFormat(event.target.value)}>
          <option value="all">全部类型</option>
          <option value="TV">TV</option>
          <option value="短篇">短篇</option>
          <option value="剧场版">剧场版</option>
        </Select>
        <Select label="状态" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">全部状态</option>
          <option value="放送中">放送中</option>
          <option value="完结">完结</option>
          <option value="未放送">未放送</option>
        </Select>
      </div>
      <section className="page-section" aria-labelledby="season-results-heading">
        <h2 id="season-results-heading" className="mh-results-heading">
          Mock作品
        </h2>
        {items.length ? (
          <AnimeCardGrid items={items} />
        ) : (
          <EmptyState
            title="没有符合筛选的Mock作品"
            description="筛选结果为空时不自动放宽条件，也不生成虚假资料。"
          />
        )}
      </section>
    </Container>
  );
}
