import { animePageDataArraySchema, animePageDataSchema, type AnimePageData } from "./schemas.js";

export function parseAnimePageData(value: unknown): AnimePageData {
  return animePageDataSchema.parse(value);
}

export function parseAnimePageDataList(value: unknown): AnimePageData[] {
  return animePageDataArraySchema.parse(value);
}

export function serializeAnimePageData(value: AnimePageData): AnimePageData {
  return animePageDataSchema.parse(structuredClone(value));
}

export function serializeAnimePageDataList(value: readonly AnimePageData[]): AnimePageData[] {
  return animePageDataArraySchema.parse(structuredClone(value));
}
