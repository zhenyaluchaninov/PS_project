import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type PropsInput =
  | Record<string, unknown>
  | string
  | null
  | undefined;

export type PropsResult = {
  style: CSSProperties;
  flags: {
    highContrast: boolean;
    hideBackground: boolean;
    grayscale: boolean;
  };
  dataProps: Record<string, string>;
  layout: {
    verticalAlign: "top" | "center" | "bottom";
    containerWidthVw?: number;
    containerMarginsVw?: [number, number];
    textAlign?: "left" | "center" | "right";
    baseFontSize: string;
  };
  media: {
    filter?: string;
    objectFit: "cover" | "contain";
    backgroundPosition?: string;
    backgroundSize?: string;
  };
  typography: {
    textShadow?: string;
    fontFamily?: string;
    textBackground?: string;
    textColor?: string;
    accentColor?: string;
    overlayColor?: string;
  };
};

export const defaultCssVars = {
  background: "var(--bg)",
  surface: "var(--surface)",
  text: "var(--text)",
  muted: "var(--muted)",
  accent: "var(--accent)",
};

const normalizeAlpha = (alpha?: string | number) => {
  if (alpha === undefined || alpha === null) return 1;
  const numeric = typeof alpha === "string" ? Number(alpha) : alpha;
  if (Number.isNaN(numeric)) return 1;
  // Legacy values are often 0-100, but sometimes 0-255. Clamp to 0-1.
  if (numeric > 1 && numeric <= 100) {
    return Math.min(Math.max(numeric, 0), 100) / 100;
  }
  if (numeric > 100) {
    return Math.min(Math.max(numeric, 0), 255) / 255;
  }
  return Math.min(Math.max(numeric, 0), 1);
};

export const hexToRgba = (hex: string, alpha: number | string = 1) => {
  const normalizedHex = hex.replace("#", "");
  const expanded =
    normalizedHex.length === 3
      ? normalizedHex
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : normalizedHex;

  if (expanded.length !== 6) return hex;

  const [r, g, b] = [
    expanded.slice(0, 2),
    expanded.slice(2, 4),
    expanded.slice(4, 6),
  ].map((chunk) => parseInt(chunk, 16));

  const a = normalizeAlpha(alpha);
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
};

const parsePropInput = (input: PropsInput): Record<string, unknown> => {
  if (!input) return {};
  if (typeof input === "string") {
    try {
      return JSON.parse(input) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return input;
};

const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (value === undefined || value === null) return [];
  return [String(value)];
};

const coerceValue = (value: unknown): string | undefined => {
  const arr = toArray(value);
  return arr.length > 0 ? arr[0] : undefined;
};

const coerceNumber = (
  value: unknown,
  fallback?: number
): number | undefined => {
  const numeric = Number(coerceValue(value));
  if (Number.isFinite(numeric)) return numeric;
  return fallback;
};

const coerceNumberArray = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => coerceNumber(item))
      .filter((item): item is number => typeof item === "number");
  }

  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((item) => coerceNumber(item.trim()))
      .filter((item): item is number => typeof item === "number");
  }

  const maybeNumber = coerceNumber(value);
  return typeof maybeNumber === "number" ? [maybeNumber] : [];
};

const collectDataProps = (props: Record<string, unknown>) => {
  const dataProps: Record<string, string> = {};

  Object.entries(props).forEach(([key, rawValue]) => {
    const match = key.match(/(.*)\./);
    if (!match) return;
    const elementName = match[1];
    const value = toArray(rawValue).filter(Boolean).join(" ").trim();
    if (!value) return;
    dataProps[elementName] = dataProps[elementName]
      ? `${dataProps[elementName]} ${value}`
      : value;
  });

  return dataProps;
};

const resolveBaseFontToken = (
  props: Record<string, unknown>,
  dataProps: Record<string, string>
) => {
  const fromProps =
    coerceValue(
      props["background.base_font_size"] ??
        props["background.base-font-size"] ??
        props["base_font_size"]
    ) ?? "";

  const tokens = [
    fromProps,
    ...(dataProps.background?.split(" ").filter(Boolean) ?? []),
  ];

  return tokens.find((token) => token.includes("base-font-size"));
};

const baseFontSizeFromToken = (token?: string) => {
  const normalized = (token ?? "").toLowerCase();
  if (normalized.includes("verylarge")) return 16 / 14;
  if (normalized.includes("large")) return 14 / 14;
  if (normalized.includes("medium")) return 12 / 14;
  if (normalized.includes("small")) return 8 / 14;
  return 10 / 14;
};

