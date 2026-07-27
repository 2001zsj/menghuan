import { describe, expect, it } from "vitest";
import { addFavorite, EMPTY_FAVORITES, parseFavorites, removeFavorite } from "./favorites";
describe("local favorites", () => {
  it("adds a favorite only after an explicit operation", () => {
    const next = addFavorite(EMPTY_FAVORITES, "mock-one", "2026-07-26T00:00:00.000Z");
    expect(next.items).toHaveLength(1);
    expect(next.items[0]?.animeId).toBe("mock-one");
  });
  it("deduplicates repeated favorites", () => {
    const once = addFavorite(EMPTY_FAVORITES, "mock-one", "2026-07-26T00:00:00.000Z");
    const twice = addFavorite(once, "mock-one", "2026-07-27T00:00:00.000Z");
    expect(twice.items).toHaveLength(1);
  });
  it("removes a favorite", () => {
    const state = addFavorite(EMPTY_FAVORITES, "mock-one", "2026-07-26T00:00:00.000Z");
    expect(removeFavorite(state, "mock-one")).toEqual(EMPTY_FAVORITES);
  });
  it("falls back for damaged favorite data", () => {
    expect(parseFavorites("not-json")).toEqual(EMPTY_FAVORITES);
    expect(
      parseFavorites(JSON.stringify({ version: 1, items: [{ animeId: "", addedAt: "bad" }] })),
    ).toEqual(EMPTY_FAVORITES);
  });
});
