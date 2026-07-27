"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_UI_PREFERENCES,
  parseUiPreferences,
  serializeUiPreferences,
  type ThemePreference,
  type UiPreferences,
  UI_PREFERENCES_STORAGE_KEY,
} from "@/lib/preferences";
import type { DisplayTimezone } from "@/lib/timezone";

interface UiPreferencesContextValue extends UiPreferences {
  setTheme: (theme: ThemePreference) => void;
  setTimezone: (timezone: DisplayTimezone) => void;
}
const UiPreferencesContext = createContext<UiPreferencesContextValue | null>(null);

export function UiPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UiPreferences>(DEFAULT_UI_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let stored = DEFAULT_UI_PREFERENCES;
    try {
      stored = parseUiPreferences(window.localStorage.getItem(UI_PREFERENCES_STORAGE_KEY));
    } catch {
      stored = DEFAULT_UI_PREFERENCES;
    }
    setPreferences(stored);
    document.documentElement.dataset.theme = stored.theme;
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = preferences.theme;
    try {
      window.localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, serializeUiPreferences(preferences));
    } catch {
      // The UI remains usable when storage is unavailable.
    }
  }, [preferences, hydrated]);
  const value = useMemo(
    () => ({
      ...preferences,
      setTheme: (theme: ThemePreference) => setPreferences((current) => ({ ...current, theme })),
      setTimezone: (timezone: DisplayTimezone) =>
        setPreferences((current) => ({ ...current, timezone })),
    }),
    [preferences],
  );
  return <UiPreferencesContext.Provider value={value}>{children}</UiPreferencesContext.Provider>;
}

export function useUiPreferences() {
  const value = useContext(UiPreferencesContext);
  if (!value) throw new Error("useUiPreferences必须在UiPreferencesProvider中使用");
  return value;
}
