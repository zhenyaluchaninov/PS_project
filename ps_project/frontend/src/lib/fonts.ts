const FONT_PREFIX = "xfont-";
const URL_PREFIX = /^https?:\/\//i;

const isUrlLike = (value: string) => URL_PREFIX.test(value) || value.startsWith("/");

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const stripMediaUrl = (url: string) => url.split(/[?#]/)[0] ?? "";

export const getUrlBasename = (url: string) => {
  const trimmed = stripMediaUrl(url);
  const parts = trimmed.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
};

const stripExtension = (value: string) => value.replace(/\.[^/.]+$/, "");

const getFontBaseName = (entry: string) => {
  const trimmed = entry.trim();
  if (!trimmed) return "";
  const candidate = isUrlLike(trimmed) ? getUrlBasename(trimmed) : trimmed;
  return safeDecode(candidate);
};

export const getFontDisplayName = (entry: string) => {
  const base = getFontBaseName(entry);
  return base ? stripExtension(base) : "";
};

export const sanitizeFontName = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const decoded = safeDecode(trimmed);
  const withoutExt = stripExtension(decoded);
  return withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const getFontFamilyToken = (entry: string) => {
  const baseName = getFontDisplayName(entry) || getFontBaseName(entry);
  const normalized = sanitizeFontName(baseName);
  if (!normalized) return "";
  return normalized.startsWith(FONT_PREFIX) ? normalized : `${FONT_PREFIX}${normalized}`;
};

const getFontFormat = (url: string) => {
  const clean = stripMediaUrl(url).toLowerCase();
  const ext = clean.split(".").pop() ?? "";
  if (ext === "woff2") return "woff2";
  if (ext === "woff") return "woff";
  if (ext === "ttf") return "truetype";
  if (ext === "otf") return "opentype";
  return null;
};

export type FontMeta = {
  url?: string;
  fileName: string;
  displayName: string;
  family: string;
  format?: string | null;
};

export const getFontMeta = (entry: string): FontMeta | null => {
  const trimmed = entry.trim();
  if (!trimmed) return null;
  const fileName = getFontBaseName(trimmed);
  const displayName = stripExtension(fileName);
  const family = getFontFamilyToken(trimmed);
  if (!family) return null;
  const url = isUrlLike(trimmed) ? trimmed : undefined;
  const format = url ? getFontFormat(trimmed) : null;
  return {
    url,
    fileName,
    displayName,
    family,
    format,
  };
};

export const buildFontFaceRules = (entries: string[]) => {
  const rules: string[] = [];
  const used = new Set<string>();

  entries.forEach((entry) => {
    const meta = getFontMeta(entry);
    if (!meta?.url || !meta.family) return;
    if (used.has(meta.family)) return;
    used.add(meta.family);
    const src = meta.format
      ? `url("${meta.url}") format("${meta.format}")`
      : `url("${meta.url}")`;
    rules.push(
      `@font-face { font-family: "${meta.family}"; src: ${src}; font-display: swap; }`
    );
  });

  return rules.join("\n");
};