const resolveBaseFontSize = (
  props: Record<string, unknown>,
  dataProps: Record<string, string>
) => {
  const token = resolveBaseFontToken(props, dataProps);
  const factor = baseFontSizeFromToken(token);
  return `clamp(15px, calc(2.5vw * ${factor.toFixed(3)}), 26px)`;
};

const pickTextShadow = (tokens: string[]) => {
  if (tokens.some((token) => token.includes("text-shadow-black"))) {
    return "0px 2px 2px rgba(0, 0, 0, 0.5)";
  }
  if (tokens.some((token) => token.includes("text-shadow-white"))) {
    return "0px 3px 3px rgba(255, 255, 255, 0.5)";
  }
  return undefined;
};

const resolveTextAlign = (tokens: string[]) => {
  if (tokens.some((token) => token.includes("align-center"))) return "center";
  if (tokens.some((token) => token.includes("align-right"))) return "right";
  if (tokens.some((token) => token.includes("align-left"))) return "left";
  return undefined;
};

const resolveBackgroundPosition = (tokens: string[]) => {
  if (tokens.includes("background-bottom")) return "center bottom";
  if (tokens.includes("background-top")) return "center top";
  if (tokens.includes("background-left")) return "left center";
  if (tokens.includes("background-right")) return "right center";
  if (tokens.includes("background-center")) return "center center";
  return undefined;
};

const mapColors = (
  props: Record<string, unknown>,
  overrides: {
    highContrast: boolean;
  }
) => {
  const styleVars: Record<string, string> = {};
  const style: CSSProperties = {};

  const get = (key: string) => coerceValue(props[key]);
  const colorWithAlpha = (
    colorKey: string,
    alphaKey?: string,
    defaultAlpha?: number
  ) => {
    const color = get(colorKey);
    if (!color) return undefined;
    const alpha = alphaKey ? get(alphaKey) : undefined;
    return hexToRgba(color, alpha ?? defaultAlpha ?? 100);
  };

  if (overrides.highContrast) {
    styleVars["--background"] = "#000000";
    styleVars["--bg"] = "#000000";
    styleVars["--text"] = "#ffffff";
    styleVars["--foreground"] = "#ffffff";
    styleVars["--accent"] = "#ffffff";
    styleVars["--accent-strong"] = "#ffffff";
    styleVars["--player-bg"] = "#000000";
    styleVars["--player-text"] = "#ffffff";
    style.backgroundColor = "#000000";
    style.color = "#ffffff";
    return { style, styleVars, overlayColor: undefined };
  }

  const background = get("color_background");
  if (background) {
    style.backgroundColor = background;
    styleVars["--background"] = background;
    styleVars["--bg"] = background;
    styleVars["--player-bg"] = background;
  }

  const foreground = colorWithAlpha("color_foreground", "alpha_foreground");
  if (foreground) {
    styleVars["--foreground"] = foreground;
    styleVars["--player-foreground"] = foreground;
  }

  const textColor = colorWithAlpha("color_text", "alpha_text");
  if (textColor) {
    style.color = textColor;
    styleVars["--text"] = textColor;
    styleVars["--player-text"] = textColor;
  }

  const textBg = colorWithAlpha(
    "color_textbackground",
    "alpha_textbackground",
    40
  );
  if (textBg) {
    styleVars["--surface"] = textBg;
    styleVars["--player-text-bg"] = textBg;
  }

  const accent = colorWithAlpha(
    "color_buttonbackground",
    "alpha_buttonbackground",
    40
  );
  if (accent) {
    styleVars["--accent"] = accent;
    styleVars["--accent-strong"] = accent;
    styleVars["--player-accent"] = accent;
  }

  const buttonText = colorWithAlpha(
    "color_buttontext",
    "alpha_buttontext",
    100
  );
  if (buttonText) {
    styleVars["--muted"] = buttonText;
  }

  return { style, styleVars, overlayColor: foreground };
};

