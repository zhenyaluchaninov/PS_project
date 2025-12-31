import { useEffect, useMemo, useState } from "react";
import type { PlayerPreferences, SearchParamLike } from "../types";
import { readBooleanParam, resolveSoundParam } from "../utils/paramHelpers";
import {
  persistPreferences,
  preferenceStorageKey,
  readStoredPreferences,
} from "../utils/preferences";

type UsePlayerPreferencesParams = {
  searchParams: SearchParamLike;
  adventureSlug?: string | null;
  adventureViewSlug?: string | null;
};

export const usePlayerPreferences = ({
  searchParams,
  adventureSlug,
  adventureViewSlug,
}: UsePlayerPreferencesParams) => {
  const preferenceKey = useMemo(
    () => preferenceStorageKey(adventureSlug, adventureViewSlug),
    [adventureSlug, adventureViewSlug]
  );

  const [preferences, setPreferences] = useState<PlayerPreferences>(() => {
    const stored = readStoredPreferences(preferenceKey);
    const queryHighContrast = readBooleanParam(searchParams, ["hc", "highContrast"]);
    const queryHideBackground = readBooleanParam(searchParams, ["hideBg", "hidebg"]);
    const soundOverride = resolveSoundParam(searchParams);

    return {
      highContrast: queryHighContrast ?? stored?.highContrast,
      hideBackground: queryHideBackground ?? stored?.hideBackground,
      soundEnabled: soundOverride ?? stored?.soundEnabled ?? true,
      statisticsEnabled: stored?.statisticsEnabled ?? true,
    };
  });

  useEffect(() => {
    if (!preferenceKey) return;
    const stored = readStoredPreferences(preferenceKey);
    if (!stored) return;
    setPreferences((prev) => ({
      highContrast: prev.highContrast ?? stored.highContrast,
      hideBackground: prev.hideBackground ?? stored.hideBackground,
      soundEnabled: prev.soundEnabled ?? stored.soundEnabled ?? true,
      statisticsEnabled: prev.statisticsEnabled ?? stored.statisticsEnabled ?? true,
    }));
  }, [preferenceKey]);

  useEffect(() => {
    const queryHighContrast = readBooleanParam(searchParams, ["hc", "highContrast"]);
    const queryHideBackground = readBooleanParam(searchParams, ["hideBg", "hidebg"]);
    const soundOverride = resolveSoundParam(searchParams);

    if (
      queryHighContrast === undefined &&
      queryHideBackground === undefined &&
      soundOverride === undefined
    ) {
      return;
    }

    setPreferences((prev) => {
      const next = { ...prev };
      let changed = false;
      if (queryHighContrast !== undefined && queryHighContrast !== prev.highContrast) {
        next.highContrast = queryHighContrast;
        changed = true;
      }
      if (queryHideBackground !== undefined && queryHideBackground !== prev.hideBackground) {
        next.hideBackground = queryHideBackground;
        changed = true;
      }
      if (soundOverride !== undefined && soundOverride !== prev.soundEnabled) {
        next.soundEnabled = soundOverride;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [searchParams]);

  useEffect(() => {
    if (!preferenceKey) return;
    persistPreferences(preferenceKey, preferences);
  }, [preferenceKey, preferences]);

  return { preferences, setPreferences };
};
