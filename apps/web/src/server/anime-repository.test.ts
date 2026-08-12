import { afterEach, describe, expect, it, vi } from "vitest";
import { getAnimeRepository } from "./anime-repository";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("web anime repository composition root", () => {
  it("uses the fixture repository by default without a database URL", async () => {
    vi.stubEnv("MENGHUAN_DATA_REPOSITORY", "mock");
    vi.stubEnv("DATABASE_URL", "");
    const repository = await getAnimeRepository();
    await expect(repository.listAnime()).resolves.toHaveLength(10);
  });
});
