import type { PlayerPreferences } from "../types";

export const preferenceStorageKey = (
  slug?: string | null,
  viewSlug?: string | null
) => {
  const key = slug || viewSlug;
  return key ? `ps-player:prefs:${key}` : null;
};

export const readStoredPreferences = (
  key?: string | null
): PlayerPreferences | null => {
  if (!key) return null;
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlayerPreferences>;
    return {
      highContrast:
        typeof parsed.highContrast === "boolean" ? parsed.highContrast : undefined,
      hideBackground:
        typeof parsed.hideBackground === "boolean" ? parsed.hideBackground : undefined,
      soundEnabled: typeof parsed.soundEnabled === "boolean" ? parsed.soundEnabled : true,
      statisticsEnabled:
        typeof parsed.statisticsEnabled === "boolean"
          ? parsed.statisticsEnabled
          : undefined,
    };
  } catch (err) {
    console.warn("[player] could not read stored preferences", err);
    return null;
  }
};

export const persistPreferences = (key: string, prefs: PlayerPreferences) => {
  if (typeof window === "undefined") return;
  try {
    const payload: PlayerPreferences = {
      soundEnabled: prefs.soundEnabled ?? true,
    };
    if (typeof prefs.highContrast === "boolean") {
      payload.highContrast = prefs.highContrast;
    }
    if (typeof prefs.hideBackground === "boolean") {
      payload.hideBackground = prefs.hideBackground;
    }
    if (typeof prefs.statisticsEnabled === "boolean") {
      payload.statisticsEnabled = prefs.statisticsEnabled;
    }
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.warn("[player] could not persist preferences", err);
  }
};

export const writeStoredPreferences = persistPreferences;
