"use client";

import {
  animeMediaTypeLabel,
  animeReleaseStatusLabel,
  episodePublicationStatusLabel,
  seasonQuarterLabel,
  type AnimePageData,
  type ResourceCategory,
} from "@menghuan/domain";
import { Badge, Card, FavoriteButton, PosterPlaceholder, SectionHeader } from "@menghuan/ui";
import { formatBroadcastTime, timezoneLabel } from "@/lib/timezone";
import { useFavorites } from "@/providers/favorites-provider";
import { useUiPreferences } from "@/providers/ui-preferences-provider";

const resourceLabels: Record<ResourceCategory, string> = {
  official_site: "官方网站",
  official_social: "官方社交账号",
  official_video_channel: "官方视频频道",
  broadcaster: "播出机构",
  verified_licensed_streaming: "已核验授权平台",
  distributor: "发行方",
  encyclopedia: "百科",
  rating_site: "评分网站",
  database: "资料数据库",
  news: "新闻",
  search: "搜索",
  approved_other: "其他经批准类别",
};

export function AnimeDetailClient({ item }: { item: AnimePageData }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { timezone } = useUiPreferences();
  const time = formatBroadcastTime(item.broadcast?.normalizedStartAt ?? null, timezone);
  const alias = item.anime.aliases[0] ?? "";

  return (
    <>
      <section className="detail-hero">
        <div className="detail-poster">
          <PosterPlaceholder title={item.anime.title} />
        </div>
        <div className="detail-summary">
          <div className="detail-badges">
            <Badge tone="warning">完全虚构Mock</Badge>
            <Badge>{animeMediaTypeLabel(item.anime.mediaType)}</Badge>
            <Badge tone="success">{animeReleaseStatusLabel(item.anime.releaseStatus)}</Badge>
          </div>
          <h1>{item.anime.title}</h1>
          <p className="detail-alias">{alias}</p>
          <p>{item.anime.synopsis}</p>
          <dl className="detail-facts">
            <div>
              <dt>季度</dt>
              <dd>
                {item.season
                  ? `${item.season.year}年${seasonQuarterLabel(item.season.quarter)}季`
                  : "季度待定"}
              </dd>
            </div>
            <div>
              <dt>展示时间</dt>
              <dd>{time.isTbd ? "时间待定" : `${timezoneLabel(timezone)} ${time.text}`}</dd>
            </div>
            <div>
              <dt>原始表达</dt>
              <dd>{item.broadcast?.originalExpression ?? "原始时间待定"}</dd>
            </div>
          </dl>
          <FavoriteButton
            active={isFavorite(item.anime.id)}
            onClick={() => toggleFavorite(item.anime.id)}
          />
        </div>
      </section>
      <section className="page-section">
        <SectionHeader title="STAFF" description="以下姓名均为界面演示所需的虚构人物。" />
        <Card className="definition-list">
          {item.staffCredits.map((credit) => (
            <dl key={credit.id}>
              <dt>{credit.role}</dt>
              <dd>{credit.name}</dd>
            </dl>
          ))}
        </Card>
      </section>
      <section className="page-section">
        <SectionHeader title="CAST" description="角色和配音人员均为虚构。" />
        <Card className="definition-list">
          {item.castCredits.map((credit) => (
            <dl key={credit.id}>
              <dt>{credit.characterName}</dt>
              <dd>{credit.performerName}</dd>
            </dl>
          ))}
        </Card>
      </section>
      <section className="page-section">
        <SectionHeader title="剧集列表骨架" description="阶段3仅建立页面所需的最小剧集记录。" />
        <Card className="episode-list">
          {item.episodes.length ? (
            item.episodes.map((episode) => (
              <article key={episode.id}>
                <span>
                  {episode.displayNumber === "完整篇"
                    ? episode.displayNumber
                    : `第${episode.displayNumber}话`}
                </span>
                <strong>{episode.title}</strong>
                <Badge tone={episode.publicationStatus === "published" ? "success" : "neutral"}>
                  {episodePublicationStatusLabel(episode.publicationStatus)}
                </Badge>
              </article>
            ))
          ) : (
            <p>剧集信息待定，未生成虚假集数。</p>
          )}
        </Card>
      </section>
      <section className="page-section">
        <SectionHeader
          title="外部资源分类骨架"
          description="仅显示安全类别名称；阶段3仍不添加任何真实外链。"
        />
        <div className="resource-grid">
          {item.resourceCategories.map((category) => (
            <Card key={category} className="resource-placeholder">
              <strong>{resourceLabels[category]}</strong>
              <span>链接待核验，当前禁用</span>
              <button disabled type="button">
                尚未接入
              </button>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
