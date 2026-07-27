"use client";
import type { ReactNode } from "react";
import { FavoritesProvider } from "./favorites-provider";
import { UiPreferencesProvider } from "./ui-preferences-provider";
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <UiPreferencesProvider>
      <FavoritesProvider>{children}</FavoritesProvider>
    </UiPreferencesProvider>
  );
}
