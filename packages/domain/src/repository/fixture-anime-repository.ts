import { stage3AnimeFixture } from "../fixtures/stage3.js";
import { animeSlugSchema, type AnimePageData } from "../schemas.js";
import { serializeAnimePageData, serializeAnimePageDataList } from "../serialization.js";
import type { AnimeRepository } from "./types.js";

function compareAnime(left: AnimePageData, right: AnimePageData): number {
  return (
    left.anime.createdAt.localeCompare(right.anime.createdAt) ||
    left.anime.id.localeCompare(right.anime.id)
  );
}

export class FixtureAnimeRepository implements AnimeRepository {
  private readonly records: AnimePageData[];

  constructor(records: readonly AnimePageData[] = stage3AnimeFixture) {
    this.records = serializeAnimePageDataList(records).sort(compareAnime);
  }

  async listAnime(): Promise<AnimePageData[]> {
    return serializeAnimePageDataList(this.records);
  }

  async getAnimeBySlug(slug: string): Promise<AnimePageData | null> {
    const parsed = animeSlugSchema.safeParse(slug);
    if (!parsed.success) return null;
    const record = this.records.find((item) => item.anime.slug === parsed.data);
    return record ? serializeAnimePageData(record) : null;
  }

  async getAnimeById(id: string): Promise<AnimePageData | null> {
    const record = this.records.find((item) => item.anime.id === id);
    return record ? serializeAnimePageData(record) : null;
  }

  async listAnimeSlugs(): Promise<string[]> {
    return this.records.map((item) => item.anime.slug);
  }
}