export const buildPropsStyle = ({
  adventureProps,
  nodeProps,
  forceHighContrast,
  forceHideBackground,
  overrideHighContrast,
  overrideHideBackground,
}: {
  adventureProps?: PropsInput;
  nodeProps?: PropsInput;
  forceHighContrast?: boolean;
  forceHideBackground?: boolean;
  overrideHighContrast?: boolean;
  overrideHideBackground?: boolean;
}): PropsResult => {
  const merged = {
    ...parsePropInput(adventureProps),
    ...parsePropInput(nodeProps),
  };

  const dataProps = collectDataProps(merged);

  const computedHighContrast =
    coerceValue(merged["high_contrast"]) === "true" ||
    coerceValue(merged["settings_highcontrast"]) === "on";
  const computedHideBackground =
    coerceValue(merged["settings_hidebackground"]) === "on" ||
    coerceValue(merged["hide_background"]) === "true";

  const flags = {
    highContrast: overrideHighContrast ?? (forceHighContrast ? true : undefined) ?? computedHighContrast,
    hideBackground:
      overrideHideBackground ?? (forceHideBackground ? true : undefined) ?? computedHideBackground,
    grayscale:
      (coerceValue(merged["settings_grayscale"]) ?? "").toLowerCase() === "on",
  };

  const { style, styleVars, overlayColor } = mapColors(merged, flags);

  const blur = Math.max(coerceNumber(merged["color_blur"], 0) ?? 0, 0);
  const filterParts = [];
  if (flags.grayscale) filterParts.push("grayscale(100%)");
  if (blur > 0) filterParts.push(`blur(${blur}px)`);
  const mediaFilter = filterParts.length ? filterParts.join(" ") : undefined;

  const objectFit =
    dataProps.background?.includes("contain") ?? false ? "contain" : "cover";

  const backgroundPosition = resolveBackgroundPosition(
    dataProps.background_image?.split(" ").filter(Boolean) ?? []
  );

  const baseFontSize = resolveBaseFontSize(merged, dataProps);

  const fontToken =
    coerceValue(merged["background.font"]) ??
    coerceValue(merged["background_font"]);
  const trimmedFont = fontToken?.trim() ?? "";
  const fontFamily = trimmedFont.length > 0 ? trimmedFont : undefined;

  const containerWidthCandidates = coerceNumberArray(
    merged["player_container_width"]
  );
  const containerWidthVw =
    containerWidthCandidates.length === 1
      ? containerWidthCandidates[0]
      : undefined;

  let containerMarginsVw: [number, number] | undefined;
  if (containerWidthCandidates.length >= 2) {
    containerMarginsVw = [
      containerWidthCandidates[0],
      containerWidthCandidates[1],
    ];
  } else {
    const marginLeft = coerceNumber(merged["player_container_marginleft"]);
    const marginRight = coerceNumber(merged["player_container_marginright"]);
    containerMarginsVw =
      marginLeft != null && marginRight != null
        ? [marginLeft, marginRight]
        : undefined;
  }

  const verticalAlignTokens =
    dataProps.player?.split(" ").filter(Boolean) ?? [];
  const verticalAlign: "top" | "center" | "bottom" =
    verticalAlignTokens.includes("vertical-align-center")
      ? "center"
      : verticalAlignTokens.includes("vertical-align-bottom")
        ? "bottom"
        : "top";

  const textShadow = pickTextShadow(
    dataProps.outer_container?.split(" ").filter(Boolean) ?? []
  );

  const textAlign = resolveTextAlign(
    [
      ...(dataProps.player_container?.split(" ").filter(Boolean) ?? []),
      ...(dataProps.inner_container?.split(" ").filter(Boolean) ?? []),
      ...(dataProps.text_block?.split(" ").filter(Boolean) ?? []),
    ]
  );

  const cssVarsApplied = Object.entries(styleVars).reduce<CSSProperties>(
    (acc, [key, value]) => {
      acc[key as keyof CSSProperties] = value;
      return acc;
    },
    {}
  );

  const combinedStyle: CSSProperties = {
    ...cssVarsApplied,
    ...style,
    ...(fontFamily ? { fontFamily: `${fontFamily}, var(--font-sans), sans-serif` } : {}),
    fontSize: baseFontSize,
  };

  if (textShadow) {
    combinedStyle["--player-text-shadow" as keyof CSSProperties] = textShadow;
  }
  if (mediaFilter) {
    combinedStyle["--player-media-filter" as keyof CSSProperties] = mediaFilter;
  }
  if (baseFontSize) {
    combinedStyle["--player-base-size" as keyof CSSProperties] = baseFontSize;
  }

  return {
    style: combinedStyle,
    flags,
    dataProps,
    layout: {
      verticalAlign,
      containerWidthVw,
      containerMarginsVw,
      textAlign,
      baseFontSize,
    },
    media: {
      filter: mediaFilter,
      objectFit,
      backgroundPosition,
      backgroundSize: objectFit === "contain" ? "contain" : undefined,
    },
    typography: {
      textShadow,
      fontFamily,
      textBackground:
        (cssVarsApplied["--player-text-bg" as keyof CSSProperties] as string) ??
        undefined,
      textColor:
        (cssVarsApplied["--player-text" as keyof CSSProperties] as string) ??
        undefined,
      accentColor:
        (cssVarsApplied["--player-accent" as keyof CSSProperties] as string) ??
        undefined,
      overlayColor,
    },
  };
};

export const combinePreviewClasses = (...classes: string[]) =>
  cn(
    "rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-4 text-sm text-[var(--text)] shadow-[0_20px_80px_-60px_rgba(0,0,0,0.6)]",
    ...classes
  );
