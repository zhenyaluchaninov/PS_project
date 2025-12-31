import type { SearchParamLike } from "../types";

export const paramIsTruthy = (value?: string | null) =>
  value ? ["1", "true", "yes", "on"].includes(value.toLowerCase()) : false;

export const readBooleanParam = (params: SearchParamLike, keys: string[]) => {
  if (!params) return undefined;
  for (const key of keys) {
    if (params.has(key)) {
      return paramIsTruthy(params.get(key));
    }
  }
  return undefined;
};

export const readNumberParam = (
  params: SearchParamLike,
  key: string
): number | null => {
  if (!params) return null;
  const raw = params.get(key);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

export const resolveSoundParam = (params: SearchParamLike) => {
  const mute = readBooleanParam(params, ["mute", "muted"]);
  if (mute !== undefined) {
    return !mute;
  }
  return readBooleanParam(params, ["sound", "audio", "soundEnabled"]);
};
