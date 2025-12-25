"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { NodeModel } from "@/domain/models";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/features/ui-core/primitives/tabs";
import { Button } from "@/features/ui-core/primitives/button";
import { uploadMedia, deleteMedia } from "@/features/state/api/media";
import { toastError } from "@/features/ui-core/toast";
import { cn } from "@/lib/utils";
import type { EditorNodeInspectorTab } from "../../state/types";
import {
  ChevronDown,
  GripVertical,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import {
  BULK_NODE_TEXT_PATH,
  BULK_NODE_TITLE_PATH,
  BULK_NODE_TYPE_PATH,
  chapterTypeOptions,
  tabOptions,
} from "../constants";
import type { BulkDraft, BulkDraftEntry, BulkEditConfig } from "../types";
import { BulkField } from "./BulkField";
import { CollapsibleSection } from "./CollapsibleSection";
import { InspectorShell } from "./InspectorShell";
import { RichTextEditor } from "./RichTextEditor";

const navigationStyleOptions = [
  { value: "default", label: "Default" },
  { value: "swipe", label: "Swipe" },
  { value: "swipeWithButton", label: "Swipe with button" },
  { value: "leftright", label: "Left/right" },
  { value: "right", label: "Right" },
  { value: "noButtons", label: "No buttons" },
];

const navigationStyleValues = new Set(
  navigationStyleOptions.map((option) => option.value)
);

const textShadowOptions = [
  { value: "", label: "None" },
  { value: "text-shadow-black", label: "Black" },
  { value: "text-shadow-white", label: "White" },
];

const textShadowValues = new Set(
  textShadowOptions.map((option) => option.value)
);

const builtInFontOptions = [
  { value: "font-roboto", label: "Roboto" },
  { value: "font-robotoserif", label: "Roboto Serif" },
  { value: "font-robotocondensed", label: "Roboto Condensed" },
  { value: "font-conduitmedium", label: "Conduit Medium" },
  { value: "font-conduitlight", label: "Conduit Light" },
  { value: "font-cardo", label: "Cardo" },
  { value: "font-shadowsintolight", label: "Shadows Into Light" },
  { value: "font-amaticsc", label: "Amatic SC" },
  { value: "font-armata", label: "Armata" },
  { value: "font-cabin", label: "Cabin" },
  { value: "font-cabincondensed", label: "Cabin Condensed" },
  { value: "font-cormorant", label: "Cormorant" },
  { value: "font-ebgaramond", label: "EB Garamond" },
  { value: "font-firasans", label: "Fira Sans" },
  { value: "font-gabriela", label: "Gabriela" },
  { value: "font-lato", label: "Lato" },
  { value: "font-librebaskerville", label: "Libre Baskerville" },
  { value: "font-librefranklin", label: "Libre Franklin" },
  { value: "font-merriweather", label: "Merriweather" },
  { value: "font-nunito", label: "Nunito" },
  { value: "font-opensans", label: "Open Sans" },
  { value: "font-opensanscondensed", label: "Open Sans Condensed" },
  { value: "font-oswald", label: "Oswald" },
  { value: "font-playfairdisplay", label: "Playfair Display" },
  { value: "font-poppins", label: "Poppins" },
  { value: "font-rougescript", label: "Rouge Script" },
  { value: "font-sairacondensed", label: "Saira Condensed" },
  { value: "font-sriracha", label: "Sriracha" },
  { value: "font-ubuntu", label: "Ubuntu" },
  { value: "font-worksans", label: "Work Sans" },
  { value: "font-zillaslab", label: "Zilla Slab" },
  { value: "font-barlow", label: "Barlow" },
];

const NAV_TEXT_SIZE_MIN = 8;
const NAV_TEXT_SIZE_MAX = 18;
const NAV_TEXT_SIZE_DEFAULT = 14;

const verticalPositionOptions = [
  { value: "vertical-align-top", label: "Top" },
  { value: "vertical-align-center", label: "Center" },
  { value: "vertical-align-bottom", label: "Bottom" },
];

const verticalPositionValues = new Set(
  verticalPositionOptions.map((option) => option.value)
);

const SCROLL_SPEED_MIN = 0;
const SCROLL_SPEED_MAX = 1.5;
const SCROLL_SPEED_DEFAULT = 0.5;
const BLUR_MIN = 0;
const BLUR_MAX = 100;
const MARGIN_DEFAULT = 18;
const MARGIN_MIN = 0;
const MARGIN_MAX = 100;
const AUDIO_VOLUME_MIN = 0;
const AUDIO_VOLUME_MAX = 100;
const CONDITIONS_COLOR_DEFAULT = "#000000";
const CONDITIONS_ALPHA_DEFAULT = 40;

const readStringArray = (value: unknown): string[] => {
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

const SCENE_COLOR_DEFAULTS = {
  color_background: "#ffffff",
  color_foreground: "#000000",
  alpha_foreground: 0,
  color_text: "#ffffff",
  alpha_text: 100,
  color_textbackground: "#000000",
  alpha_textbackground: 40,
  color_buttontext: "#ffffff",
  alpha_buttontext: 100,
  color_buttonbackground: "#000000",
  alpha_buttonbackground: 40,
};

const isHexColor = (value: string): boolean =>
  /^#[0-9a-fA-F]{6}$/.test(value);

const clampAlpha = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(value)));

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const parseFontEntry = (entry: string) => {
  const trimmed = entry.trim();
  const isUrl = /^https?:\/\//.test(trimmed) || trimmed.startsWith("/");
  const name =
    isUrl && trimmed.includes("/")
      ? trimmed.split("/").pop()?.replace(/\.[^/.]+$/, "") ?? trimmed
      : trimmed;
  return { name, url: isUrl ? trimmed : undefined };
};

