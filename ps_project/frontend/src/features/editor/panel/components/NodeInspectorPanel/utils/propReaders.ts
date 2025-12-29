import type { NodeModel } from "@/domain/models";
import type { BulkDraft } from "../../types";
import { BULK_NODE_TYPE_PATH } from "../../../constants";
import {
  AUDIO_VOLUME_MAX,
  NAV_TEXT_SIZE_DEFAULT,
  NAV_TEXT_SIZE_MAX,
  NAV_TEXT_SIZE_MIN,
  SCENE_COLOR_DEFAULTS,
  SCROLL_SPEED_DEFAULT,
  navigationStyleValues,
  textShadowValues,
  verticalPositionValues,
} from "../constants";
import { clampAlpha, clampNumber, isHexColor } from "./formatters";

export const readStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((entry): entry is string => typeof entry === "string");
        }
      } catch {
        return [trimmed];
      }
    }
    return [trimmed];
  }
  return [];
};

export const readNodePropValue = (
  node: NodeModel,
  key: string,
  draft?: BulkDraft
): unknown => {
  if (draft && draft[key]) return draft[key].value;
  const rawProps = node.rawProps ?? {};
  const fallbackProps = (node.props as Record<string, unknown> | null) ?? {};
  return rawProps[key] ?? fallbackProps[key];
};

