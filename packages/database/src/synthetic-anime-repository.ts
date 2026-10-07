import type { AnimeRepository } from "@menghuan/domain";
import type { SyntheticYucStore } from "./synthetic-yuc-store.js";

export class SyntheticAnimeRepository implements AnimeRepository {
  constructor(
    private readonly baseline: AnimeRepository,
    private readonly store: Pick<SyntheticYucStore, "adoptedPages">,
  ) {}
  async listAnime() {
    const [base, adopted] = await Promise.all([
      this.baseline.listAnime(),
      this.store.adoptedPages(),
    ]);
    const baseIds = new Set(base.map((item) => item.anime.id));
    const baseSlugs = new Set(base.map((item) => item.anime.slug));
    if (adopted.some((item) => baseIds.has(item.anime.id) || baseSlugs.has(item.anime.slug)))
      throw new Error("Synthetic mapping collides with baseline");
    return [...base, ...adopted];
  }
  async getAnimeBySlug(slug: string) {
    return (await this.listAnime()).find((item) => item.anime.slug === slug) ?? null;
  }
  async getAnimeById(id: string) {
    return (await this.listAnime()).find((item) => item.anime.id === id) ?? null;
  }
  async listAnimeSlugs() {
    return (await this.listAnime()).map((item) => item.anime.slug);
  }
}
