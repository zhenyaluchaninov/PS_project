import type { NodeModel } from "@/domain/models";
import { getFontMeta } from "@/lib/fonts";
import type { BulkDraft } from "../../types";
import {
  CONDITIONS_ALPHA_DEFAULT,
  CONDITIONS_COLOR_DEFAULT,
  MARGIN_DEFAULT,
  SCENE_COLOR_DEFAULTS,
  builtInFontOptions,
  extraAudioValues,
  fadeOptionValues,
  videoAudioValues,
} from "../constants";
import {
  getAnimationDelay,
  getBackgroundFade,
  getAlphaProp,
  getAlphaValue,
  getAudioVolume,
  getBlurAmount,
  getColorProp,
  getColorValue,
  getConditionedBehavior,
  getFontToken,
  getGrayscaleEnabled,
  getLegacyAnimationKind,
  getLegacyAnimationValue,
  getNavTextSize,
  getNavigationSettings,
  getNavigationStyle,
  getNodeChapterType,
  getNodeConditions,
  getNumberProp,
  getOrderedLinkIds,
  getNavigationDelay,
  getScrollSpeed,
  getStatisticsEnabled,
  getStringArrayValue,
  getTextShadow,
  getVerticalPosition,
} from "../utils/propReaders";

export type SceneColors = {
  background: string;
  foreground: string;
  foregroundAlpha: number;
  text: string;
  textAlpha: number;
  textBackground: string;
  textBackgroundAlpha: number;
  buttonText: string;
  buttonTextAlpha: number;
  buttonBackground: string;
  buttonBackgroundAlpha: number;
};

export const useNodeProps = ({
  node,
  bulkDraft,
  outgoingLinks,
  fontList,
}: {
  node: NodeModel;
  bulkDraft: BulkDraft;
  outgoingLinks: Array<{ linkId: number; targetId: number; label: string }>;
  fontList?: string[];
}) => {
  const chapterType = getNodeChapterType(node, bulkDraft);
  const isRefNode = chapterType.startsWith("ref-node");
  const isRandomNode = chapterType === "random-node";
  const showRouterInspector = isRandomNode || isRefNode;
  const navigationStyle = getNavigationStyle(node, bulkDraft);
  const navigationSettings = getNavigationSettings(node, bulkDraft);
  const verticalPosition = getVerticalPosition(node, bulkDraft);
  const scrollSpeed = getScrollSpeed(node, bulkDraft);
  const textShadow = getTextShadow(node, bulkDraft);
  const animationMode = getLegacyAnimationValue(node, bulkDraft);
  const animationModeKind = getLegacyAnimationKind(node, bulkDraft);
  const animationDelay = getAnimationDelay(node, bulkDraft);
  const navigationDelay = getNavigationDelay(node, bulkDraft);
  const backgroundFade = getBackgroundFade(node, bulkDraft);
  const grayscaleEnabled = getGrayscaleEnabled(node, bulkDraft);
  const blurAmount = getBlurAmount(node, bulkDraft);
  const nodeConditions = getNodeConditions(node, bulkDraft);
  const hideVisitedEnabled = nodeConditions.some(
    (token) => token.toLowerCase() === "hide_visited"
  );
  const conditionsBehavior = getConditionedBehavior(node, bulkDraft);
  const statisticsEnabled = getStatisticsEnabled(node, bulkDraft);
  const navTextSize = getNavTextSize(node, bulkDraft);
  const audioVolume = getAudioVolume(node, bulkDraft);
  const audioLoopValue = getStringArrayValue(
    node,
    "settings_audioLoop",
    "false",
    bulkDraft
  );
  const audioLoopEnabled = audioLoopValue.toLowerCase() === "true";
  const audioFadeInValue = getStringArrayValue(
    node,
    "settings_audioFadeIn",
    "",
    bulkDraft
  );
  const audioFadeOutValue = getStringArrayValue(
    node,
    "settings_audioFadeOut",
    "",
    bulkDraft
  );
  const audioFadeIn = fadeOptionValues.has(audioFadeInValue)
    ? audioFadeInValue
    : "";
  const audioFadeOut = fadeOptionValues.has(audioFadeOutValue)
    ? audioFadeOutValue
    : "";
  const extraAudioValue = getStringArrayValue(
    node,
    "settings_extraAudio",
    "",
    bulkDraft
  );
  const extraAudioBehavior = extraAudioValues.has(extraAudioValue)
    ? extraAudioValue
    : "";
  const videoLoopValue = getStringArrayValue(
    node,
    "settings_videoLoop",
    "true",
    bulkDraft
  );
  const videoLoopEnabled = videoLoopValue.toLowerCase() === "true";
  const videoAudioValue = getStringArrayValue(
    node,
    "settings_videoAudio",
    "",
    bulkDraft
  );
  const videoAudioBehavior = videoAudioValues.has(videoAudioValue)
    ? videoAudioValue
    : "";
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
  const uploadedFontOptions = (() => {
    const options: Array<{ value: string; label: string }> = [];
    const seen = new Set<string>();
    (fontList ?? []).forEach((entry) => {
      const meta = getFontMeta(entry);
      if (!meta?.family) return;
      if (seen.has(meta.family)) return;
      seen.add(meta.family);
      const labelBase = meta.displayName || meta.fileName || meta.family;
      options.push({
        value: meta.family,
        label: `${labelBase} (uploaded)`,
      });
    });
    return options;
  })();
  const fontOptions = [...builtInFontOptions, ...uploadedFontOptions];
  const fontOptionValues = new Set(fontOptions.map((option) => option.value));
  const fontSelectValue = fontToken ?? "";
  const needsLegacyOption =
    fontSelectValue !== "" && !fontOptionValues.has(fontSelectValue);
  const missingUploadedFont =
    needsLegacyOption && fontSelectValue.startsWith("xfont-");
  const legacyFontLabel = fontSelectValue
    .replace(/^xfont-/, "")
    .replace(/^font-/, "");
  const sceneColors: SceneColors = {
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

  return {
    chapterType,
    isRefNode,
    isRandomNode,
    showRouterInspector,
    navigationStyle,
    navigationSettings,
    verticalPosition,
    scrollSpeed,
    textShadow,
    animationMode,
    animationModeKind,
    animationDelay,
    navigationDelay,
    backgroundFade,
    grayscaleEnabled,
    blurAmount,
    hideVisitedEnabled,
    nodeConditions,
    conditionsBehavior,
    statisticsEnabled,
    navTextSize,
    audioVolume,
    audioLoopEnabled,
    audioFadeIn,
    audioFadeOut,
    extraAudioBehavior,
    videoLoopEnabled,
    videoAudioBehavior,
    orderedOutgoingLinks,
    marginLeft,
    marginRight,
    conditionsColor,
    conditionsAlpha,
    fontOptions,
    fontSelectValue,
    needsLegacyOption,
    missingUploadedFont,
    legacyFontLabel,
    sceneColors,
  };
};
