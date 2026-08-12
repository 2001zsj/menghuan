import type { AnimePageData } from "../schemas.js";

export interface AnimeRepository {
  listAnime(): Promise<AnimePageData[]>;
  getAnimeBySlug(slug: string): Promise<AnimePageData | null>;
  getAnimeById(id: string): Promise<AnimePageData | null>;
  listAnimeSlugs(): Promise<string[]>;
}
