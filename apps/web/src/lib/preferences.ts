import { z } from "zod";
import { DISPLAY_TIMEZONES, type DisplayTimezone } from "./timezone";

export const UI_PREFERENCES_STORAGE_KEY = "menghuan:ui-preferences:v1";
export const THEMES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEMES)[number];

const preferencesSchema = z.object({
  version: z.literal(1),
  theme: z.enum(THEMES),
  timezone: z.enum(DISPLAY_TIMEZONES),
});

export interface UiPreferences {
  version: 1;
  theme: ThemePreference;
  timezone: DisplayTimezone;
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  version: 1,
  theme: "system",
  timezone: "Asia/Shanghai",
};

export function parseUiPreferences(raw: string | null): UiPreferences {
  if (!raw) return DEFAULT_UI_PREFERENCES;
  try {
    const result = preferencesSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : DEFAULT_UI_PREFERENCES;
  } catch {
    return DEFAULT_UI_PREFERENCES;
  }
}

export function serializeUiPreferences(value: UiPreferences): string {
  return JSON.stringify(preferencesSchema.parse(value));
}