const stripMediaUrl = (url: string) => url.split(/[?#]/)[0] ?? "";

const getMediaBasename = (url: string) => {
  const trimmed = stripMediaUrl(url);
  const parts = trimmed.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
};

const isVideoMedia = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const trimmed = stripMediaUrl(url).toLowerCase();
  return trimmed.endsWith(".mp4");
};

const getMediaLabel = (url: string | null | undefined): string => {
  if (!url) return "";
  return getMediaBasename(url) || url;
};

const getMediaPropString = (
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

const readNodePropValue = (
  node: NodeModel,
  key: string,
  draft?: BulkDraft
): unknown => {
  if (draft && draft[key]) return draft[key].value;
  const rawProps = node.rawProps ?? {};
  const fallbackProps = (node.props as Record<string, unknown> | null) ?? {};
  return rawProps[key] ?? fallbackProps[key];
};

const getColorProp = (
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

const getAlphaProp = (
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

const getColorValue = (
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

const getAlphaValue = (
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

const getNumberProp = (
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

const getNavigationStyle = (node: NodeModel, draft?: BulkDraft): string => {
  const value = readNodePropValue(node, "background.navigation_style", draft);
  const tokens = readStringArray(value);
  const candidate = tokens[0]?.trim() ?? "";
  if (!candidate || candidate === "default") return "default";
  return navigationStyleValues.has(candidate) ? candidate : "default";
};

const getNavigationSettings = (node: NodeModel, draft?: BulkDraft): string[] =>
  readStringArray(readNodePropValue(node, "playerNavigation.settings", draft));

const getFontToken = (node: NodeModel, draft?: BulkDraft): string => {
  const value =
    readNodePropValue(node, "background.font", draft) ??
    readNodePropValue(node, "background_font", draft);
  const tokens = readStringArray(value);
  return tokens[0]?.trim() ?? "";
};

const getTextShadow = (node: NodeModel, draft?: BulkDraft): string => {
  const tokens = readStringArray(
    readNodePropValue(node, "outer_container.textShadow", draft)
  );
  const candidate = tokens[0]?.trim() ?? "";
  return textShadowValues.has(candidate) ? candidate : "";
};

const isToggleOn = (value: unknown): boolean => {
  const tokens = readStringArray(value).map((token) => token.toLowerCase());
  return tokens.some(
    (token) =>
      token === "on" || token === "true" || token === "1" || token === "yes"
  );
};

const getGrayscaleEnabled = (node: NodeModel, draft?: BulkDraft): boolean =>
  readStringArray(readNodePropValue(node, "settings_grayscale", draft)).some(
    (token) => token.toLowerCase() === "on"
  );

const getBlurAmount = (node: NodeModel, draft?: BulkDraft): number => {
  const blur = getNumberProp(node, "color_blur", 0, draft);
  return Number.isFinite(blur) ? Math.max(0, blur) : 0;
};

const getHideVisitedEnabled = (node: NodeModel, draft?: BulkDraft): boolean =>
  readStringArray(readNodePropValue(node, "node_conditions", draft)).some(
    (token) => token.toLowerCase() === "hide_visited"
  );

const getStatisticsEnabled = (node: NodeModel, draft?: BulkDraft): boolean =>
  isToggleOn(readNodePropValue(node, "node_statistics", draft));

const getNavTextSize = (node: NodeModel, draft?: BulkDraft): number => {
  const raw = getNumberProp(
    node,
    "playerNavigation_textSize",
    NAV_TEXT_SIZE_DEFAULT,
    draft
  );
  return clampNumber(raw, NAV_TEXT_SIZE_MIN, NAV_TEXT_SIZE_MAX);
};

const getAudioVolume = (node: NodeModel, draft?: BulkDraft): number => {
  const volume = getNumberProp(node, "audio_volume", AUDIO_VOLUME_MAX, draft);
  return Number.isFinite(volume) ? volume : AUDIO_VOLUME_MAX;
};

const getOrderedLinkIds = (node: NodeModel, draft?: BulkDraft): number[] =>
  readStringArray(readNodePropValue(node, "ordered_link_ids", draft))
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

const getVerticalPosition = (node: NodeModel, draft?: BulkDraft): string => {
  const value = readNodePropValue(node, "player.verticalPosition", draft);
  const tokens = readStringArray(value);
  const candidate = tokens[0]?.trim() ?? "";
  if (verticalPositionValues.has(candidate)) return candidate;
  return "vertical-align-center";
};

const getScrollSpeed = (node: NodeModel, draft?: BulkDraft): number => {
  const value = readNodePropValue(node, "settings_scrollSpeed", draft);
  const tokens = readStringArray(value);
  const candidate = tokens[0]?.trim() ?? "";
  const parsed = parseFloat(candidate);
  return Number.isFinite(parsed) ? parsed : SCROLL_SPEED_DEFAULT;
};

const getNodeChapterType = (node: NodeModel, draft?: BulkDraft): string => {
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


type NodeInspectorPanelProps = {
  node: NodeModel;
  editSlug?: string;
  fontList?: string[];
  outgoingLinks?: Array<{ linkId: number; targetId: number; label: string }>;
  activeTab: EditorNodeInspectorTab;
  onTabChange: (tab: EditorNodeInspectorTab) => void;
  onTitleChange: (title: string) => void;
  onTextChange: (text: string) => void;
  onNodeImageUrlChange: (url: string | null) => void;
  onNodeTypeChange: (chapterType: string) => void;
  onNodePropChange: (path: string, value: unknown) => void;
  bulk?: BulkEditConfig;
};

export function NodeInspectorPanel({
  node,
  editSlug,
  fontList,
  outgoingLinks = [],
  activeTab,
  onTabChange,
  onTitleChange,
  onTextChange,
  onNodeImageUrlChange,
  onNodeTypeChange,
  onNodePropChange,
  bulk,
}: NodeInspectorPanelProps) {
  const [sectionState, setSectionState] = useState<Record<string, boolean>>({
    "Node type": false,
    Text: false,
    Image: false,
    Video: false,
    "Audio media": false,
    Background: false,
    Layout: false,
    Navigation: false,
    Audio: false,
    "Button appearance": false,
    "Button order": false,
    Conditions: false,
    Tracking: false,
  });
  const setSectionOpen = (key: string, next: boolean) =>
    setSectionState((prev) => ({ ...prev, [key]: next }));
  const bulkDraft = bulk?.draft ?? {};
  const bulkActive = bulk?.active ?? false;
  const stagedCount = Object.keys(bulkDraft).length;
  const hasStagedChanges = stagedCount > 0;
  const stagedTitle = bulkDraft[BULK_NODE_TITLE_PATH];
  const stagedText = bulkDraft[BULK_NODE_TEXT_PATH];
  const titleValue =
    bulkActive && stagedTitle ? String(stagedTitle.value ?? "") : node.title ?? "";
  const textValue =
    bulkActive && stagedText ? String(stagedText.value ?? "") : node.text ?? "";
  const isBulkFieldStaged = (paths: string | string[]) => {
    if (!bulkActive) return false;
    const pathList = Array.isArray(paths) ? paths : [paths];
    return pathList.some((path) => Boolean(bulkDraft[path]));
  };
  const clearBulkPaths = (paths: string | string[]) => {
    if (!bulkActive || !bulk) return;
    bulk.onClear(paths);
  };
  const stageBulkChange = (entry: BulkDraftEntry) => {
    if (!bulkActive || !bulk) return;
    bulk.onStage(entry);
  };
  const handleTitleChange = (title: string) => {
    if (bulkActive) {
      stageBulkChange({
        path: BULK_NODE_TITLE_PATH,
        op: "set",
        value: title,
        kind: "nodeTitle",
      });
      return;
    }
    onTitleChange(title);
  };
  const handleTextChange = (text: string) => {
    if (bulkActive) {
      stageBulkChange({
        path: BULK_NODE_TEXT_PATH,
        op: "set",
        value: text,
        kind: "nodeText",
      });
      return;
    }
    onTextChange(text);
  };
  const handleNodeTypeChange = (chapterTypeValue: string) => {
    if (bulkActive) {
      stageBulkChange({
        path: BULK_NODE_TYPE_PATH,
        op: "set",
        value: chapterTypeValue,
        kind: "propStringArray",
      });
      return;
    }
    onNodeTypeChange(chapterTypeValue);
  };
  const handleNodePropChange = (path: string, value: unknown) => {
    if (bulkActive) {
      stageBulkChange({
        path,
        op: "set",
        value,
        kind: "propPath",
      });
      return;
    }
    onNodePropChange(path, value);
  };
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaDeleting, setMediaDeleting] = useState(false);
  const mediaUrl = node.image.url ?? null;
  const mediaBasename = mediaUrl ? getMediaBasename(mediaUrl) : "";
  const mediaIsVideo = isVideoMedia(mediaUrl);
  const mediaLabel = getMediaLabel(mediaUrl);
  const imageLabel = mediaIsVideo ? "" : mediaLabel;
  const videoLabel = mediaIsVideo ? mediaLabel : "";
  const subtitlesUrl = getMediaPropString(
    node,
    ["subtitles_url", "subtitlesUrl"],
    bulkDraft
  );
  const subtitlesLabel = getMediaLabel(subtitlesUrl);
  const audioUrl = getMediaPropString(
    node,
    ["audio_url", "audioUrl"],
    bulkDraft
  );
  const audioLabel = getMediaLabel(audioUrl);
  const audioAltUrl = getMediaPropString(
    node,
    ["audio_url_alt", "audioUrlAlt"],
    bulkDraft
  );
  const audioAltLabel = getMediaLabel(audioAltUrl);
  const mediaBusy = mediaUploading || mediaDeleting;
  const mediaDisabledReason = bulkActive
    ? "Bulk edit disabled: background media is per-node."
    : undefined;
  const audioDisabledReason = bulkActive
    ? "Bulk edit disabled: audio media is per-node."
    : undefined;
  const placeholderDisabledReason =
    "This media control will be added in a follow-up step.";
  const handleMediaUploadClick = () => {
    if (mediaBusy || bulkActive) return;
    fileInputRef.current?.click();
  };
  const handleMediaInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (bulkActive) {
      event.currentTarget.value = "";
      return;
    }
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!editSlug) {
      toastError("Media upload failed", "Missing adventure slug.");
      return;
    }
    setMediaUploading(true);
    try {
      const result = await uploadMedia(editSlug, file);
      if (!result?.url) {
        throw new Error("Upload did not return a URL.");
      }
      onNodeImageUrlChange(result.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toastError("Media upload failed", message);
    } finally {
      setMediaUploading(false);
    }
  };
  const handleMediaRemove = async () => {
    if (mediaBusy || bulkActive) return;
    if (!mediaUrl) return;
    if (!editSlug) {
      toastError("Media delete failed", "Missing adventure slug.");
      return;
    }
    if (!mediaBasename) {
      toastError("Media delete failed", "Could not resolve media filename.");
      return;
    }
    setMediaDeleting(true);
    try {
      await deleteMedia(editSlug, mediaBasename);
      onNodeImageUrlChange(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toastError("Media delete failed", message);
    } finally {
      setMediaDeleting(false);
    }
  };
  const chapterType = getNodeChapterType(node, bulkDraft);
  const isRefNode = chapterType.startsWith("ref-node");
  const navigationStyle = getNavigationStyle(node, bulkDraft);
  const navigationSettings = getNavigationSettings(node, bulkDraft);
  const verticalPosition = getVerticalPosition(node, bulkDraft);
  const scrollSpeed = getScrollSpeed(node, bulkDraft);
  const textShadow = getTextShadow(node, bulkDraft);
  const grayscaleEnabled = getGrayscaleEnabled(node, bulkDraft);
  const blurAmount = getBlurAmount(node, bulkDraft);
  const hideVisitedEnabled = getHideVisitedEnabled(node, bulkDraft);
  const statisticsEnabled = getStatisticsEnabled(node, bulkDraft);
  const navTextSize = getNavTextSize(node, bulkDraft);
  const audioVolume = getAudioVolume(node, bulkDraft);
  const orderedLinkIds = getOrderedLinkIds(node, bulkDraft);
  const orderedOutgoingLinks = (() => {
    const orderIndex = new Map(
      orderedLinkIds.map((id, index) => [id, index])
    );
    return outgoingLinks
      .map((link, index) => ({
        ...link,
        sortIndex: orderIndex.get(link.linkId) ?? Number.POSITIVE_INFINITY,
        originalIndex: index,
      }))
      .sort((a, b) => {
        if (a.sortIndex !== b.sortIndex) return a.sortIndex - b.sortIndex;
        return a.originalIndex - b.originalIndex;
      });
  })();
  const marginLeft = getNumberProp(
    node,
    "player_container_marginleft",
    MARGIN_DEFAULT,
    bulkDraft
  );
  const marginRight = getNumberProp(
    node,
    "player_container_marginright",
    MARGIN_DEFAULT,
    bulkDraft
  );
  const conditionsColor = getColorValue(
    node,
    "color_nodeconditions",
    CONDITIONS_COLOR_DEFAULT,
    bulkDraft
  );
  const conditionsAlpha = getAlphaValue(
    node,
    "alpha_nodeconditions",
    CONDITIONS_ALPHA_DEFAULT,
    bulkDraft
  );
  const fontToken = getFontToken(node, bulkDraft);
  const uploadedFonts = Array.from(
    new Set(
      (fontList ?? [])
        .map((entry) => parseFontEntry(entry).name)
        .filter((name) => name.length > 0)
    )
  );
  const uploadedFontOptions = uploadedFonts.map((name) => ({
    value: `xfont-${name}`,
    label: name,
  }));
  const fontOptions = [...builtInFontOptions, ...uploadedFontOptions];
  const fontOptionValues = new Set(fontOptions.map((option) => option.value));
  const fontSelectValue = fontToken ?? "";
  const needsLegacyOption =
    fontSelectValue !== "" && !fontOptionValues.has(fontSelectValue);
  const legacyFontLabel = fontSelectValue.replace(/^xfont-/, "").replace(/^font-/, "");
  const hasNavigationSetting = (token: string) =>
    navigationSettings.some(
      (entry) => entry.toLowerCase() === token.toLowerCase()
    );
  const updateNavigationSetting = (token: string, enabled: boolean) => {
    const normalizedToken = token.toLowerCase();
    const next = navigationSettings.filter(
      (entry) => entry.toLowerCase() !== normalizedToken
    );
    if (enabled) {
      next.push(token);
    }
    handleNodePropChange("playerNavigation.settings", next);
  };
  const sceneColors = {
    background: getColorProp(
      node,
      "color_background",
      SCENE_COLOR_DEFAULTS.color_background,
      bulkDraft
    ),
    foreground: getColorProp(
      node,
      "color_foreground",
      SCENE_COLOR_DEFAULTS.color_foreground,
      bulkDraft
    ),
    foregroundAlpha: getAlphaProp(
      node,
      "alpha_foreground",
      SCENE_COLOR_DEFAULTS.alpha_foreground,
      bulkDraft
    ),
    text: getColorProp(
      node,
      "color_text",
      SCENE_COLOR_DEFAULTS.color_text,
      bulkDraft
    ),
    textAlpha: getAlphaProp(
      node,
      "alpha_text",
      SCENE_COLOR_DEFAULTS.alpha_text,
      bulkDraft
    ),
    textBackground: getColorProp(
      node,
      "color_textbackground",
      SCENE_COLOR_DEFAULTS.color_textbackground,
      bulkDraft
    ),
    textBackgroundAlpha: getAlphaProp(
      node,
      "alpha_textbackground",
      SCENE_COLOR_DEFAULTS.alpha_textbackground,
      bulkDraft
    ),
    buttonText: getColorProp(
      node,
      "color_buttontext",
      SCENE_COLOR_DEFAULTS.color_buttontext,
      bulkDraft
    ),
    buttonTextAlpha: getAlphaProp(
      node,
      "alpha_buttontext",
      SCENE_COLOR_DEFAULTS.alpha_buttontext,
      bulkDraft
    ),
    buttonBackground: getColorProp(
      node,
      "color_buttonbackground",
      SCENE_COLOR_DEFAULTS.color_buttonbackground,
      bulkDraft
    ),
    buttonBackgroundAlpha: getAlphaProp(
      node,
      "alpha_buttonbackground",
      SCENE_COLOR_DEFAULTS.alpha_buttonbackground,
      bulkDraft
    ),
  };

  return (
    <InspectorShell
      title={
        bulkActive
          ? `Bulk edit (${bulk?.selectedNodeCount ?? 0} nodes selected)`
          : "Node settings"
      }
      meta={bulkActive ? null : `#${node.nodeId}`}
    >
      {bulkActive && bulk ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Apply to selection
              </p>
              <p className="text-xs text-[var(--muted)]">
                {hasStagedChanges
                  ? `${stagedCount} staged ${
                      stagedCount === 1 ? "change" : "changes"
                    }.`
                  : "No staged changes yet."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={bulk.onDiscardAll}
                disabled={!hasStagedChanges}
              >
                Discard staged changes
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={bulk.onRequestApply}
                disabled={!hasStagedChanges}
              >
                Apply changes
              </Button>
            </div>
          </div>
          <div className="mt-2 space-y-1 text-xs text-[var(--muted)]">
            {bulk.selectedLinkCount > 0 ? (
              <p>
                Bulk editing applies to nodes only.{" "}
                {bulk.selectedLinkCount} link
                {bulk.selectedLinkCount === 1 ? "" : "s"} selected.
              </p>
            ) : null}
            {bulk.notice ? (
              <p className="text-[var(--warning)]">{bulk.notice}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as EditorNodeInspectorTab)}
      >
        <TabsList className="w-full">
          {tabOptions.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="content">
          <div className="space-y-4">
            <BulkField
              active={isBulkFieldStaged(BULK_NODE_TITLE_PATH)}
              onClear={() => clearBulkPaths(BULK_NODE_TITLE_PATH)}
            >
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                  Node name
                </label>
                <input
                  value={titleValue}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  placeholder="Untitled node"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                />
              </div>
            </BulkField>

            <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
              <CollapsibleSection
                title="Node type"
                open={sectionState["Node type"]}
                onToggle={(next) => setSectionOpen("Node type", next)}
              >
                <BulkField
                  active={isBulkFieldStaged(BULK_NODE_TYPE_PATH)}
                  onClear={() => clearBulkPaths(BULK_NODE_TYPE_PATH)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">
                      Type
                    </label>
                    <div className="relative w-48">
                      <select
                        value={chapterType}
                        onChange={(event) =>
                          handleNodeTypeChange(event.target.value)
                        }
                        className="w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 pr-7 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                      >
                        {chapterTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </BulkField>
              </CollapsibleSection>

              <CollapsibleSection
                title="Text"
                open={sectionState.Text}
                onToggle={(next) => setSectionOpen("Text", next)}
              >
                <div className="space-y-3">
                  {isRefNode ? (
                    <BulkField
                      active={isBulkFieldStaged(BULK_NODE_TEXT_PATH)}
                      onClear={() => clearBulkPaths(BULK_NODE_TEXT_PATH)}
                    >
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                          Reference URL
                        </label>
                        <input
                          value={textValue}
                          onChange={(event) =>
                            handleTextChange(event.target.value)
                          }
                          placeholder="https://example.com"
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                        />
                        <p className="text-xs text-[var(--muted)]">
                          Reference nodes open the first URL found in `node.text`.
                        </p>
                      </div>
                    </BulkField>
                  ) : (
                    <>
                      <BulkField
                        active={isBulkFieldStaged(BULK_NODE_TEXT_PATH)}
                        onClear={() => clearBulkPaths(BULK_NODE_TEXT_PATH)}
                      >
                        <RichTextEditor
                          value={textValue}
                          onChange={handleTextChange}
                          placeholder="Write the node content..."
                        />
                      </BulkField>
                      <div className="space-y-4 pt-2">
                        <BulkField
                          active={isBulkFieldStaged(
                            "outer_container.textShadow"
                          )}
                          onClear={() =>
                            clearBulkPaths("outer_container.textShadow")
                          }
                        >
                          <div className="flex items-center justify-between gap-3">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">
                              Text shadow
                            </label>
                            <div className="relative w-48">
                              <select
                                value={textShadow}
                                onChange={(event) =>
                                  handleNodePropChange(
                                    "outer_container.textShadow",
                                    [event.target.value]
                                  )
                                }
                                className="w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 pr-7 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                              >
                                {textShadowOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
                                aria-hidden="true"
                              />
                            </div>
                          </div>
                        </BulkField>
                        <BulkField
                          active={isBulkFieldStaged("background.font")}
                          onClear={() => clearBulkPaths("background.font")}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">
                              Font (player buttons/menu)
                            </label>
                            <div className="relative w-56">
                              <select
                                value={fontSelectValue}
                                onChange={(event) =>
                                  handleNodePropChange("background.font", [
                                    event.target.value,
                                  ])
                                }
                                className="w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 pr-7 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                              >
                                <option value="">Default</option>
                                {fontOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                                {needsLegacyOption ? (
                                  <option value={fontSelectValue}>
                                    Current: {legacyFontLabel}
                                  </option>
                                ) : null}
                              </select>
                              <ChevronDown
                                className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
                                aria-hidden="true"
                              />
                            </div>
                          </div>
                        </BulkField>
                        <BulkField
                          active={isBulkFieldStaged([
                            "color_text",
                            "alpha_text",
                          ])}
                          onClear={() =>
                            clearBulkPaths(["color_text", "alpha_text"])
                          }
                        >
                          <ColorAlphaField
                            label="Text"
                            colorValue={sceneColors.text}
                            alphaValue={sceneColors.textAlpha}
                            onColorChange={(value) =>
                              handleNodePropChange("color_text", value)
                            }
                            onAlphaChange={(value) =>
                              handleNodePropChange("alpha_text", String(value))
                            }
                          />
                        </BulkField>
                        <BulkField
                          active={isBulkFieldStaged([
                            "color_textbackground",
                            "alpha_textbackground",
                          ])}
                          onClear={() =>
                            clearBulkPaths([
                              "color_textbackground",
                              "alpha_textbackground",
                            ])
                          }
                        >
                          <ColorAlphaField
                            label="Text background"
                            colorValue={sceneColors.textBackground}
                            alphaValue={sceneColors.textBackgroundAlpha}
                            onColorChange={(value) =>
                              handleNodePropChange("color_textbackground", value)
                            }
                            onAlphaChange={(value) =>
                              handleNodePropChange(
                                "alpha_textbackground",
                                String(value)
                              )
                            }
                          />
                        </BulkField>
                      </div>
                    </>
                  )}
                </div>
              </CollapsibleSection>
              <CollapsibleSection
                title="Image"
                open={sectionState.Image}
                onToggle={(next) => setSectionOpen("Image", next)}
              >
                <BulkField
                  active={false}
                  disabledReason={mediaDisabledReason}
                >
                  <div className="space-y-3">
                    <MediaFileRow
                      value={imageLabel}
                      emptyLabel="No image background set"
                      onUpload={handleMediaUploadClick}
                      onDelete={handleMediaRemove}
                      uploadDisabled={mediaBusy || bulkActive}
                      deleteDisabled={mediaBusy || bulkActive || !imageLabel}
                      uploadLabel="Upload image or video"
                      deleteLabel="Remove background image"
                    />
                    {mediaIsVideo && mediaUrl ? (
                      <p className="text-xs text-[var(--muted)]">
                        A video background is active. Uploading an image will
                        replace it.
                      </p>
                    ) : null}
                    {!mediaIsVideo && mediaUrl ? (
                      <img
                        src={mediaUrl}
                        alt="Background image preview"
                        className="h-32 w-full rounded-md border border-[var(--border)] object-cover"
                      />
                    ) : null}
                  </div>
                </BulkField>
              </CollapsibleSection>
              <CollapsibleSection
                title="Video"
                open={sectionState.Video}
                onToggle={(next) => setSectionOpen("Video", next)}
              >
                <BulkField
                  active={false}
                  disabledReason={mediaDisabledReason}
                >
                  <div className="space-y-3">
                    <MediaFileRow
                      value={videoLabel}
                      emptyLabel="No video background set"
                      onUpload={handleMediaUploadClick}
                      onDelete={handleMediaRemove}
                      uploadDisabled={mediaBusy || bulkActive}
                      deleteDisabled={mediaBusy || bulkActive || !videoLabel}
                      uploadLabel="Upload image or video"
                      deleteLabel="Remove background video"
                    />
                    {!mediaIsVideo && mediaUrl ? (
                      <p className="text-xs text-[var(--muted)]">
                        An image background is active. Uploading a video will
                        replace it.
                      </p>
                    ) : null}
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                        Subtitles (.vtt)
                      </p>
                      <MediaFileRow
                        value={subtitlesLabel}
                        emptyLabel="No subtitles set"
                        onUpload={undefined}
                        onDelete={undefined}
                        uploadDisabled
                        deleteDisabled
                        uploadLabel="Upload subtitles"
                        deleteLabel="Remove subtitles"
                      />
                      <p className="text-xs text-[var(--muted)]">
                        {placeholderDisabledReason}
                      </p>
                    </div>
                  </div>
                </BulkField>
              </CollapsibleSection>
              <CollapsibleSection
                title="Audio"
                open={sectionState["Audio media"]}
                onToggle={(next) => setSectionOpen("Audio media", next)}
              >
                <BulkField
                  active={false}
                  disabledReason={audioDisabledReason}
                >
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                        Main audio
                      </p>
                      <MediaFileRow
                        value={audioLabel}
                        emptyLabel="No audio set"
                        onUpload={undefined}
                        onDelete={undefined}
                        uploadDisabled
                        deleteDisabled
                        uploadLabel="Upload main audio"
                        deleteLabel="Remove main audio"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                        Alternate audio
                      </p>
                      <MediaFileRow
                        value={audioAltLabel}
                        emptyLabel="No audio set"
                        onUpload={undefined}
                        onDelete={undefined}
                        uploadDisabled
                        deleteDisabled
                        uploadLabel="Upload alternate audio"
                        deleteLabel="Remove alternate audio"
                      />
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      {placeholderDisabledReason}
                    </p>
                  </div>
                </BulkField>
              </CollapsibleSection>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaInputChange}
                className="sr-only"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="style">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
                <CollapsibleSection
                  title="Background"
                  open={sectionState.Background}
                  onToggle={(next) => setSectionOpen("Background", next)}
                >
                  <div className="space-y-4">
                    <BulkField
                      active={isBulkFieldStaged("color_background")}
                      onClear={() => clearBulkPaths("color_background")}
                    >
                      <ColorOnlyField
                        label="Background"
                        value={sceneColors.background}
                        onChange={(value) =>
                          handleNodePropChange("color_background", value)
                        }
                      />
                    </BulkField>
                    <BulkField
                      active={isBulkFieldStaged([
                        "color_foreground",
                        "alpha_foreground",
                      ])}
                      onClear={() =>
                        clearBulkPaths(["color_foreground", "alpha_foreground"])
                      }
                    >
                      <ColorAlphaField
                        label="Foreground overlay"
                        colorValue={sceneColors.foreground}
                        alphaValue={sceneColors.foregroundAlpha}
                        onColorChange={(value) =>
                          handleNodePropChange("color_foreground", value)
                        }
                        onAlphaChange={(value) =>
                          handleNodePropChange("alpha_foreground", String(value))
                        }
                      />
                    </BulkField>
                    <BulkField
                      active={isBulkFieldStaged("settings_grayscale")}
                      onClear={() => clearBulkPaths("settings_grayscale")}
                    >
                      <ToggleRow
                        label="Grayscale"
                        checked={grayscaleEnabled}
                        onToggle={(next) =>
                          handleNodePropChange("settings_grayscale", [
                            next ? "on" : "",
                          ])
                        }
                      />
                    </BulkField>

                    <BulkField
                      active={isBulkFieldStaged("color_blur")}
                      onClear={() => clearBulkPaths("color_blur")}
                    >
                      <RangeField
                        label="Blur"
                        value={blurAmount}
                        min={BLUR_MIN}
                        max={BLUR_MAX}
                        step={1}
                        allowBeyondMax
                        onChange={(next) =>
                          handleNodePropChange("color_blur", String(next))
                        }
                      />
                    </BulkField>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection
                  title="Layout"
                  open={sectionState.Layout}
                  onToggle={(next) => setSectionOpen("Layout", next)}
                >
                  <div className="space-y-4">
                    <BulkField
                      active={isBulkFieldStaged("settings_scrollSpeed")}
                      onClear={() => clearBulkPaths("settings_scrollSpeed")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-sm font-medium text-[var(--text-secondary)]">
                          Scroll speed
                        </label>
                        <input
                          type="number"
                          min={SCROLL_SPEED_MIN}
                          max={SCROLL_SPEED_MAX}
                          step={0.05}
                          value={scrollSpeed}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            if (!Number.isFinite(next)) return;
                            const clamped = clampNumber(
                              next,
                              SCROLL_SPEED_MIN,
                              SCROLL_SPEED_MAX
                            );
                            handleNodePropChange("settings_scrollSpeed", [
                              String(clamped),
                            ]);
                          }}
                          className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                        />
                      </div>
                    </BulkField>

                    <BulkField
                      active={isBulkFieldStaged("player.verticalPosition")}
                      onClear={() => clearBulkPaths("player.verticalPosition")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-sm font-medium text-[var(--text-secondary)]">
                          Vertical position
                        </label>
                        <div className="relative w-48">
                          <select
                            value={verticalPosition}
                            onChange={(event) =>
                              handleNodePropChange("player.verticalPosition", [
                                event.target.value,
                              ])
                            }
                            className="w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 pr-7 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                          >
                            {verticalPositionOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                    </BulkField>

                    <div className="space-y-3">
                      <BulkField
                        active={isBulkFieldStaged("player_container_marginleft")}
                        onClear={() =>
                          clearBulkPaths("player_container_marginleft")
                        }
                      >
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-sm font-medium text-[var(--text-secondary)]">
                            Left margin
                          </label>
                          <input
                            type="number"
                            min={MARGIN_MIN}
                            max={MARGIN_MAX}
                            step={1}
                            value={marginLeft}
                            onChange={(event) => {
                              const next = Number(event.target.value);
                              if (!Number.isFinite(next)) return;
                              const clamped = clampNumber(
                                next,
                                MARGIN_MIN,
                                MARGIN_MAX
                              );
                              handleNodePropChange(
                                "player_container_marginleft",
                                String(clamped)
                              );
                            }}
                            className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                          />
                        </div>
                      </BulkField>
                      <BulkField
                        active={isBulkFieldStaged("player_container_marginright")}
                        onClear={() =>
                          clearBulkPaths("player_container_marginright")
                        }
                      >
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-sm font-medium text-[var(--text-secondary)]">
                            Right margin
                          </label>
                          <input
                            type="number"
                            min={MARGIN_MIN}
                            max={MARGIN_MAX}
                            step={1}
                            value={marginRight}
                            onChange={(event) => {
                              const next = Number(event.target.value);
                              if (!Number.isFinite(next)) return;
                              const clamped = clampNumber(
                                next,
                                MARGIN_MIN,
                                MARGIN_MAX
                              );
                              handleNodePropChange(
                                "player_container_marginright",
                                String(clamped)
                              );
                            }}
                            className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                          />
                        </div>
                      </BulkField>
                    </div>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection
                  title="Navigation"
                  open={sectionState.Navigation}
                  onToggle={(next) => setSectionOpen("Navigation", next)}
                >
                  <div className="space-y-4">
                    <BulkField
                      active={isBulkFieldStaged("background.navigation_style")}
                      onClear={() =>
                        clearBulkPaths("background.navigation_style")
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-sm font-medium text-[var(--text-secondary)]">
                          Navigation style
                        </label>
                        <div className="relative w-48">
                          <select
                            value={navigationStyle}
                            onChange={(event) =>
                              handleNodePropChange(
                                "background.navigation_style",
                                [event.target.value]
                              )
                            }
                            className="w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 pr-7 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                          >
                            {navigationStyleOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                    </BulkField>

                    <BulkField
                      active={isBulkFieldStaged("playerNavigation.settings")}
                      onClear={() =>
                        clearBulkPaths("playerNavigation.settings")
                      }
                    >
                      <div className="space-y-3">
                        <ToggleRow
                          label="Show current node button"
                          checked={hasNavigationSetting("show-current-node")}
                          onToggle={(next) =>
                            updateNavigationSetting("show-current-node", next)
                          }
                        />
                        <ToggleRow
                          label="Navigation opaque"
                          checked={hasNavigationSetting("navigation-opaque")}
                          onToggle={(next) =>
                            updateNavigationSetting("navigation-opaque", next)
                          }
                        />
                      </div>
                    </BulkField>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection
                  title="Audio"
                  open={sectionState.Audio}
                  onToggle={(next) => setSectionOpen("Audio", next)}
                >
                  <div className="space-y-4">
                    <BulkField
                      active={isBulkFieldStaged("audio_volume")}
                      onClear={() => clearBulkPaths("audio_volume")}
                    >
                      <RangeField
                        label="Audio volume"
                        value={audioVolume}
                        min={AUDIO_VOLUME_MIN}
                        max={AUDIO_VOLUME_MAX}
                        step={1}
                        onChange={(next) =>
                          handleNodePropChange("audio_volume", String(next))
                        }
                      />
                    </BulkField>
                  </div>
                </CollapsibleSection>
              </div>
            </div>
          </TabsContent>
        <TabsContent value="buttons">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
              <CollapsibleSection
                title="Button appearance"
                open={sectionState["Button appearance"]}
                onToggle={(next) => setSectionOpen("Button appearance", next)}
              >
                <div className="space-y-4">
                  <BulkField
                    active={isBulkFieldStaged([
                      "color_buttontext",
                      "alpha_buttontext",
                    ])}
                    onClear={() =>
                      clearBulkPaths(["color_buttontext", "alpha_buttontext"])
                    }
                  >
                    <ColorAlphaField
                      label="Button text"
                      colorValue={sceneColors.buttonText}
                      alphaValue={sceneColors.buttonTextAlpha}
                      onColorChange={(value) =>
                        handleNodePropChange("color_buttontext", value)
                      }
                      onAlphaChange={(value) =>
                        handleNodePropChange("alpha_buttontext", String(value))
                      }
                    />
                  </BulkField>
                  <BulkField
                    active={isBulkFieldStaged([
                      "color_buttonbackground",
                      "alpha_buttonbackground",
                    ])}
                    onClear={() =>
                      clearBulkPaths([
                        "color_buttonbackground",
                        "alpha_buttonbackground",
                      ])
                    }
                  >
                    <ColorAlphaField
                      label="Button background"
                      colorValue={sceneColors.buttonBackground}
                      alphaValue={sceneColors.buttonBackgroundAlpha}
                      onColorChange={(value) =>
                        handleNodePropChange("color_buttonbackground", value)
                      }
                      onAlphaChange={(value) =>
                        handleNodePropChange(
                          "alpha_buttonbackground",
                          String(value)
                        )
                      }
                    />
                  </BulkField>
                  <BulkField
                    active={isBulkFieldStaged("playerNavigation_textSize")}
                    onClear={() =>
                      clearBulkPaths("playerNavigation_textSize")
                    }
                  >
                    <RangeField
                      label="Navigation buttons font size"
                      value={navTextSize}
                      min={NAV_TEXT_SIZE_MIN}
                      max={NAV_TEXT_SIZE_MAX}
                      step={2}
                      onChange={(next) =>
                        handleNodePropChange("playerNavigation_textSize", [
                          String(next),
                        ])
                      }
                    />
                  </BulkField>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Button order"
                open={sectionState["Button order"]}
                onToggle={(next) => setSectionOpen("Button order", next)}
              >
                <BulkField
                  active={isBulkFieldStaged("ordered_link_ids")}
                  disabledReason={
                    bulkActive
                      ? "Bulk edit disabled: button order is per-node."
                      : undefined
                  }
                  onClear={() => clearBulkPaths("ordered_link_ids")}
                >
                  {orderedOutgoingLinks.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">
                      No outgoing links.
                    </p>
                  ) : (
                    <ReorderList
                      items={orderedOutgoingLinks}
                      onReorder={(next) =>
                        handleNodePropChange(
                          "ordered_link_ids",
                          next.map((link) => String(link.linkId))
                        )
                      }
                    />
                  )}
                </BulkField>
              </CollapsibleSection>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="logic">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
              <CollapsibleSection
                title="Conditions"
                open={sectionState.Conditions}
                onToggle={(next) => setSectionOpen("Conditions", next)}
              >
                <div className="space-y-4">
                  <BulkField
                    active={isBulkFieldStaged("node_conditions")}
                    onClear={() => clearBulkPaths("node_conditions")}
                  >
                    <ToggleRow
                      label="Hide visited"
                      checked={hideVisitedEnabled}
                      onToggle={(next) =>
                        handleNodePropChange("node_conditions", [
                          next ? "hide_visited" : "",
                        ])
                      }
                    />
                  </BulkField>
                  <BulkField
                    active={isBulkFieldStaged([
                      "color_nodeconditions",
                      "alpha_nodeconditions",
                    ])}
                    onClear={() =>
                      clearBulkPaths([
                        "color_nodeconditions",
                        "alpha_nodeconditions",
                      ])
                    }
                  >
                    <ColorAlphaField
                      label="Condition color"
                      colorValue={conditionsColor}
                      alphaValue={conditionsAlpha}
                      onColorChange={(value) =>
                        handleNodePropChange("color_nodeconditions", value)
                      }
                      onAlphaChange={(value) =>
                        handleNodePropChange(
                          "alpha_nodeconditions",
                          String(value)
                        )
                      }
                    />
                  </BulkField>
                </div>
              </CollapsibleSection>
              <CollapsibleSection
                title="Tracking"
                open={sectionState.Tracking}
                onToggle={(next) => setSectionOpen("Tracking", next)}
              >
                <div className="space-y-4">
                  <BulkField
                    active={isBulkFieldStaged("node_statistics")}
                    onClear={() => clearBulkPaths("node_statistics")}
                  >
                    <ToggleRow
                      label="Statistics tracking"
                      checked={statisticsEnabled}
                      onToggle={(next) =>
                        handleNodePropChange("node_statistics", [
                          next ? "on" : "",
                        ])
                      }
                    />
                  </BulkField>
                  <BulkField
                    active={isBulkFieldStaged("node_conditions")}
                    onClear={() => clearBulkPaths("node_conditions")}
                  >
                    <ToggleRow
                      label="Node variable"
                      checked={hideVisitedEnabled}
                      onToggle={(next) =>
                        handleNodePropChange("node_conditions", [
                          next ? "hide_visited" : "",
                        ])
                      }
                    />
                  </BulkField>
                </div>
              </CollapsibleSection>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </InspectorShell>
  );
}


const colorInputClasses =
  "h-8 w-12 cursor-pointer rounded-md bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]";

const rangeInputClasses = cn(
  "h-1 w-full cursor-pointer appearance-none bg-transparent",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]",
  "[&::-webkit-slider-thumb]:appearance-none",
  "[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3",
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)]",
  "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[var(--border)]",
  "[&::-webkit-slider-thumb]:mt-[-0.25rem]",
  "[&::-webkit-slider-runnable-track]:h-1",
  "[&::-webkit-slider-runnable-track]:rounded-full",
  "[&::-webkit-slider-runnable-track]:bg-[var(--border)]",
  "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3",
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--accent)]",
  "[&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[var(--border)]",
  "[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full",
  "[&::-moz-range-track]:bg-[var(--border)]"
);

function ColorOnlyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </span>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label} color`}
          className={colorInputClasses}
        />
      </div>
    </div>
  );
}

function ColorAlphaField({
  label,
  colorValue,
  alphaValue,
  onColorChange,
  onAlphaChange,
}: {
  label: string;
  colorValue: string;
  alphaValue: number;
  onColorChange: (value: string) => void;
  onAlphaChange: (value: number) => void;
}) {
  const clampedAlpha = clampAlpha(alphaValue);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </span>
        <input
          type="color"
          value={colorValue}
          onChange={(event) => onColorChange(event.target.value)}
          aria-label={`${label} color`}
          className={colorInputClasses}
        />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <label className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span className="whitespace-nowrap">Opacity</span>
          <input
            type="range"
            min={0}
            max={100}
            value={clampedAlpha}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) return;
              onAlphaChange(clampAlpha(next));
            }}
            aria-label={`${label} opacity`}
            className={rangeInputClasses}
          />
        </label>
        <input
          type="number"
          min={0}
          max={100}
          value={clampedAlpha}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (!Number.isFinite(next)) return;
            onAlphaChange(clampAlpha(next));
          }}
          aria-label={`${label} opacity value`}
          className="w-16 rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
        />
      </div>
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  allowBeyondMax = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  allowBeyondMax?: boolean;
}) {
  const sliderValue = clampNumber(value, min, max);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (!Number.isFinite(next)) return;
            onChange(clampNumber(next, min, max));
          }}
          aria-label={label}
          className={rangeInputClasses}
        />
        <input
          type="number"
          min={min}
          max={allowBeyondMax ? undefined : max}
          step={step}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (!Number.isFinite(next)) return;
            const normalized = allowBeyondMax
              ? Math.max(min, next)
              : clampNumber(next, min, max);
            onChange(normalized);
          }}
          aria-label={`${label} value`}
          className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
        />
      </div>
    </div>
  );
}

function MediaActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant = "outline",
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "secondary" | "outline" | "ghost";
  tone?: "default" | "danger";
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "h-8 w-8 p-0",
        tone === "danger"
          ? "text-[var(--danger)] hover:text-[var(--danger)]"
          : ""
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}

function MediaFileRow({
  value,
  emptyLabel,
  uploadLabel,
  deleteLabel,
  onUpload,
  onDelete,
  uploadDisabled = false,
  deleteDisabled = false,
  helperText,
}: {
  value: string;
  emptyLabel: string;
  uploadLabel: string;
  deleteLabel: string;
  onUpload?: () => void;
  onDelete?: () => void;
  uploadDisabled?: boolean;
  deleteDisabled?: boolean;
  helperText?: string;
}) {
  const displayValue = value.trim();
  const resolvedUploadDisabled = uploadDisabled || !onUpload;
  const resolvedDeleteDisabled = deleteDisabled || !onDelete;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <input
          type="text"
          value={displayValue}
          placeholder={emptyLabel}
          readOnly
          aria-label={displayValue || emptyLabel}
          title={displayValue || emptyLabel}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
        />
        <div className="flex items-center gap-2">
          <MediaActionButton
            icon={Upload}
            label={uploadLabel}
            onClick={onUpload}
            disabled={resolvedUploadDisabled}
          />
          <MediaActionButton
            icon={Trash2}
            label={deleteLabel}
            onClick={onDelete}
            disabled={resolvedDeleteDisabled}
            variant="outline"
            tone="danger"
          />
        </div>
      </div>
      {helperText ? (
        <p className="text-xs text-[var(--muted)]">{helperText}</p>
      ) : null}
    </div>
  );
}

function ReorderList({
  items,
  onReorder,
}: {
  items: Array<{ linkId: number; targetId: number; label: string }>;
  onReorder: (items: Array<{ linkId: number; targetId: number; label: string }>) => void;
}) {
  const rowRefs = useRef(new Map<number, HTMLDivElement>());
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const [draftItems, setDraftItems] = useState(items);
  const draftItemsRef = useRef(draftItems);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const draggingIdRef = useRef<number | null>(null);
  const didDropRef = useRef(false);

  useEffect(() => {
    draftItemsRef.current = draftItems;
  }, [draftItems]);

  useEffect(() => {
    draggingIdRef.current = draggingId;
  }, [draggingId]);

  useEffect(() => {
    if (draggingIdRef.current === null) {
      setDraftItems(items);
    }
  }, [items]);

  const reorderItems = (
    list: Array<{ linkId: number; targetId: number; label: string }>,
    sourceId: number,
    targetId: number
  ) => {
    const fromIndex = list.findIndex((item) => item.linkId === sourceId);
    const toIndex = list.findIndex((item) => item.linkId === targetId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return list;
    }
    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  };

  const handleDragStart = (itemId: number) => (event: React.DragEvent) => {
    didDropRef.current = false;
    setDraggingId(itemId);
    setDraftItems(items);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(itemId));
    const row = rowRefs.current.get(itemId);
    if (row) {
      const rect = row.getBoundingClientRect();
      ghostRef.current?.remove();
      const ghost = document.createElement("div");
      const computed = window.getComputedStyle(row);
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      ghost.style.border = `${computed.borderTopWidth} solid ${computed.borderTopColor}`;
      ghost.style.borderRadius = computed.borderRadius;
      ghost.style.backgroundColor = computed.backgroundColor;
      ghost.style.boxShadow = "0 10px 20px rgba(0, 0, 0, 0.25)";
      ghost.style.opacity = "0.95";
      ghost.style.boxSizing = "border-box";
      ghost.style.position = "absolute";
      ghost.style.top = "-9999px";
      ghost.style.left = "-9999px";
      ghost.style.pointerEvents = "none";
      document.body.appendChild(ghost);
      ghostRef.current = ghost;
      event.dataTransfer.setDragImage(
        ghost,
        rect.width / 2,
        rect.height / 2
      );
    }
  };

  const handleDragOver = (itemId: number) => (event: React.DragEvent) => {
    if (draggingId === null || draggingId === itemId) return;
    event.preventDefault();
    setDraftItems((prev) => reorderItems(prev, draggingId, itemId));
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    didDropRef.current = true;
    const finalItems = draftItemsRef.current;
    const changed =
      finalItems.length === items.length &&
      finalItems.some(
        (item, index) => item.linkId !== items[index]?.linkId
      );
    ghostRef.current?.remove();
    ghostRef.current = null;
    if (changed) {
      onReorder(finalItems);
    }
    setDraggingId(null);
  };

  const handleDragEnd = () => {
    if (!didDropRef.current) {
      setDraftItems(items);
    }
    setDraggingId(null);
    ghostRef.current?.remove();
    ghostRef.current = null;
  };

  const displayItems = draftItems;

  return (
    <div
      className="space-y-2"
      onDragOver={(event) => {
        if (draggingId !== null) event.preventDefault();
      }}
      onDrop={handleDrop}
    >
      {displayItems.map((item) => (
        <div
          key={item.linkId}
          role="listitem"
          ref={(node) => {
            if (node) {
              rowRefs.current.set(item.linkId, node);
            } else {
              rowRefs.current.delete(item.linkId);
            }
          }}
          onDragOver={handleDragOver(item.linkId)}
          onDrop={handleDrop}
          className={cn(
            "flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2",
            draggingId === item.linkId ? "opacity-0" : ""
          )}
        >
          <button
            type="button"
            draggable
            onDragStart={handleDragStart(item.linkId)}
            onDragEnd={handleDragEnd}
            aria-label={`Reorder ${item.label}`}
            className="cursor-grab text-[var(--muted)] active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--text-secondary)]">
              {item.label}
            </p>
            <p className="text-xs text-[var(--muted)]">
              Node #{item.targetId}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-[var(--text-secondary)]">
        {label}
      </span>
      <span className="relative inline-flex h-5 w-10 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(event) => onToggle(event.target.checked)}
          aria-label={label}
        />
        <span
          className={cn(
            "absolute inset-0 rounded-full border border-[var(--border)] bg-[var(--bg-tertiary)] transition",
            "peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent)]",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent-muted)]"
          )}
        />
        <span
          className={cn(
            "absolute left-0.5 h-4 w-4 rounded-full bg-[var(--bg)] shadow-sm transition",
            "peer-checked:translate-x-5"
          )}
        />
      </span>
    </label>
  );
}
