"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import {
  addFavorite,
  EMPTY_FAVORITES,
  FAVORITES_STORAGE_KEY,
  parseFavorites,
  removeFavorite,
  serializeFavorites,
  type FavoritesState,
} from "@/lib/favorites";

interface FavoritesContextValue {
  state: FavoritesState;
  isFavorite: (animeId: string) => boolean;
  toggleFavorite: (animeId: string) => void;
  remove: (animeId: string) => void;
}
const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FavoritesState>(EMPTY_FAVORITES);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      setState(parseFavorites(window.localStorage.getItem(FAVORITES_STORAGE_KEY)));
    } catch {
      setState(EMPTY_FAVORITES);
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, serializeFavorites(state));
    } catch {
      // Favorites remain in memory when storage is unavailable.
    }
  }, [state, hydrated]);
  const value = useMemo<FavoritesContextValue>(
    () => ({
      state,
      isFavorite: (animeId) => state.items.some((item) => item.animeId === animeId),
      toggleFavorite: (animeId) =>
        setState((current) =>
          current.items.some((item) => item.animeId === animeId)
            ? removeFavorite(current, animeId)
            : addFavorite(current, animeId),
        ),
      remove: (animeId) => setState((current) => removeFavorite(current, animeId)),
    }),
    [state],
  );
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error("useFavorites必须在FavoritesProvider中使用");
  return value;
}