export const getMediaPropString = (
  node: NodeModel,
  keys: string[],
  draft?: BulkDraft
): string | null => {
  for (const key of keys) {
    const value = readNodePropValue(node, key, draft);
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
};

export const getStringArrayValue = (
  node: NodeModel,
  key: string,
  fallback: string,
  draft?: BulkDraft
): string => {
  const tokens = readStringArray(readNodePropValue(node, key, draft));
  if (!tokens.length) return fallback;
  const token = tokens[0];
  return typeof token === "string" ? token : String(token ?? fallback);
};

export const getColorProp = (
  node: NodeModel,
  key: keyof typeof SCENE_COLOR_DEFAULTS,
  fallback: string,
  draft?: BulkDraft
): string => {
  const value = readNodePropValue(node, key, draft);
  if (typeof value === "string" && isHexColor(value)) {
    return value;
  }
  return fallback;
};

export const getAlphaProp = (
  node: NodeModel,
  key: keyof typeof SCENE_COLOR_DEFAULTS,
  fallback: number,
  draft?: BulkDraft
): number => {
  const value = readNodePropValue(node, key, draft);
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? parseFloat(value)
        : Number.NaN;
  return Number.isFinite(parsed) ? clampAlpha(parsed) : fallback;
};

export const getColorValue = (
  node: NodeModel,
  key: string,
  fallback: string,
  draft?: BulkDraft
): string => {
  const value = readNodePropValue(node, key, draft);
  if (typeof value === "string" && isHexColor(value)) {
    return value;
  }
  return fallback;
};

export const getAlphaValue = (
  node: NodeModel,
  key: string,
  fallback: number,
  draft?: BulkDraft
): number => {
  const value = readNodePropValue(node, key, draft);
  const primary =
    Array.isArray(value) && value.length > 0 ? value[0] : value;
  const parsed =
    typeof primary === "number"
      ? primary
      : typeof primary === "string"
        ? parseFloat(primary)
        : Number.NaN;
  return Number.isFinite(parsed) ? clampAlpha(parsed) : fallback;
};

export const getNumberProp = (
  node: NodeModel,
  key: string,
  fallback: number,
  draft?: BulkDraft
): number => {
  const value = readNodePropValue(node, key, draft);
  const primary =
    Array.isArray(value) && value.length > 0 ? value[0] : value;
  const parsed =
    typeof primary === "number"
      ? primary
      : typeof primary === "string"
        ? parseFloat(primary)
        : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getNavigationStyle = (node: NodeModel, draft?: BulkDraft): string => {
  const value = readNodePropValue(node, "background.navigation_style", draft);
  const tokens = readStringArray(value);
  const candidate = tokens[0]?.trim() ?? "";
  if (!candidate || candidate === "default") return "default";
  return navigationStyleValues.has(candidate) ? candidate : "default";
};

export const getNavigationSettings = (node: NodeModel, draft?: BulkDraft): string[] =>
  readStringArray(readNodePropValue(node, "playerNavigation.settings", draft));

export const getFontToken = (node: NodeModel, draft?: BulkDraft): string => {
  const value =
    readNodePropValue(node, "background.font", draft) ??
    readNodePropValue(node, "background_font", draft);
  const tokens = readStringArray(value);
  return tokens[0]?.trim() ?? "";
};

export const getTextShadow = (node: NodeModel, draft?: BulkDraft): string => {
  const tokens = readStringArray(
    readNodePropValue(node, "outer_container.textShadow", draft)
  );
  const candidate = tokens[0]?.trim() ?? "";
  return textShadowValues.has(candidate) ? candidate : "";
};

export const isToggleOn = (value: unknown): boolean => {
  const tokens = readStringArray(value).map((token) => token.toLowerCase());
  return tokens.some(
    (token) =>
      token === "on" || token === "true" || token === "1" || token === "yes"
  );
};

export const getGrayscaleEnabled = (node: NodeModel, draft?: BulkDraft): boolean =>
  readStringArray(readNodePropValue(node, "settings_grayscale", draft)).some(
    (token) => token.toLowerCase() === "on"
  );

export const getBlurAmount = (node: NodeModel, draft?: BulkDraft): number => {
  const blur = getNumberProp(node, "color_blur", 0, draft);
  return Number.isFinite(blur) ? Math.max(0, blur) : 0;
};

export const getHideVisitedEnabled = (node: NodeModel, draft?: BulkDraft): boolean =>
  readStringArray(readNodePropValue(node, "node_conditions", draft)).some(
    (token) => token.toLowerCase() === "hide_visited"
  );

export const getStatisticsEnabled = (node: NodeModel, draft?: BulkDraft): boolean =>
  isToggleOn(readNodePropValue(node, "node_statistics", draft));

export const getNavTextSize = (node: NodeModel, draft?: BulkDraft): number => {
  const raw = getNumberProp(
    node,
    "playerNavigation_textSize",
    NAV_TEXT_SIZE_DEFAULT,
    draft
  );
  return clampNumber(raw, NAV_TEXT_SIZE_MIN, NAV_TEXT_SIZE_MAX);
};

export const getAudioVolume = (node: NodeModel, draft?: BulkDraft): number => {
  const volume = getNumberProp(node, "audio_volume", AUDIO_VOLUME_MAX, draft);
  return Number.isFinite(volume) ? volume : AUDIO_VOLUME_MAX;
};

export const getOrderedLinkIds = (node: NodeModel, draft?: BulkDraft): number[] =>
  readStringArray(readNodePropValue(node, "ordered_link_ids", draft))
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

export const getVerticalPosition = (node: NodeModel, draft?: BulkDraft): string => {
  const value = readNodePropValue(node, "player.verticalPosition", draft);
  const tokens = readStringArray(value);
  const candidate = tokens[0]?.trim() ?? "";
  if (verticalPositionValues.has(candidate)) return candidate;
  return "vertical-align-center";
};

export const getScrollSpeed = (node: NodeModel, draft?: BulkDraft): number => {
  const value = readNodePropValue(node, "settings_scrollSpeed", draft);
  const tokens = readStringArray(value);
  const candidate = tokens[0]?.trim() ?? "";
  const parsed = parseFloat(candidate);
  return Number.isFinite(parsed) ? parsed : SCROLL_SPEED_DEFAULT;
};

export const hasEditorVersion = (node: NodeModel, draft?: BulkDraft): boolean => {
  const value =
    readNodePropValue(node, "editorVersion", draft) ??
    readNodePropValue(node, "editor_version", draft) ??
    readNodePropValue(node, "editorversion", draft);
  if (typeof value === "string") {
    return value.trim() !== "" && value.trim() !== "0";
  }
  const tokens = readStringArray(value);
  const token = tokens[0] ?? "";
  return token.trim() !== "" && token.trim() !== "0";
};

export const getNodeChapterType = (node: NodeModel, draft?: BulkDraft): string => {
  const primaryProps = (node.props as Record<string, unknown> | null) ?? {};
  const fallbackProps = node.rawProps ?? {};
  const draftValue = draft?.[BULK_NODE_TYPE_PATH]?.value;
  const rawValue =
    draftValue ??
    primaryProps.settings_chapterType ??
    primaryProps.settingsChapterType ??
    primaryProps.chapterType ??
    primaryProps.chapter_type ??
    fallbackProps.settings_chapterType ??
    fallbackProps.settingsChapterType ??
    fallbackProps.chapterType ??
    fallbackProps.chapter_type;
  const values = readStringArray(rawValue);
  return values[0] ?? "";
};
