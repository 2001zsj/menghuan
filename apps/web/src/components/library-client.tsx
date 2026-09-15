"use client";

import { useMemo, useState } from "react";
import { animeMediaTypeLabel, animeReleaseStatusLabel, type AnimePageData } from "@menghuan/domain";
import { EmptyState, Select } from "@menghuan/ui";
import { AnimeCardGrid } from "@/components/anime-card-grid";

export function LibraryClient({ records }: { records: AnimePageData[] }) {
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState("all");
  const [status, setStatus] = useState("all");
  const items = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("zh-CN");
    return records.filter(
      (item) =>
        (!normalized ||
          `${item.anime.title} ${item.anime.aliases.join(" ")} ${item.anime.tags.join(" ")}`
            .toLocaleLowerCase("zh-CN")
            .includes(normalized)) &&
        (format === "all" || animeMediaTypeLabel(item.anime.mediaType) === format) &&
        (status === "all" || animeReleaseStatusLabel(item.anime.releaseStatus) === status),
    );
  }, [records, query, format, status]);

  return (
    <>
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
            description="这是纯前端空结果状态；当前阶段不实现正式搜索索引。"
          />
        )}
      </section>
    </>
  );
}
