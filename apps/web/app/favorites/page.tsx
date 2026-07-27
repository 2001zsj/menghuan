"use client";

import { Container, EmptyState } from "@menghuan/ui";
import { AnimeCardGrid } from "@/components/anime-card-grid";
import { MockBanner } from "@/components/mock-banner";
import { stage2MockAnime, type Stage2MockAnime } from "@/mocks/stage2";
import { useFavorites } from "@/providers/favorites-provider";

export default function FavoritesPage() {
  const { state } = useFavorites();
  const items = state.items
    .map((favorite) => stage2MockAnime.find((anime) => anime.id === favorite.animeId))
    .filter((anime): anime is Stage2MockAnime => Boolean(anime));

  return (
    <Container className="page-shell">
      <MockBanner />
      <header className="page-header">
        <h1>我的收藏</h1>
        <p>收藏仅保存在当前浏览器，不需要账户、登录、Session或服务端API。</p>
      </header>
      <aside className="favorites-note">
        <p>清除浏览器站点数据会同时清除收藏。本阶段不提供多设备同步。</p>
      </aside>
      <section className="page-section" aria-labelledby="favorites-results-heading">
        <h2 id="favorites-results-heading" className="mh-results-heading">
          已收藏作品
        </h2>
        {items.length ? (
          <AnimeCardGrid items={items} />
        ) : (
          <EmptyState
            title="还没有收藏"
            description="进入任意Mock详情页，主动点击“收藏”后才会出现在这里。"
          />
        )}
      </section>
    </Container>
  );
}
