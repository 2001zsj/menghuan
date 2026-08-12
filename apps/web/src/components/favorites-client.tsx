"use client";

import { useMemo } from "react";
import type { AnimePageData } from "@menghuan/domain";
import { EmptyState } from "@menghuan/ui";
import { AnimeCardGrid } from "@/components/anime-card-grid";
import { useFavorites } from "@/providers/favorites-provider";

export function FavoritesClient({ records }: { records: AnimePageData[] }) {
  const { state } = useFavorites();
  const byId = useMemo(() => new Map(records.map((item) => [item.anime.id, item])), [records]);
  const items = state.items
    .map((favorite) => byId.get(favorite.animeId))
    .filter((item): item is AnimePageData => Boolean(item));

  return (
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
  );
}
