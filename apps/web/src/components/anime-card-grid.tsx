"use client";

import { animeMediaTypeLabel, animeReleaseStatusLabel, type AnimePageData } from "@menghuan/domain";
import { AnimeCard } from "@menghuan/ui";
import { useFavorites } from "@/providers/favorites-provider";

export function AnimeCardGrid({ items }: { items: AnimePageData[] }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  return (
    <div className="anime-grid">
      {items.map((item) => (
        <AnimeCard
          key={item.anime.id}
          title={item.anime.title}
          alias={item.anime.aliases[0] ?? ""}
          href={`/anime/${item.anime.slug}`}
          status={animeReleaseStatusLabel(item.anime.releaseStatus)}
          format={animeMediaTypeLabel(item.anime.mediaType)}
          tags={item.anime.tags}
          isFavorite={isFavorite(item.anime.id)}
          onFavoriteToggle={() => toggleFavorite(item.anime.id)}
        />
      ))}
    </div>
  );
}
