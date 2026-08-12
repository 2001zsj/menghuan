import { describe, expect, it } from "vitest";
import type { AnimeRepository } from "../src/repository/types.js";

export function defineAnimeRepositoryContract(
  label: string,
  createRepository: () => AnimeRepository | Promise<AnimeRepository>,
): void {
  describe(`${label} AnimeRepository contract`, () => {
    it("lists the ten fixtures in a deterministic order without duplicates", async () => {
      const repository = await createRepository();
      const first = await repository.listAnime();
      const second = await repository.listAnime();
      expect(first).toHaveLength(10);
      expect(second.map((item) => item.anime.id)).toEqual(first.map((item) => item.anime.id));
      expect(new Set(first.map((item) => item.anime.id)).size).toBe(first.length);
      expect(first[0]?.anime.id).toBe("mock-moonlit-archive");
    });

    it("gets anime by slug and id with detail relations", async () => {
      const repository = await createRepository();
      const bySlug = await repository.getAnimeBySlug("moonlit-archive");
      const byId = await repository.getAnimeById("mock-moonlit-archive");
      expect(bySlug).toEqual(byId);
      expect(bySlug?.staffCredits).toHaveLength(2);
      expect(bySlug?.castCredits).toHaveLength(2);
      expect(bySlug?.episodes).toHaveLength(2);
      expect(bySlug?.resourceCategories).toEqual(["official_site", "encyclopedia", "database"]);
    });

    it("returns null for invalid or missing records", async () => {
      const repository = await createRepository();
      await expect(repository.getAnimeBySlug("missing-record")).resolves.toBeNull();
      await expect(repository.getAnimeBySlug("INVALID SLUG")).resolves.toBeNull();
      await expect(repository.getAnimeById("missing-id")).resolves.toBeNull();
    });

    it("lists the same deterministic slug set as listAnime", async () => {
      const repository = await createRepository();
      const records = await repository.listAnime();
      await expect(repository.listAnimeSlugs()).resolves.toEqual(
        records.map((item) => item.anime.slug),
      );
    });
  });
}
