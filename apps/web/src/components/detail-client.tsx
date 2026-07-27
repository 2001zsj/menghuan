"use client";
import { Badge, Card, FavoriteButton, PosterPlaceholder, SectionHeader } from "@menghuan/ui";
import type { MockResourceCategory, Stage2MockAnime } from "@/mocks/stage2";
import { useFavorites } from "@/providers/favorites-provider";
import { useUiPreferences } from "@/providers/ui-preferences-provider";
import { formatBroadcastTime, timezoneLabel } from "@/lib/timezone";

const resourceLabels: Record<MockResourceCategory, string> = {
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

export function AnimeDetailClient({ anime }: { anime: Stage2MockAnime }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { timezone } = useUiPreferences();
  const time = formatBroadcastTime(anime.broadcast.normalizedIso, timezone);
  return (
    <>
      <section className="detail-hero">
        <div className="detail-poster">
          <PosterPlaceholder title={anime.title} />
        </div>
        <div className="detail-summary">
          <div className="detail-badges">
            <Badge tone="warning">完全虚构Mock</Badge>
            <Badge>{anime.format}</Badge>
            <Badge tone="success">{anime.status}</Badge>
          </div>
          <h1>{anime.title}</h1>
          <p className="detail-alias">{anime.alias}</p>
          <p>{anime.synopsis}</p>
          <dl className="detail-facts">
            <div>
              <dt>季度</dt>
              <dd>
                {anime.season.year}年{anime.season.quarter}季
              </dd>
            </div>
            <div>
              <dt>展示时间</dt>
              <dd>{time.isTbd ? "时间待定" : `${timezoneLabel(timezone)} ${time.text}`}</dd>
            </div>
            <div>
              <dt>原始表达</dt>
              <dd>{anime.broadcast.originalText}</dd>
            </div>
          </dl>
          <FavoriteButton active={isFavorite(anime.id)} onClick={() => toggleFavorite(anime.id)} />
        </div>
      </section>
      <section className="page-section">
        <SectionHeader title="STAFF" description="以下姓名均为界面演示所需的虚构人物。" />
        <Card className="definition-list">
          {anime.staff.map((item) => (
            <dl key={`${item.role}-${item.name}`}>
              <dt>{item.role}</dt>
              <dd>{item.name}</dd>
            </dl>
          ))}
        </Card>
      </section>
      <section className="page-section">
        <SectionHeader title="CAST" description="角色和配音人员均为虚构。" />
        <Card className="definition-list">
          {anime.cast.map((item) => (
            <dl key={`${item.character}-${item.performer}`}>
              <dt>{item.character}</dt>
              <dd>{item.performer}</dd>
            </dl>
          ))}
        </Card>
      </section>
      <section className="page-section">
        <SectionHeader title="剧集列表骨架" description="阶段2不建立正式剧集数据库。" />
        <Card className="episode-list">
          {anime.episodes.length ? (
            anime.episodes.map((episode) => (
              <article key={episode.number}>
                <span>第{episode.number}话</span>
                <strong>{episode.title}</strong>
                <Badge tone={episode.state === "已更新" ? "success" : "neutral"}>
                  {episode.state}
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
          description="仅显示安全类别名称；阶段2不添加任何真实外链。"
        />
        <div className="resource-grid">
          {anime.resourceCategories.map((category) => (
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
