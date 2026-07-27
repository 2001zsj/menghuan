"use client";

import { useMemo, useState } from "react";
import { Container, EmptyState, Select } from "@menghuan/ui";
import { AnimeCardGrid } from "@/components/anime-card-grid";
import { MockBanner } from "@/components/mock-banner";
import { stage2MockAnime } from "@/mocks/stage2";

export default function LibraryPage() {
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState("all");
  const [status, setStatus] = useState("all");
  const items = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("zh-CN");
    return stage2MockAnime.filter(
      (anime) =>
        (!normalized ||
          `${anime.title} ${anime.alias} ${anime.tags.join(" ")}`
            .toLocaleLowerCase("zh-CN")
            .includes(normalized)) &&
        (format === "all" || anime.format === format) &&
        (status === "all" || anime.status === status),
    );
  }, [query, format, status]);

  return (
    <Container className="page-shell">
      <MockBanner />
      <header className="page-header">
        <h1>番剧资料库</h1>
        <p>当前仅为浏览器内Mock筛选，不是正式全局搜索，也不调用服务端搜索API。</p>
      </header>
      <div className="toolbar">
        <label className="search-field toolbar__grow">
          <span>搜索Mock标题、别名或标签</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例如：幻想、月灯、Archive"
          />
        </label>
        <Select label="分类" value={format} onChange={(event) => setFormat(event.target.value)}>
          <option value="all">全部分类</option>
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
      <section className="page-section" aria-labelledby="library-results-heading">
        <h2 id="library-results-heading" className="mh-results-heading">
          资料结果
        </h2>
        {items.length ? (
          <AnimeCardGrid items={items} />
        ) : (
          <EmptyState
            title="没有匹配结果"
            description="这是纯前端空结果状态；阶段2不会实现正式搜索索引。"
          />
        )}
      </section>
    </Container>
  );
}
