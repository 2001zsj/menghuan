import { z } from "zod";

export const FAVORITES_STORAGE_KEY = "menghuan:favorites:v1";
const favoriteItemSchema = z.object({ animeId: z.string().min(1), addedAt: z.string().datetime() });
const favoritesSchema = z.object({ version: z.literal(1), items: z.array(favoriteItemSchema) });

export interface FavoriteItem {
  animeId: string;
  addedAt: string;
}
export interface FavoritesState {
  version: 1;
  items: FavoriteItem[];
}
export const EMPTY_FAVORITES: FavoritesState = { version: 1, items: [] };

export function parseFavorites(raw: string | null): FavoritesState {
  if (!raw) return EMPTY_FAVORITES;
  try {
    const result = favoritesSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : EMPTY_FAVORITES;
  } catch {
    return EMPTY_FAVORITES;
  }
}

export function addFavorite(
  state: FavoritesState,
  animeId: string,
  addedAt = new Date().toISOString(),
): FavoritesState {
  if (state.items.some((item) => item.animeId === animeId)) return state;
  return favoritesSchema.parse({ version: 1, items: [...state.items, { animeId, addedAt }] });
}

export function removeFavorite(state: FavoritesState, animeId: string): FavoritesState {
  return { version: 1, items: state.items.filter((item) => item.animeId !== animeId) };
}

export function serializeFavorites(state: FavoritesState): string {
  return JSON.stringify(favoritesSchema.parse(state));
}
