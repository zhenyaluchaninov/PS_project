import type { PropsInput } from "@/features/ui-core/props";

export const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const parsePropsInput = (input?: PropsInput | null): Record<string, unknown> => {
  if (!input) return {};
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as unknown;
      return isPlainRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return isPlainRecord(input) ? input : {};
};

export const tokenize = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (value === undefined || value === null) return [];
  const str = String(value).trim();
  return str ? [str] : [];
};

export const readRawProp = (
  raw: Record<string, unknown> | null | undefined,
  keys: string[]
) => {
  if (!raw) return undefined;
  for (const key of keys) {
    const variants = [key, key.replace(/\./g, "_"), key.replace(/\./g, "-")];
    for (const variant of variants) {
      if (variant in raw) {
        return raw[variant];
      }
    }
  }
  return undefined;
};

export const booleanFromTokens = (value: unknown): boolean => {
  const tokens = tokenize(value).map((token) => token.toLowerCase());
  return tokens.some(
    (token) => token === "true" || token === "on" || token === "1" || token === "yes"
  );
};

export const pickFirstString = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const found = value.find((item) => typeof item === "string" && String(item).trim());
    if (typeof found === "string" && found.trim()) return found.trim();
  }
  return null;
};
