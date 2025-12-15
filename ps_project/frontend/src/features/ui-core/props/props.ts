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

const coerceValue = (value: unknown): string | undefined => {
  if (Array.isArray(value)) return value[0] as string;
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
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
  const colorWithAlpha = (colorKey: string, alphaKey?: string) => {
    const color = get(colorKey);
    if (!color) return undefined;
    const alpha = alphaKey ? get(alphaKey) : undefined;
    return hexToRgba(color, alpha ?? 100);
  };

  if (overrides.highContrast) {
    styleVars["--background"] = "#000000";
    styleVars["--bg"] = "#000000";
    styleVars["--text"] = "#ffffff";
    styleVars["--foreground"] = "#ffffff";
    styleVars["--accent"] = "#ffffff";
    styleVars["--accent-strong"] = "#ffffff";
    style.backgroundColor = "#000000";
    style.color = "#ffffff";
    return { style, styleVars };
  }

  const background = get("color_background");
  if (background) {
    style.backgroundColor = background;
    styleVars["--background"] = background;
    styleVars["--bg"] = background;
  }

  const foreground = colorWithAlpha("color_foreground", "alpha_foreground");
  if (foreground) {
    styleVars["--foreground"] = foreground;
  }

  const textColor = colorWithAlpha("color_text", "alpha_text");
  if (textColor) {
    style.color = textColor;
    styleVars["--text"] = textColor;
  }

  const textBg = colorWithAlpha(
    "color_textbackground",
    "alpha_textbackground"
  );
  if (textBg) {
    styleVars["--surface"] = textBg;
  }

  const accent = colorWithAlpha("color_buttonbackground", "alpha_buttonbackground");
  if (accent) {
    styleVars["--accent"] = accent;
    styleVars["--accent-strong"] = accent;
  }

  const buttonText = colorWithAlpha("color_buttontext", "alpha_buttontext");
  if (buttonText) {
    styleVars["--muted"] = buttonText;
  }

  return { style, styleVars };
};

export const buildPropsStyle = ({
  adventureProps,
  nodeProps,
  forceHighContrast = false,
}: {
  adventureProps?: PropsInput;
  nodeProps?: PropsInput;
  forceHighContrast?: boolean;
}): PropsResult => {
  const merged = {
    ...parsePropInput(adventureProps),
    ...parsePropInput(nodeProps),
  };

  const flags = {
    highContrast:
      forceHighContrast ||
      coerceValue(merged["high_contrast"]) === "true" ||
      coerceValue(merged["settings_highcontrast"]) === "on",
  };

  const { style, styleVars } = mapColors(merged, flags);

  const cssVarsApplied = Object.entries(styleVars).reduce<CSSProperties>(
    (acc, [key, value]) => {
      acc[key as keyof CSSProperties] = value;
      return acc;
    },
    {}
  );

  return {
    style: { ...cssVarsApplied, ...style },
    flags,
  };
};

export const combinePreviewClasses = (...classes: string[]) =>
  cn(
    "rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-4 text-sm text-[var(--text)] shadow-[0_20px_80px_-60px_rgba(0,0,0,0.6)]",
    ...classes
  );
