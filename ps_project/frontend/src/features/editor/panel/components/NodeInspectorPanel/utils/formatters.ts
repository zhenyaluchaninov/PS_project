export const isHexColor = (value: string): boolean =>
  /^#[0-9a-fA-F]{6}$/.test(value);

export const clampAlpha = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(value)));

export const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const stripMediaUrl = (url: string) => url.split(/[?#]/)[0] ?? "";

export const getMediaBasename = (url: string) => {
  const trimmed = stripMediaUrl(url);
  const parts = trimmed.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
};

export const isVideoMedia = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const trimmed = stripMediaUrl(url).toLowerCase();
  return trimmed.endsWith(".mp4");
};

export const getMediaLabel = (url: string | null | undefined): string => {
  if (!url) return "";
  return getMediaBasename(url) || url;
};
