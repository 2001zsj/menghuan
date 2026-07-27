"use client";
import { AnimeCard } from "@menghuan/ui";
import type { Stage2MockAnime } from "@/mocks/stage2";
import { useFavorites } from "@/providers/favorites-provider";
export function AnimeCardGrid({ items }: { items: Stage2MockAnime[] }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  return (
    <div className="anime-grid">
      {items.map((anime) => (
        <AnimeCard
          key={anime.id}
          title={anime.title}
          alias={anime.alias}
          href={`/anime/${anime.slug}`}
          status={anime.status}
          format={anime.format}
          tags={anime.tags}
          isFavorite={isFavorite(anime.id)}
          onFavoriteToggle={() => toggleFavorite(anime.id)}
        />
      ))}
    </div>
  );
}
