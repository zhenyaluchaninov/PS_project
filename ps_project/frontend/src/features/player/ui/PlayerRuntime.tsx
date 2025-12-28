"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type MutableRefObject,
} from "react";
import { useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import type { AdventureModel, AdventurePropsModel, LinkModel, NodeModel } from "@/domain/models";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  Menu as MenuIcon,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { LegacyContent } from "@/features/ui-core/components/LegacyContent";
import { PlayerLayout } from "@/features/ui-core/components/PlayerLayout";
import { buildPropsStyle, type PropsInput } from "@/features/ui-core/props";
import { Button } from "@/features/ui-core/primitives";
import { toastError, toastInfo } from "@/features/ui-core/toast";
import { trackNodeVisit } from "@/features/state/api/adventures";
import { cn } from "@/lib/utils";
import { buildFontFaceRules } from "@/lib/fonts";
import "./player-runtime.css";
import "./player-legacy-skin.css";
import {
  selectPlayerAdventure,
  selectPlayerCurrentNode,
  selectPlayerCurrentNodeKind,
  selectPlayerCurrentNodeId,
  selectPlayerHistoryLength,
  selectPlayerMode,
  selectPlayerOutgoingLinks,
  type PlayerStoreHook,
  usePlayerStore,
} from "../state/playerStore";
import { resolveReferenceUrl, resolveVideoSource } from "../engine/playerEngine";
import {
  createAudioEngine,
  type AudioEngine,
  type AudioDebugSnapshot,
  type AudioSourceConfig,
} from "../media/audioEngine";
import {
  buildLinksBySource,
  buildNavigationConfig,
  getOutgoingLinksForNode,
  normalizeNavStyle,
  type NavPlacement,
  type NavStyle,
} from "../utils/navigationUtils";
import { buildNodeById, resolveNodeKind, type NodeKind } from "../utils/nodeUtils";
import { useViewportDevice } from "./useViewportDevice";
import { ScrollyTracker } from "./ScrollyTracker";

const paramIsTruthy = (value?: string | null) =>
  value ? ["1", "true", "yes", "on"].includes(value.toLowerCase()) : false;

type SubtitleStatus = {
  state: "idle" | "loading" | "ok" | "error";
  attempted: string[];
};

type StatsDebugState = {
  lastAttempt: { nodeId: number; adventureSlug: string } | null;
  sent: number;
  deduped: number;
  skippedDisabled: number;
  errors: number;
};

type PlayerPreferences = {
  highContrast?: boolean;
  hideBackground?: boolean;
  soundEnabled: boolean;
  statisticsEnabled?: boolean;
};

type SearchParamLike = ReadonlyURLSearchParams | URLSearchParams | null | undefined;

const preferenceStorageKey = (slug?: string | null, viewSlug?: string | null) => {
  const key = slug || viewSlug;
  return key ? `ps-player:prefs:${key}` : null;
};

const readStoredPreferences = (key?: string | null): PlayerPreferences | null => {
  if (!key) return null;
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlayerPreferences>;
    return {
      highContrast:
        typeof parsed.highContrast === "boolean" ? parsed.highContrast : undefined,
      hideBackground:
        typeof parsed.hideBackground === "boolean" ? parsed.hideBackground : undefined,
      soundEnabled: typeof parsed.soundEnabled === "boolean" ? parsed.soundEnabled : true,
      statisticsEnabled:
        typeof parsed.statisticsEnabled === "boolean" ? parsed.statisticsEnabled : undefined,
    };
  } catch (err) {
    console.warn("[player] could not read stored preferences", err);
    return null;
  }
};

const persistPreferences = (key: string, prefs: PlayerPreferences) => {
  if (typeof window === "undefined") return;
  try {
    const payload: PlayerPreferences = {
      soundEnabled: prefs.soundEnabled ?? true,
    };
    if (typeof prefs.highContrast === "boolean") {
      payload.highContrast = prefs.highContrast;
    }
    if (typeof prefs.hideBackground === "boolean") {
      payload.hideBackground = prefs.hideBackground;
    }
    if (typeof prefs.statisticsEnabled === "boolean") {
      payload.statisticsEnabled = prefs.statisticsEnabled;
    }
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.warn("[player] could not persist preferences", err);
  }
};

const FONT_STYLE_SELECTOR = "style[data-player-fonts]";

const useLoadAdventureFonts = (fontList?: AdventurePropsModel["fontList"]) => {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const rules = buildFontFaceRules(fontList ?? []);
    const existing = document.head.querySelector<HTMLStyleElement>(
      FONT_STYLE_SELECTOR
    );
    if (!rules) {
      existing?.remove();
      return;
    }
    const style = existing ?? document.createElement("style");
    style.setAttribute("data-player-fonts", "true");
    style.textContent = rules;
    if (!existing) {
      document.head.appendChild(style);
    }
  }, [fontList]);
};

const readBooleanParam = (params: SearchParamLike, keys: string[]) => {
  if (!params) return undefined;
  for (const key of keys) {
    if (params.has(key)) {
      return paramIsTruthy(params.get(key));
    }
  }
  return undefined;
};

const readNumberParam = (params: SearchParamLike, key: string): number | null => {
  if (!params) return null;
  const raw = params.get(key);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const resolveSoundParam = (params: SearchParamLike) => {
  const mute = readBooleanParam(params, ["mute", "muted"]);
  if (mute !== undefined) {
    return !mute;
  }
  return readBooleanParam(params, ["sound", "audio", "soundEnabled"]);
};

const MENU_OPTION_VALUES = ["back", "home", "menu", "sound"] as const;

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parsePropsInput = (input?: PropsInput | null): Record<string, unknown> => {
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

const readMenuOptions = (props?: Record<string, unknown> | null): string[] => {
  if (!props) return [...MENU_OPTION_VALUES];
  const raw = props.menu_option ?? props.menuOption ?? props.menu_options;
  if (raw === undefined || raw === null) return [...MENU_OPTION_VALUES];

  let values: string[] = [];
  if (Array.isArray(raw)) {
    values = raw.filter((item): item is string => typeof item === "string");
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed === "all") return [...MENU_OPTION_VALUES];
    values = [trimmed];
  }

  return MENU_OPTION_VALUES.filter((value) => values.includes(value));
};

const readMenuSoundOverride = (props?: Record<string, unknown> | null): boolean => {
  if (!props) return true;
  const raw = props.menu_sound_override ?? props.menuSoundOverride;
  if (raw === undefined || raw === null) return true;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (!normalized) return true;
    return ["1", "true", "yes", "on"].includes(normalized);
  }
  return true;
};

type MenuShortcut = {
  nodeId: number | null;
  text: string;
};

type MenuShortcutItem = {
  nodeId: number;
  label: string;
};

const parseShortcutNodeId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/^#/, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const readMenuShortcuts = (props?: Record<string, unknown> | null): MenuShortcut[] => {
  const raw = props?.menu_shortcuts ?? props?.menuShortcuts;
  const list = Array.isArray(raw) ? raw : [];
  return Array.from({ length: 9 }, (_, index) => {
    const entry = isPlainRecord(list[index]) ? list[index] : {};
    const nodeValue =
      entry.nodeId ?? entry.node_id ?? entry.nodeID ?? entry.nodeid;
    const nodeId = parseShortcutNodeId(nodeValue);
    const text = typeof entry.text === "string" ? entry.text : "";
    return { nodeId, text };
  });
};

const getRawSubtitlesValue = (node?: NodeModel | null) => {
  if (!node) return null;
  if (node.props && "subtitlesUrl" in node.props && node.props.subtitlesUrl) {
    return node.props.subtitlesUrl;
  }
  const raw = node.rawProps as Record<string, unknown> | null | undefined;
  const rawValue = raw?.["subtitles_url"] ?? raw?.["subtitlesUrl"];
  return typeof rawValue === "string" ? rawValue : null;
};

const resolveUploadCandidates = (
  adventureSlug: string | null | undefined,
  adventureViewSlug: string | null | undefined,
  rawValue: string | null
) => {
  if (!rawValue) return [];
  const value = rawValue.trim();
  const candidates: string[] = [];

  const push = (url: string | null | undefined) => {
    if (!url) return;
    if (!candidates.includes(url)) candidates.push(url);
  };

  if (/^https?:\/\//i.test(value)) {
    push(value);
    return candidates;
  }

  if (value.startsWith("/upload/")) {
    push(value);
  } else if (value.startsWith("/")) {
    push(value);
  } else {
    const trimmedFile = value.replace(/^\/+/, "");
    const slug = adventureSlug || adventureViewSlug || "";
    if (slug) {
      push(`/upload/${slug}/${trimmedFile}`);
    }
    if (adventureViewSlug && adventureViewSlug !== slug) {
      push(`/upload/${adventureViewSlug}/${trimmedFile}`);
    }
    push(`/upload/${trimmedFile}`);
  }

  push(value);

  return candidates;
};

const resolveSubtitleCandidates = (
  adventureSlug: string | null | undefined,
  adventureViewSlug: string | null | undefined,
  rawValue: string | null
) => resolveUploadCandidates(adventureSlug, adventureViewSlug, rawValue);

const resolveAudioCandidates = (
  adventureSlug: string | null | undefined,
  adventureViewSlug: string | null | undefined,
  rawValue: string | null
) => resolveUploadCandidates(adventureSlug, adventureViewSlug, rawValue);

type NavItem = { kind: "link"; link: LinkModel } | { kind: "current" };
type NavigationButton = {
  key: string;
  label: string;
  linkId?: number;
  targetNodeId?: number;
  disabled?: boolean;
  isBroken?: boolean;
  isCurrent?: boolean;
};

type NavigationModel = {
  buttons: NavigationButton[];
  primaryLinkId?: number;
};

const tokenize = (value: unknown): string[] => {
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

const readRawProp = (raw: Record<string, unknown> | null | undefined, keys: string[]) => {
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

const clampVolume = (value: number, fallback = 1) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, 0), 1);
};

const normalizeAudioVolume = (value: unknown): number => {
  if (value === undefined || value === null) return 1;
  const primary = Array.isArray(value) ? value[0] : value;
  const numeric = Number(primary);
  if (!Number.isFinite(numeric)) return 1;
  if (numeric > 1.0001) {
    return clampVolume(numeric / 100);
  }
  return clampVolume(numeric);
};

const coerceSeconds = (value: unknown): number | null => {
  if (value === undefined || value === null) return null;
  const primary = Array.isArray(value) ? value[0] : value;
  const numeric = Number(primary);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, numeric);
};

const booleanFromTokens = (value: unknown): boolean => {
  const tokens = tokenize(value).map((token) => token.toLowerCase());
  return tokens.some((token) => token === "true" || token === "on" || token === "1" || token === "yes");
};

const pickFirstString = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const found = value.find((item) => typeof item === "string" && String(item).trim());
    if (typeof found === "string" && found.trim()) return found.trim();
  }
  return null;
};

const resolveParagraphDelay = (value?: string | null): number => {
  const suffix = value?.split("-")[1]?.toLowerCase() ?? "";
  switch (suffix) {
    case "faster":
      return 1.0;
    case "paragraphs":
      return 2.0;
    case "slower":
      return 3.0;
    case "slowerer":
      return 4.0;
    case "slowest":
      return 5.0;
    default:
      return 0.0;
  }
};

const readLegacyAnimationSettings = (
  adventureProps?: PropsInput,
  nodeProps?: PropsInput
) => {
  const merged = {
    ...parsePropsInput(adventureProps),
    ...parsePropsInput(nodeProps),
  };
  const animationDelay =
    coerceSeconds(readRawProp(merged, ["animation_delay"])) ?? 0;
  const navigationDelay =
    coerceSeconds(readRawProp(merged, ["playerNavigation_delay"])) ?? 0;
  const backgroundFadeSeconds =
    coerceSeconds(readRawProp(merged, ["animation_backgroundfade"])) ?? 1;
  const animationToken = pickFirstString(
    readRawProp(merged, ["player_container.animation"])
  );
  const paragraphDelay = resolveParagraphDelay(animationToken);

  return {
    animationDelay,
    navigationDelay,
    backgroundFadeSeconds,
    paragraphDelay,
  };
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeLegacyHtml = (value: string) =>
  value.replace(/font-size:\s*(\d+(?:\.\d+)?)pt/gi, (match, num) => {
    const parsed = parseInt(num, 10);
    if (!Number.isFinite(parsed)) return match;
    return `font-size: ${(parsed / 10).toFixed(3)}em`;
  });

const hasEditorVersion = (props?: Record<string, unknown> | null): boolean => {
  if (!props) return false;
  const raw = readRawProp(props, [
    "editorVersion",
    "editor_version",
    "editorversion",
  ]);
  const primary = Array.isArray(raw) ? raw[0] : raw;
  if (primary === undefined || primary === null) return false;
  const value = String(primary).trim();
  return value !== "" && value !== "0";
};

const resolveChapterType = (props?: Record<string, unknown> | null): string => {
  if (!props) return "";
  const raw = readRawProp(props, [
    "settings_chapterType",
    "settingsChapterType",
    "chapterType",
    "chapter_type",
  ]);
  return tokenize(raw)[0]?.toLowerCase() ?? "";
};

const buildLegacyNodeText = (
  node: NodeModel,
  nodeProps: Record<string, unknown>
) => {
  const rawText = node.text ?? "";
  const title = (node.title ?? "").trim();
  const hasImage = Boolean(node.image?.url);
  const hasContent = rawText.trim().length > 0;
  let content = rawText;
  let usedFallbackTitle = false;

  if (!hasContent && !hasImage) {
    content = title || "Här finns inget innehåll";
    usedFallbackTitle = true;
  }

  const chapterType = resolveChapterType(nodeProps);
  if (chapterType === "start-node") {
    if (title) {
      return `<h1 class="title">${escapeHtml(title)}</h1>`;
    }
    return content;
  }

  if (chapterType === "chapter-node" || chapterType === "chapter-node-plain") {
    if (!title) return content;
    const style =
      chapterType === "chapter-node-plain" ? ' style="border-bottom: none;"' : "";
    const heading = `<h1 class="title"${style}>${escapeHtml(title)}</h1>`;
    if (!hasContent && usedFallbackTitle && content === title) {
      return heading;
    }
    return content ? `${heading}\n${content}` : heading;
  }

  return content;
};

const buildLegacyContent = (
  node: NodeModel,
  nodeProps: Record<string, unknown>
) => {
  const value = buildLegacyNodeText(node, nodeProps);
  const allowMarkdown = !hasEditorVersion(nodeProps);
  return {
    value: allowMarkdown ? value : normalizeLegacyHtml(value),
    allowMarkdown,
  };
};

const buildAudioSourceConfig = (
  node?: NodeModel | null,
  adventure?: AdventureModel | null
): AudioSourceConfig | null => {
  if (!node) return null;
  const rawProps = node.rawProps as Record<string, unknown> | null | undefined;
  const mainRaw =
    pickFirstString(readRawProp(rawProps, ["audio_url", "audioUrl"])) ??
    pickFirstString((node.props as Record<string, unknown> | null | undefined)?.["audioUrl"]);
  const altRaw =
    pickFirstString(readRawProp(rawProps, ["audio_url_alt", "audioUrlAlt"])) ??
    pickFirstString((node.props as Record<string, unknown> | null | undefined)?.["audioUrlAlt"]);
  const volumeRaw =
    readRawProp(rawProps, ["audio_volume", "audioVolume"]) ??
    (node.props as Record<string, unknown> | null | undefined)?.["audioVolume"];
  const fadeIn = coerceSeconds(readRawProp(rawProps, ["settings_audioFadeIn", "audioFadeIn"]));
  const fadeOut = coerceSeconds(readRawProp(rawProps, ["settings_audioFadeOut", "audioFadeOut"]));
  const loop = booleanFromTokens(readRawProp(rawProps, ["settings_audioLoop", "audioLoop"]));
  const extraAudioTokens = tokenize(readRawProp(rawProps, ["settings_extraAudio", "extraAudio"])).map(
    (token) => token.toLowerCase()
  );
  const altBehavior: AudioSourceConfig["altBehavior"] = extraAudioTokens.includes("play_once")
    ? "play_once"
    : "always";

  return {
    nodeId: node.nodeId ?? null,
    mainCandidates: resolveAudioCandidates(adventure?.slug, adventure?.viewSlug, mainRaw),
    altCandidates: resolveAudioCandidates(adventure?.slug, adventure?.viewSlug, altRaw),
    volume: normalizeAudioVolume(volumeRaw),
    fadeInSeconds: fadeIn ?? undefined,
    fadeOutSeconds: fadeOut ?? undefined,
    loop,
    altBehavior,
  };
};

const getVideoLoopSetting = (node?: NodeModel | null): boolean => {
  const rawProps = node?.rawProps as Record<string, unknown> | null | undefined;
  const value = readRawProp(rawProps, ["settings_videoLoop", "videoLoop"]);
  if (value === undefined) return true;
  return booleanFromTokens(value);
};

const getVideoAudioSetting = (node?: NodeModel | null): "off" | "off_mobile" | "" => {
  const rawProps = node?.rawProps as Record<string, unknown> | null | undefined;
  const tokens = tokenize(readRawProp(rawProps, ["settings_videoAudio", "videoAudio"]));
  const value = tokens[0]?.toLowerCase() ?? "";
  return value === "off" || value === "off_mobile" ? value : "";
};

const hasHideVisitedCondition = (node?: NodeModel | null): boolean => {
  if (!node?.rawProps) return false;
  const conditions = tokenize(
    readRawProp(node.rawProps, ["node_conditions", "nodeConditions", "node-conditions"])
  ).map((token) => token.toLowerCase());
  return conditions.includes("hide_visited");
};

const isStatisticsEnabledForNode = (node?: NodeModel | null): boolean => {
  if (!node?.rawProps) return false;
  return booleanFromTokens(
    readRawProp(node.rawProps, ["node_statistics", "nodeStatistics", "node-statistics"])
  );
};

const applyOrder = <T,>(
  items: T[],
  order: number[] | null | undefined,
  getId: (item: T) => number
) => {
  if (!order || order.length === 0) return items;

  const ordered: T[] = [];
  const used = new Set<number>();

  order.forEach((rawId) => {
    const id = Number(rawId);
    if (!Number.isFinite(id) || used.has(id)) return;
    const found = items.find((item) => getId(item) === id);
    if (found) {
      ordered.push(found);
      used.add(id);
    }
  });

  items.forEach((item) => {
    const id = getId(item);
    if (!used.has(id)) ordered.push(item);
  });

  return ordered;
};

const addPressedClass = (event: ReactPointerEvent<HTMLElement>) => {
  event.currentTarget.classList.add("btn-pressed");
};

const removePressedClass = (event: ReactPointerEvent<HTMLElement>) => {
  event.currentTarget.classList.remove("btn-pressed");
};

type PlayerRuntimeProps = {
  startNodeIdOverride?: number | null;
  playerStore?: PlayerStoreHook;
  embedded?: boolean;
  viewportScope?: "document" | "target";
};

export function PlayerRuntime({
  startNodeIdOverride,
  playerStore,
  embedded = false,
  viewportScope,
}: PlayerRuntimeProps) {
  const searchParams = useSearchParams();
  const store = playerStore ?? usePlayerStore;
  const adventure = store(selectPlayerAdventure);
  const currentNode = store(selectPlayerCurrentNode);
  const currentNodeKind = store(selectPlayerCurrentNodeKind);
  const currentNodeId = store(selectPlayerCurrentNodeId);
  const outgoingLinks = store(selectPlayerOutgoingLinks);
  const mode = store(selectPlayerMode);
  const historyLength = store(selectPlayerHistoryLength);
  const history = store((s) => s.history);
  const visitedNodes = store((s) => s.visited);
  const chooseLink = store((s) => s.chooseLink);
  const start = store((s) => s.start);
  const getNodeById = store((s) => s.getNodeById);
  const goBack = store((s) => s.goBack);
  const goToNode = store((s) => s.goToNode);

  const adventureProps = adventure?.props as Record<string, unknown> | null | undefined;
  const menuOptions = useMemo(() => readMenuOptions(adventureProps ?? null), [adventureProps]);
  const menuSoundOverride = useMemo(
    () => readMenuSoundOverride(adventureProps ?? null),
    [adventureProps]
  );
  const menuShortcuts = useMemo(
    () => readMenuShortcuts(adventureProps ?? null),
    [adventureProps]
  );
  const menuButtons = useMemo(
    () => ({
      back: menuOptions.includes("back"),
      home: menuOptions.includes("home"),
      menu: menuOptions.includes("menu"),
      sound: menuOptions.includes("sound"),
    }),
    [menuOptions]
  );
  const homeShortcut = menuShortcuts[0];
  const homeTargetId = homeShortcut?.nodeId ?? null;
  const homeLabel = homeShortcut?.text?.trim() ?? "";
  const menuShortcutItems = useMemo(() => {
    const items = menuShortcuts.slice(1).map((shortcut, index) => ({
      nodeId: shortcut.nodeId,
      label:
        shortcut.text?.trim() ||
        (shortcut.nodeId != null ? `Node #${shortcut.nodeId}` : `Shortcut ${index + 1}`),
    }));
    return items.filter(
      (shortcut): shortcut is MenuShortcutItem => shortcut.nodeId != null
    );
  }, [menuShortcuts]);

  const historyNodes = useMemo(
    () =>
      history
        .map((entry) => getNodeById(entry.nodeId))
        .filter((node): node is NodeModel => Boolean(node)),
    [history, getNodeById]
  );
  const preferenceKey = useMemo(
    () => preferenceStorageKey(adventure?.slug, adventure?.viewSlug),
    [adventure?.slug, adventure?.viewSlug]
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuNavigationMutePending, setMenuNavigationMutePending] = useState(false);
  const mutedMenuNodeIdRef = useRef<number | null>(null);
  const [viewportActiveNodeId, setViewportActiveNodeId] = useState<number | null>(null);
  const [scrollyReturnNonce, setScrollyReturnNonce] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const playerRootRef = useRef<HTMLDivElement | null>(null);
  const runningAnimationsRef = useRef<Animation[]>([]);
  const previousBackgroundIdentityRef = useRef<string | null>(null);
  const animationRetryRef = useRef(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
  const [subtitleStatus, setSubtitleStatus] = useState<SubtitleStatus>({
    state: "idle",
    attempted: [],
  });
  const [hasInteracted, setHasInteracted] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const isTouchDevice = useMemo(() => {
    if (typeof window === "undefined") return false;
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
    return (
      coarse ||
      "ontouchstart" in window ||
      (navigator?.maxTouchPoints ?? 0) > 0
    );
  }, []);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setPrefersReducedMotion(media.matches);
    };
    update();
    if ("addEventListener" in media) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const [audioDebug, setAudioDebug] = useState<AudioDebugSnapshot | null>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);
  const statsSessionRef = useRef<{ adventureSlug: string | null; seen: Set<number> }>({
    adventureSlug: null,
    seen: new Set(),
  });
  const lastNodeKeyRef = useRef<string | null>(null);
  const [statsDebug, setStatsDebug] = useState<StatsDebugState>(() => ({
    lastAttempt: null,
    sent: 0,
    deduped: 0,
    skippedDisabled: 0,
    errors: 0,
  }));

  const debugMedia = paramIsTruthy(
    searchParams?.get("debugMedia") ?? searchParams?.get("debugmedia")
  );
  const debugLayout = paramIsTruthy(
    searchParams?.get("debugLayout") ?? searchParams?.get("debuglayout")
  );
  const debugUi = paramIsTruthy(searchParams?.get("debug") ?? searchParams?.get("dev"));
  const startOverrideNodeId = useMemo(
    () =>
      startNodeIdOverride ??
      readNumberParam(searchParams, "nodeId") ??
      readNumberParam(searchParams, "nodeid"),
    [searchParams, startNodeIdOverride]
  );

  const resolvedViewportScope = viewportScope ?? (embedded ? "target" : "document");
  useViewportDevice({ targetSelector: ".ps-player", scope: resolvedViewportScope });

  useEffect(() => {
    if (hasInteracted) return;
    const handleFirstPointer = () => setHasInteracted(true);
    window.addEventListener("pointerdown", handleFirstPointer, { once: true, passive: true });
    return () => window.removeEventListener("pointerdown", handleFirstPointer);
  }, [hasInteracted]);

  useEffect(() => {
    const engine = createAudioEngine();
    audioEngineRef.current = engine;
    return () => {
      engine.dispose();
      audioEngineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      setDocumentVisible(document.visibilityState !== "hidden");
    };
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

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

  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (menuButtons.menu) return;
    setMenuOpen(false);
  }, [menuButtons.menu]);

  useEffect(() => {
    setMenuOpen(false);
  }, [currentNode?.nodeId]);

  useEffect(() => {
    if (menuSoundOverride) return;
    mutedMenuNodeIdRef.current = null;
    setMenuNavigationMutePending(false);
  }, [menuSoundOverride]);

  useEffect(() => {
    if (!menuNavigationMutePending) return;
    if (currentNodeId == null) return;
    mutedMenuNodeIdRef.current = currentNodeId;
    setMenuNavigationMutePending(false);
  }, [currentNodeId, menuNavigationMutePending]);

  useEffect(() => {
    const mutedNodeId = mutedMenuNodeIdRef.current;
    if (mutedNodeId != null && currentNodeId !== mutedNodeId) {
      mutedMenuNodeIdRef.current = null;
    }
  }, [currentNodeId]);

  useEffect(() => {
    if (!currentNode) {
      const shouldOverrideStart = mode === "preview" || mode === "standalone";
      start(shouldOverrideStart ? startOverrideNodeId ?? undefined : undefined);
    }
  }, [currentNode, mode, start, startOverrideNodeId]);

  useEffect(() => {
    if (!debugLayout) return;
    if (typeof window === "undefined") return;

    const logLayout = () => {
      const root = document.querySelector<HTMLElement>(".ps-player");
      const content = document.querySelector<HTMLElement>(".ps-player__content");
      if (!root || !content) return;

      const contentRect = content.getBoundingClientRect();
      console.info("[player][debugLayout]", {
        root: {
          scrollWidth: root.scrollWidth,
          clientWidth: root.clientWidth,
          offsetWidth: root.offsetWidth,
          windowInnerWidth: window.innerWidth,
        },
        contentRect: {
          width: contentRect.width,
          left: contentRect.left,
          right: contentRect.right,
          x: contentRect.x,
        },
      });
    };

    const handleResize = () => window.requestAnimationFrame(logLayout);
    logLayout();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [debugLayout]);

  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    engine.setDebugListener(debugMedia ? setAudioDebug : undefined);
    if (!debugMedia) {
      setAudioDebug(null);
    } else {
      setAudioDebug(engine.getDebugState());
    }
  }, [debugMedia]);

  const navOverrides = useMemo(
    () => {
      const styleOverride = normalizeNavStyle(
        searchParams?.get("navStyle") ??
          searchParams?.get("navstyle") ??
          searchParams?.get("nav")
      );
      const bottomOverride = paramIsTruthy(
        searchParams?.get("navBottom") ?? searchParams?.get("navbottom")
      );
      const showCurrentOverride =
        searchParams && (searchParams.has("navShowCurrent") || searchParams.has("navCurrent"))
          ? paramIsTruthy(searchParams.get("navShowCurrent") ?? searchParams.get("navCurrent"))
          : undefined;
      const hideVisitedOverride =
        searchParams && (searchParams.has("navHideVisited") || searchParams.has("navHide"))
          ? paramIsTruthy(searchParams.get("navHideVisited") ?? searchParams.get("navHide"))
          : undefined;
      return { styleOverride, bottomOverride, showCurrentOverride, hideVisitedOverride };
    },
    [searchParams]
  );

  const navigationConfig = useMemo(
    () =>
      buildNavigationConfig(currentNode?.rawProps, {
        styleOverride: navOverrides.styleOverride ?? undefined,
        bottomOverride: navOverrides.bottomOverride,
        showCurrentOverride: navOverrides.showCurrentOverride,
        hideVisitedOverride: navOverrides.hideVisitedOverride,
      }),
    [currentNode?.rawProps, navOverrides]
  );

  const isScrollytell = navigationConfig.style === "scrollytell";
  const isSwipeNav =
    !isScrollytell &&
    (navigationConfig.style === "swipe" || navigationConfig.style === "swipeWithButton");
  const viewportActiveNode = useMemo(
    () => (viewportActiveNodeId != null ? getNodeById(viewportActiveNodeId) : undefined),
    [getNodeById, viewportActiveNodeId]
  );
  const activeNode = isScrollytell ? viewportActiveNode ?? currentNode : currentNode;
  const activeNodeKind = useMemo(() => resolveNodeKind(activeNode), [activeNode]);

  useEffect(() => {
    if (!isScrollytell) {
      setViewportActiveNodeId(null);
      return;
    }
    if (currentNodeId == null) return;
    const hasActive =
      viewportActiveNodeId != null &&
      historyNodes.some((node) => node.nodeId === viewportActiveNodeId);
    if (!hasActive) {
      setViewportActiveNodeId(currentNodeId);
    }
  }, [currentNodeId, historyNodes, isScrollytell, viewportActiveNodeId]);

  const handleViewportActiveChange = useCallback((nodeId: number | null) => {
    setViewportActiveNodeId((prev) => (prev === nodeId ? prev : nodeId));
  }, []);

  const handleReturnToCurrent = () => {
    if (currentNodeId == null) return;
    setScrollyReturnNonce((prev) => prev + 1);
  };

  const mergedNodeProps = useMemo(
    () => ({
      ...parsePropsInput(activeNode?.rawProps),
      ...parsePropsInput(activeNode?.props),
    }),
    [activeNode?.rawProps, activeNode?.props]
  );
  const propsResult = useMemo(
    () =>
      buildPropsStyle({
        adventureProps: adventure?.props ?? undefined,
        nodeProps: mergedNodeProps,
        overrideHighContrast: preferences.highContrast,
        overrideHideBackground: preferences.hideBackground,
      }),
    [
      adventure?.props,
      mergedNodeProps,
      preferences.highContrast,
      preferences.hideBackground,
    ]
  );

  const { style: propsStyle, flags, dataProps, layout, media, typography } = propsResult;
  const animationSettings = useMemo(
    () => readLegacyAnimationSettings(adventure?.props, mergedNodeProps),
    [adventure?.props, mergedNodeProps]
  );
  const soundEnabled = preferences.soundEnabled ?? true;
  const effectiveSoundEnabled =
    soundEnabled && mutedMenuNodeIdRef.current !== currentNodeId;
  const statisticsEnabled = preferences.statisticsEnabled ?? true;
  const statisticsAllowed = mode === "play";
  const statisticsDisabledReason = statisticsAllowed
    ? null
    : mode === "preview"
      ? "Disabled in preview mode"
      : "Disabled in standalone mode";
  const nodeStatisticsEnabled = useMemo(
    () => isStatisticsEnabledForNode(currentNode),
    [currentNode?.rawProps]
  );
  const audioSource = useMemo<AudioSourceConfig | null>(
    () => buildAudioSourceConfig(activeNode, adventure),
    [activeNode, adventure]
  );
  const audioVolume = audioSource?.volume ?? 1;

  const bumpStatsDebug = useCallback(
    (
      kind: "sent" | "deduped" | "skipped" | "error",
      lastAttempt?: StatsDebugState["lastAttempt"]
    ) => {
      setStatsDebug((prev) => {
        const next = { ...prev, lastAttempt: lastAttempt ?? prev.lastAttempt };
        if (kind === "sent") {
          next.sent = prev.sent + 1;
        } else if (kind === "deduped") {
          next.deduped = prev.deduped + 1;
        } else if (kind === "skipped") {
          next.skippedDisabled = prev.skippedDisabled + 1;
        } else {
          next.errors = prev.errors + 1;
        }
        return next;
      });
    },
    []
  );

  useEffect(() => {
    const slug = adventure?.slug ?? null;
    if (statsSessionRef.current.adventureSlug === slug) return;
    statsSessionRef.current = { adventureSlug: slug, seen: new Set() };
    lastNodeKeyRef.current = null;
    setStatsDebug({
      lastAttempt: null,
      sent: 0,
      deduped: 0,
      skippedDisabled: 0,
      errors: 0,
    });
  }, [adventure?.slug]);

  useEffect(() => {
    const nodeId = currentNode?.nodeId;
    const adventureSlug = adventure?.slug ?? null;
    if (nodeId == null || !Number.isFinite(nodeId) || !adventureSlug) return;

    const nodeKey = `${adventureSlug}:${nodeId}`;
    if (lastNodeKeyRef.current === nodeKey) return;
    lastNodeKeyRef.current = nodeKey;

    const lastAttempt = { nodeId, adventureSlug };

    if (!statisticsAllowed || !statisticsEnabled || !nodeStatisticsEnabled) {
      bumpStatsDebug("skipped", lastAttempt);
      return;
    }

    const session = statsSessionRef.current;
    if (session.seen.has(nodeId)) {
      bumpStatsDebug("deduped", lastAttempt);
      return;
    }

    session.seen.add(nodeId);
    bumpStatsDebug("sent", lastAttempt);
    void trackNodeVisit(adventureSlug, nodeId).catch(() => {
      bumpStatsDebug("error");
    });
  }, [
    adventure?.slug,
    bumpStatsDebug,
    currentNode?.nodeId,
    nodeStatisticsEnabled,
    statisticsAllowed,
    statisticsEnabled,
  ]);

  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    engine.reset();
  }, [adventure?.slug]);

  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    engine.setPlaybackState({
      soundEnabled: effectiveSoundEnabled,
      canAutoplay: hasInteracted,
      isDocumentVisible: documentVisible,
    });
  }, [documentVisible, effectiveSoundEnabled, hasInteracted]);

  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    engine.setSource(audioSource);
    if (audioSource) {
      engine.preload([...audioSource.mainCandidates, ...audioSource.altCandidates]);
    }
  }, [audioSource]);

  useEffect(() => {
    const video = backgroundVideoRef.current;
    if (!video) return;
    const effectiveVolume = effectiveSoundEnabled ? audioVolume : 0;
    video.volume = effectiveVolume;
  }, [audioVolume, effectiveSoundEnabled]);

  const handleToggleHighContrast = () => {
    setPreferences((prev) => ({
      ...prev,
      highContrast: !flags.highContrast,
    }));
  };

  const handleToggleHideBackground = () => {
    setPreferences((prev) => ({
      ...prev,
      hideBackground: !flags.hideBackground,
    }));
  };

  const handleToggleSound = () => {
    setHasInteracted(true);
    setPreferences((prev) => ({
      ...prev,
      soundEnabled: !(prev.soundEnabled ?? true),
    }));
  };

  const handleToggleStatistics = () => {
    setPreferences((prev) => ({
      ...prev,
      statisticsEnabled: !(prev.statisticsEnabled ?? true),
    }));
  };

  const handleToggleMenu = () => {
    if (!menuButtons.menu) return;
    setMenuOpen((prev) => !prev);
  };
  const handleCloseMenu = () => setMenuOpen(false);

  const videoLoopEnabled = getVideoLoopSetting(activeNode);
  const videoAudioSetting = getVideoAudioSetting(activeNode);
  const videoAudioMuted =
    videoAudioSetting === "off" ||
    (videoAudioSetting === "off_mobile" && isTouchDevice);

  const syncMediaSound = useCallback(
    (shouldTryPlay: boolean) => {
      const targets = [backgroundVideoRef.current].filter(Boolean) as HTMLVideoElement[];
      const allowAudio =
        effectiveSoundEnabled && hasInteracted && documentVisible && !videoAudioMuted;
      targets.forEach((video) => {
        video.muted = !allowAudio;
        if (!documentVisible) {
          video.pause();
          return;
        }
        if (allowAudio && shouldTryPlay) {
          const playPromise = video.play?.();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch((err) => {
              console.debug("[player] video play blocked", err);
            });
          }
        }
      });
    },
    [documentVisible, effectiveSoundEnabled, hasInteracted, videoAudioMuted]
  );

  useEffect(() => {
    syncMediaSound(true);
  }, [documentVisible, effectiveSoundEnabled, hasInteracted, syncMediaSound]);

  useLoadAdventureFonts(adventure?.props?.fontList);

  const subtitleCandidates = useMemo(
    () =>
      resolveSubtitleCandidates(
        adventure?.slug,
        adventure?.viewSlug,
        getRawSubtitlesValue(activeNode)
      ),
    [activeNode, adventure?.slug, adventure?.viewSlug]
  );

  useEffect(() => {
    let cancelled = false;
    if (!subtitleCandidates.length) {
      setSubtitleUrl(null);
      setSubtitleStatus({ state: "idle", attempted: [] });
      return;
    }

    setSubtitleStatus({ state: "loading", attempted: [] });

    const probe = async () => {
      const attempted: string[] = [];
      for (const url of subtitleCandidates) {
        attempted.push(url);
        try {
          const res = await fetch(url, { method: "HEAD" });
          if (cancelled) return;
          if (res.ok) {
            setSubtitleUrl(url);
            setSubtitleStatus({ state: "ok", attempted: [...attempted] });
            return;
          }
          console.warn("[player] subtitles probe returned non-OK", res.status, url);
        } catch (err) {
          if (!cancelled) {
            console.warn("[player] subtitles HEAD failed", url, err);
          }
        }
      }

      if (cancelled) return;
      setSubtitleUrl(subtitleCandidates[0]);
      setSubtitleStatus({ state: "error", attempted: [...attempted] });
    };

    void probe();

    return () => {
      cancelled = true;
    };
  }, [subtitleCandidates]);

  const handleSubtitleError = useCallback(() => {
    setSubtitleStatus((prev) => {
      const attempted = prev.attempted.includes(subtitleUrl ?? "")
        ? prev.attempted
        : subtitleUrl
          ? [...prev.attempted, subtitleUrl]
          : prev.attempted;
      const currentIndex = subtitleUrl
        ? subtitleCandidates.findIndex((url) => url === subtitleUrl)
        : -1;
      const next = subtitleCandidates[currentIndex + 1];
      if (next) {
        setSubtitleUrl(next);
        console.warn("[player] subtitles fallback to next candidate", next, {
          attempted: [...attempted, next],
        });
        return { state: "loading", attempted: [...attempted, next] };
      }
      console.warn("[player] subtitles failed for all candidates", attempted);
      return { state: "error", attempted };
    });
  }, [subtitleCandidates, subtitleUrl]);

  const handleSubtitleLoad = useCallback(() => {
    setSubtitleStatus((prev) => {
      const attempted = prev.attempted.includes(subtitleUrl ?? "")
        ? prev.attempted
        : subtitleUrl
          ? [...prev.attempted, subtitleUrl]
          : prev.attempted;
      return { state: "ok", attempted };
    });
  }, [subtitleUrl]);

  const referenceUrl =
    currentNodeKind === "reference" || currentNodeKind === "reference-tab"
      ? resolveReferenceUrl(currentNode)
      : null;

  const videoSource = resolveVideoSource(activeNode);
  const isVideoNode = activeNodeKind === "video";
  const backgroundImage = isVideoNode
    ? activeNode?.image?.url ?? null
    : videoSource
      ? null
      : activeNode?.image?.url ?? null;
  const backgroundVideo = useMemo(
    () =>
      videoSource
        ? {
            src: videoSource,
            subtitlesUrl: subtitleUrl,
            onSubtitlesError: handleSubtitleError,
            onSubtitlesLoad: handleSubtitleLoad,
            muted:
              videoAudioMuted || !(effectiveSoundEnabled && hasInteracted && documentVisible),
            controls: isVideoNode,
            loop: videoLoopEnabled,
            videoRef: (node: HTMLVideoElement | null) => {
              backgroundVideoRef.current = node;
            },
          }
        : undefined,
    [
      handleSubtitleError,
      handleSubtitleLoad,
      hasInteracted,
      isVideoNode,
      documentVisible,
      effectiveSoundEnabled,
      subtitleUrl,
      videoAudioMuted,
      videoLoopEnabled,
      videoSource,
    ]
  );

  useEffect(() => {
    syncMediaSound(true);
  }, [syncMediaSound, backgroundVideo?.src]);

  useEffect(() => {
    if (!backgroundVideo) {
      backgroundVideoRef.current = null;
    }
  }, [backgroundVideo]);

  const backgroundIdentity = backgroundVideo?.src ?? backgroundImage ?? "";
  const shouldAnimateLegacy =
    !flags.highContrast && !prefersReducedMotion && !isScrollytell && !isSwipeNav;
  const cancelLegacyAnimations = useCallback(() => {
    runningAnimationsRef.current.forEach((animation) => {
      try {
        animation.cancel();
      } catch (err) {
        console.warn("[player] animation cancel failed", err);
      }
    });
    runningAnimationsRef.current = [];
  }, []);

  useLayoutEffect(() => {
    cancelLegacyAnimations();
    animationRetryRef.current = 0;

    const root = playerRootRef.current;
    const currentBackground = backgroundIdentity;
    if (!root) {
      previousBackgroundIdentityRef.current = currentBackground;
      return;
    }

    const reduceMotionQuery =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (!shouldAnimateLegacy || reduceMotionQuery) {
      const prose =
        root.querySelector<HTMLElement>(".ps-player__text .ps-player__prose") ??
        root.querySelector<HTMLElement>(".ps-player__prose");
      const nav = root.querySelector<HTMLElement>(".ps-nav");
      const media = root.querySelector<HTMLElement>(".ps-player__media");
      nav?.style.removeProperty("opacity");
      media?.style.removeProperty("opacity");
      if (prose) {
        prose
          .querySelectorAll<HTMLElement>("p, h1, h2, ul, ol, blockquote, pre")
          .forEach((element) => {
          element.style.removeProperty("opacity");
        });
        prose.style.removeProperty("opacity");
      }
      previousBackgroundIdentityRef.current = currentBackground;
      return;
    }

    const fadeKeyframes = [{ opacity: 0 }, { opacity: 1 }];
    const baseOptions = { fill: "both", duration: 1000 };
    const { animationDelay, paragraphDelay, navigationDelay, backgroundFadeSeconds } =
      animationSettings;

    const animateElement = (
      element: HTMLElement,
      delaySeconds: number,
      durationMs = baseOptions.duration,
      clearOpacityOnFinish = false
    ) => {
      if (typeof element.animate !== "function") {
        if (clearOpacityOnFinish) {
          element.style.removeProperty("opacity");
        }
        return;
      }
      const animation = element.animate(fadeKeyframes, {
        ...baseOptions,
        duration: durationMs,
        delay: Math.max(0, delaySeconds) * 1000,
      });
      if (clearOpacityOnFinish) {
        const clearOpacity = () => {
          element.style.removeProperty("opacity");
        };
        animation.onfinish = clearOpacity;
        animation.oncancel = clearOpacity;
      }
      runningAnimationsRef.current.push(animation);
    };

    const runAnimations = (mode: "initial" | "retry") => {
      const prose =
        root.querySelector<HTMLElement>(".ps-player__text .ps-player__prose") ??
        root.querySelector<HTMLElement>(".ps-player__prose");
      const nav = root.querySelector<HTMLElement>(".ps-nav");
      const media = root.querySelector<HTMLElement>(".ps-player__media");
      const proseChildren = prose ? Array.from(prose.children) : [];
      const headings = proseChildren.filter((child): child is HTMLElement =>
        child instanceof HTMLElement && child.matches("h1, h2")
      );
      const paragraphs = proseChildren.filter((child): child is HTMLElement =>
        child instanceof HTMLElement &&
        child.matches("p, ul, ol, blockquote, pre")
      );

      headings.forEach((heading) => {
        heading.style.opacity = "0";
        animateElement(heading, animationDelay, baseOptions.duration, true);
      });

      paragraphs.forEach((paragraph, index) => {
        paragraph.style.opacity = "0";
        animateElement(
          paragraph,
          animationDelay + index * paragraphDelay,
          baseOptions.duration,
          true
        );
      });

      if (prose && headings.length === 0 && paragraphs.length === 0) {
        prose.style.opacity = "0";
        animateElement(prose, animationDelay, baseOptions.duration, true);
      }

      if (mode === "initial" && nav) {
        const navigationDelaySeconds =
          animationDelay + paragraphs.length * paragraphDelay + navigationDelay;
        animateElement(nav, navigationDelaySeconds);
      }

      if (mode === "initial") {
        const previousBackground = previousBackgroundIdentityRef.current;
        const hasBackgroundChange =
          Boolean(currentBackground) && currentBackground !== previousBackground;
        if (hasBackgroundChange && media && !flags.hideBackground) {
          animateElement(
            media,
            0,
            Math.max(0, backgroundFadeSeconds) * 1000
          );
        }
      }

      return {
        prose,
        textElement: headings[0] ?? paragraphs[0] ?? null,
      };
    };

    const { textElement: debugTextElement } = runAnimations("initial");
    let stabilityTimer: ReturnType<typeof setTimeout> | null = null;
    if (debugTextElement) {
      stabilityTimer = setTimeout(() => {
        const connected = debugTextElement.isConnected;
        if (!connected && animationRetryRef.current === 0) {
          animationRetryRef.current = 1;
          runAnimations("retry");
        }
      }, 50);
    }

    previousBackgroundIdentityRef.current = currentBackground;
    return () => {
      if (stabilityTimer) clearTimeout(stabilityTimer);
      cancelLegacyAnimations();
    };
  }, [
    animationSettings,
    backgroundIdentity,
    cancelLegacyAnimations,
    currentNodeId,
    flags.hideBackground,
    shouldAnimateLegacy,
  ]);

  const resolvedMargins = layout.containerMarginsVw;

  const contentDataProps = [
    dataProps.player_container,
    dataProps.inner_container,
    dataProps.text_block,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const navigationModel = useMemo<NavigationModel>(() => {
    // Preserve API ordering for deterministic fallback when no custom order is defined.
    const baseItems: NavItem[] = outgoingLinks.map((link) => ({ kind: "link", link }));
    if (navigationConfig.showCurrent && currentNode) {
      baseItems.push({ kind: "current" });
    }

    const orderedItems = applyOrder(
      baseItems,
      navigationConfig.orderedIds,
      (item) => (item.kind === "current" ? -1 : item.link.linkId)
    );

    const shouldHideLink = (link: LinkModel) => {
      const targetNode = getNodeById(link.toNodeId);
      if (!targetNode) return false;
      const visited = visitedNodes.has(targetNode.nodeId);
      if (!visited) return false;
      const nodeWantsHide = hasHideVisitedCondition(targetNode);
      return nodeWantsHide || navigationConfig.hideVisited;
    };

    const firstUsableLink = orderedItems.find((item) => {
      if (item.kind !== "link") return false;
      if (shouldHideLink(item.link)) return false;
      const targetNode = getNodeById(item.link.toNodeId);
      return Boolean(item.link.toNodeId && targetNode);
    });

    if (navigationConfig.style === "noButtons") {
      return {
        buttons: [],
        primaryLinkId: firstUsableLink && firstUsableLink.kind === "link"
          ? firstUsableLink.link.linkId
          : undefined,
      };
    }

    const buildButton = (link: LinkModel, fallbackIndex: number): NavigationButton => {
      const targetNode = getNodeById(link.toNodeId);
      const isBroken = !link.toNodeId || !targetNode;
      const label =
        link.label && link.label.trim().length > 0
          ? link.label.trim()
          : targetNode?.title || `Continue ${fallbackIndex}`;

      return {
        key: String(link.linkId),
        label,
        linkId: link.linkId,
        targetNodeId: link.toNodeId,
        disabled: isBroken,
        isBroken,
      };
    };

    let skip = navigationConfig.skipCount;
    const buttons: NavigationButton[] = [];

    orderedItems.forEach((item) => {
      if (skip > 0) {
        skip -= 1;
        return;
      }

      if (item.kind === "current") {
        buttons.push({
          key: "current",
          label: currentNode?.title || "Current node",
          isCurrent: true,
        });
        return;
      }

      const link = item.link;
      if (shouldHideLink(link)) return;
      buttons.push(buildButton(link, buttons.length + 1));
    });

    return {
      buttons,
      primaryLinkId:
        firstUsableLink && firstUsableLink.kind === "link"
          ? firstUsableLink.link.linkId
          : undefined,
    };
  }, [
    outgoingLinks,
    navigationConfig.showCurrent,
    navigationConfig.orderedIds,
    navigationConfig.style,
    navigationConfig.hideVisited,
    navigationConfig.skipCount,
    currentNode,
    getNodeById,
    visitedNodes,
  ]);

  const playerClassName = cn(
    embedded ? "ps-player--embedded" : "",
    "ps-player--legacy-skin",
    `ps-player--nav-${navigationConfig.style}`,
    navigationConfig.placement === "bottom" ? "ps-player--nav-bottom" : "",
    navigationConfig.swipeMode ? "ps-player--swipe" : "",
    isScrollytell ? "ps-player--scrollytell" : "",
    isVideoNode ? "ps-player--videoplayer" : ""
  );
  const canGoBack = historyLength > 1;
  const canGoHome = homeTargetId != null && currentNodeId !== homeTargetId;
  const handleMenuBack = () => {
    if (!canGoBack) return;
    goBack();
    if (menuSoundOverride) {
      setMenuNavigationMutePending(true);
    }
    setMenuOpen(false);
  };
  const handleMenuHome = () => {
    if (!canGoHome || homeTargetId == null) return;
    const didNavigate = goToNode(homeTargetId);
    if (!didNavigate) {
      toastInfo("Shortcut target not found", `Shortcut target not found: ${homeTargetId}`);
      return;
    }
    if (menuSoundOverride) {
      setMenuNavigationMutePending(true);
    }
    setMenuOpen(false);
  };
  const handleMenuShortcut = (nodeId: number) => {
    if (!Number.isFinite(nodeId)) return;
    const didNavigate = goToNode(nodeId);
    if (!didNavigate) {
      toastInfo("Shortcut target not found", `Shortcut target not found: ${nodeId}`);
      return;
    }
    if (menuSoundOverride) {
      setMenuNavigationMutePending(true);
    }
    setMenuOpen(false);
  };

  const showReturnToCurrent =
    isScrollytell &&
    currentNodeId != null &&
    viewportActiveNodeId != null &&
    viewportActiveNodeId !== currentNodeId;

  const overlayContent = (
    <div className="ps-overlay-shell space-y-2">
      <PlayerOverlay
        canGoBack={canGoBack}
        canGoHome={canGoHome}
        showBackButton={menuButtons.back && mode === "preview" && embedded}
        showHomeButton={menuButtons.home}
        showMenuButton={menuButtons.menu}
        showSoundButton={menuButtons.sound}
        homeLabel={homeLabel}
        menuShortcuts={menuShortcutItems}
        menuOpen={menuOpen}
        highContrast={flags.highContrast}
        hideBackground={flags.hideBackground}
        soundEnabled={soundEnabled}
        statisticsEnabled={statisticsEnabled}
        statisticsDisabled={!statisticsAllowed}
        statisticsDisabledReason={statisticsDisabledReason}
        navigationStyle={navigationConfig.style}
        navPlacement={navigationConfig.placement}
        gameNodeId={currentNodeId ?? null}
        viewportActiveNodeId={viewportActiveNodeId}
        scrollytellActive={isScrollytell}
        onBack={handleMenuBack}
        onHome={handleMenuHome}
        onToggleMenu={handleToggleMenu}
        onCloseMenu={handleCloseMenu}
        onToggleHighContrast={handleToggleHighContrast}
        onToggleHideBackground={handleToggleHideBackground}
        onToggleSound={handleToggleSound}
        onToggleStatistics={handleToggleStatistics}
        onShortcut={handleMenuShortcut}
        menuRef={menuRef}
        showDebug={debugUi}
      />
      {showReturnToCurrent ? (
        <div className="ps-scrolly-return">
          <button
            type="button"
            className="ps-overlay__btn ps-scrolly-return__btn"
            onClick={handleReturnToCurrent}
            aria-label="Return to current node"
          >
            <span className="ps-overlay__btn-icon" aria-hidden>
              <ChevronDown />
            </span>
            <span className="ps-overlay__btn-text">
              <span className="ps-overlay__btn-label">Return to current</span>
              <span className="ps-overlay__btn-meta">Scroll to active node</span>
            </span>
          </button>
        </div>
      ) : null}
      {debugUi ? (
        <DevToggles
          highContrast={flags.highContrast}
          hideBackground={flags.hideBackground}
          subtitleStatus={subtitleStatus}
          audioDebug={audioDebug}
          statsDebug={statsDebug}
          mode={mode}
          statisticsEnabled={statisticsEnabled}
          nodeStatisticsEnabled={nodeStatisticsEnabled}
          statisticsDisabledReason={statisticsDisabledReason}
          showDebug={debugMedia}
          onToggleHighContrast={handleToggleHighContrast}
          onToggleHideBackground={handleToggleHideBackground}
        />
      ) : null}
    </div>
  );

  const openReference = () => {
    if (!referenceUrl) {
      toastError("Missing link", "No URL found for this reference node.");
      return;
    }
    try {
      if (currentNodeKind === "reference-tab") {
        window.open(referenceUrl, "_blank", "noopener,noreferrer");
      } else {
        window.location.assign(referenceUrl);
      }
    } catch (err) {
      toastError("Could not open link", referenceUrl);
      console.error(err);
    }
  };

  if (!adventure) return null;

  const renderNodeCard = (
    node: NodeModel | null | undefined,
    nodeKind: NodeKind,
    isActive: boolean
  ) => {
    if (!node) return null;
    const nodeProps = {
      ...parsePropsInput(node.rawProps),
      ...parsePropsInput(node.props),
    };
    const legacyContent = buildLegacyContent(node, nodeProps);
    return (
      <>
        <div className="ps-player__text">
          <div className="ps-player__card">
            <NodeContent
              nodeText={legacyContent.value}
              allowMarkdown={legacyContent.allowMarkdown}
            />

            {isActive && (nodeKind === "reference" || nodeKind === "reference-tab") ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/15 bg-black/20 p-3">
                <Button onClick={openReference} disabled={!referenceUrl} size="sm">
                  {nodeKind === "reference-tab" ? "Open in new tab" : "Open link"}
                </Button>
                <div className="min-w-0 flex-1 text-xs opacity-80">
                  {referenceUrl ? (
                    <span className="break-words">{referenceUrl}</span>
                  ) : (
                    <span className="text-red-300">No URL found in this node.</span>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {isActive ? (
          <div className="ps-player__nav">
            <NavigationArea
              navStyle={navigationConfig.style}
              navPlacement={navigationConfig.placement}
              swipeMode={navigationConfig.swipeMode}
              buttons={navigationModel.buttons}
              primaryLinkId={navigationModel.primaryLinkId}
              showLeftArrow={navigationConfig.style === "leftright"}
              showRightArrow={
                navigationConfig.style === "leftright" || navigationConfig.style === "right"
              }
              showDownArrow={false}
              onChooseLink={(linkId) => chooseLink(linkId)}
              onBack={goBack}
              disableBack={historyLength <= 1}
            />
          </div>
        ) : null}
      </>
    );
  };

  const scrollyBlocks = isScrollytell
    ? historyNodes.map((node, index) => {
        const isActive =
          node.nodeId === currentNodeId && index === historyNodes.length - 1;
        const nodeKind = isActive ? currentNodeKind : resolveNodeKind(node);
        return {
          key: `${node.nodeId}-${index}`,
          nodeId: node.nodeId,
          isActive,
          content: renderNodeCard(node, nodeKind, isActive),
        };
      })
    : [];

  const playerBody = isScrollytell ? (
    <ScrollyTracker
      blocks={scrollyBlocks}
      activeNodeId={currentNodeId ?? null}
      onViewportActiveChange={handleViewportActiveChange}
      scrollToNodeId={currentNodeId ?? null}
      scrollToNonce={scrollyReturnNonce}
    />
  ) : isSwipeNav ? (
    <SwipeNodeNavigator
      canGoBack={canGoBack}
      canGoForward={Boolean(navigationModel.primaryLinkId)}
      onBack={goBack}
      onForward={() => {
        if (navigationModel.primaryLinkId) {
          chooseLink(navigationModel.primaryLinkId);
        }
      }}
      currentNodeId={currentNodeId}
    >
      {renderNodeCard(currentNode, currentNodeKind, true)}
    </SwipeNodeNavigator>
  ) : (
    renderNodeCard(currentNode, currentNodeKind, true)
  );

  return (
    <PlayerLayout
      className={playerClassName}
      style={propsStyle}
      overlayColor={flags.hideBackground ? null : typography.overlayColor ?? undefined}
      backgroundImage={backgroundImage}
      backgroundVideo={backgroundVideo}
      hideBackground={flags.hideBackground}
      mediaFilter={media.filter}
      objectFit={media.objectFit}
      backgroundPosition={media.backgroundPosition}
      backgroundSize={media.backgroundSize}
      rootRef={playerRootRef}
      dataProps={{
        background: dataProps.background,
        backgroundImage: dataProps.background_image,
        player: dataProps.player,
        content: contentDataProps,
      }}
      layout={{
        verticalAlign: layout.verticalAlign,
        containerWidthVw: layout.containerWidthVw,
        containerMarginsVw: resolvedMargins,
        textAlign: layout.textAlign,
      }}
      overlay={overlayContent}
    >
      {playerBody}
    </PlayerLayout>
  );
}

export function StaticPlayerPreview({
  adventure,
  node,
  className,
}: {
  adventure: AdventureModel;
  node: NodeModel;
  className?: string;
}) {
  const adventureProps = adventure.props as Record<string, unknown> | null | undefined;
  const mergedNodeProps = useMemo(
    () => ({
      ...parsePropsInput(node.rawProps),
      ...parsePropsInput(node.props),
    }),
    [node.rawProps, node.props]
  );

  const propsResult = useMemo(
    () =>
      buildPropsStyle({
        adventureProps: adventure.props ?? undefined,
        nodeProps: mergedNodeProps,
      }),
    [adventure.props, mergedNodeProps]
  );

  const { style: propsStyle, flags, dataProps, layout, media, typography } = propsResult;
  const legacyContent = useMemo(
    () => buildLegacyContent(node, mergedNodeProps),
    [node, mergedNodeProps]
  );

  useLoadAdventureFonts(adventure.props?.fontList);

  const menuOptions = useMemo(() => readMenuOptions(adventureProps ?? null), [adventureProps]);
  const menuShortcuts = useMemo(() => readMenuShortcuts(adventureProps ?? null), [adventureProps]);
  const menuButtons = useMemo(
    () => ({
      back: menuOptions.includes("back"),
      home: menuOptions.includes("home"),
      menu: menuOptions.includes("menu"),
      sound: menuOptions.includes("sound"),
    }),
    [menuOptions]
  );
  const homeShortcut = menuShortcuts[0];
  const homeTargetId = homeShortcut?.nodeId ?? null;
  const homeLabel = homeShortcut?.text?.trim() ?? "";
  const menuShortcutItems = useMemo(() => {
    const items = menuShortcuts.slice(1).map((shortcut, index) => ({
      nodeId: shortcut.nodeId,
      label:
        shortcut.text?.trim() ||
        (shortcut.nodeId != null ? `Node #${shortcut.nodeId}` : `Shortcut ${index + 1}`),
    }));
    return items.filter(
      (shortcut): shortcut is MenuShortcutItem => shortcut.nodeId != null
    );
  }, [menuShortcuts]);

  const navigationConfig = useMemo(
    () => buildNavigationConfig(mergedNodeProps),
    [mergedNodeProps]
  );

  const linksBySource = useMemo(
    () => buildLinksBySource(adventure.links),
    [adventure.links]
  );

  const nodeById = useMemo(() => buildNodeById(adventure.nodes), [adventure.nodes]);

  const outgoingLinks = useMemo(
    () => getOutgoingLinksForNode(node.nodeId, linksBySource),
    [linksBySource, node.nodeId]
  );

  const visitedNodes = useMemo(() => new Set<number>(), []);

  const navigationModel = useMemo<NavigationModel>(() => {
    const baseItems: NavItem[] = outgoingLinks.map((link) => ({ kind: "link", link }));
    if (navigationConfig.showCurrent) {
      baseItems.push({ kind: "current" });
    }

    const orderedItems = applyOrder(
      baseItems,
      navigationConfig.orderedIds,
      (item) => (item.kind === "current" ? -1 : item.link.linkId)
    );

    const shouldHideLink = (link: LinkModel) => {
      const targetNode = nodeById.get(link.toNodeId);
      if (!targetNode) return false;
      const visited = visitedNodes.has(targetNode.nodeId);
      if (!visited) return false;
      const nodeWantsHide = hasHideVisitedCondition(targetNode);
      return nodeWantsHide || navigationConfig.hideVisited;
    };

    const firstUsableLink = orderedItems.find((item) => {
      if (item.kind !== "link") return false;
      if (shouldHideLink(item.link)) return false;
      const targetNode = nodeById.get(item.link.toNodeId);
      return Boolean(item.link.toNodeId && targetNode);
    });

    if (navigationConfig.style === "noButtons") {
      return {
        buttons: [],
        primaryLinkId:
          firstUsableLink && firstUsableLink.kind === "link"
            ? firstUsableLink.link.linkId
            : undefined,
      };
    }

    const buildButton = (link: LinkModel, fallbackIndex: number): NavigationButton => {
      const targetNode = nodeById.get(link.toNodeId);
      const isBroken = !link.toNodeId || !targetNode;
      const label =
        link.label && link.label.trim().length > 0
          ? link.label.trim()
          : targetNode?.title || `Continue ${fallbackIndex}`;

      return {
        key: String(link.linkId),
        label,
        linkId: link.linkId,
        targetNodeId: link.toNodeId,
        disabled: isBroken,
        isBroken,
      };
    };

    let skip = navigationConfig.skipCount;
    const buttons: NavigationButton[] = [];

    orderedItems.forEach((item) => {
      if (skip > 0) {
        skip -= 1;
        return;
      }

      if (item.kind === "current") {
        buttons.push({
          key: "current",
          label: node.title || "Current node",
          isCurrent: true,
        });
        return;
      }

      const link = item.link;
      if (shouldHideLink(link)) return;
      buttons.push(buildButton(link, buttons.length + 1));
    });

    return {
      buttons,
      primaryLinkId:
        firstUsableLink && firstUsableLink.kind === "link"
          ? firstUsableLink.link.linkId
          : undefined,
    };
  }, [
    navigationConfig.hideVisited,
    navigationConfig.orderedIds,
    navigationConfig.showCurrent,
    navigationConfig.skipCount,
    navigationConfig.style,
    node.title,
    nodeById,
    outgoingLinks,
    visitedNodes,
  ]);

  const nodeKind = useMemo(() => resolveNodeKind(node), [node]);
  const isVideoNode = nodeKind === "video";

  const playerClassName = cn(
    "ps-player--embedded",
    "ps-player--legacy-skin",
    "ps-player--static",
    `ps-player--nav-${navigationConfig.style}`,
    navigationConfig.placement === "bottom" ? "ps-player--nav-bottom" : "",
    className
  );

  const videoSource = resolveVideoSource(node);
  const backgroundImage = isVideoNode
    ? node.image?.url ?? null
    : videoSource
      ? null
      : node.image?.url ?? null;

  const contentDataProps = [
    dataProps.player_container,
    dataProps.inner_container,
    dataProps.text_block,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const canGoHome = homeTargetId != null && homeTargetId !== node.nodeId;
  const menuRef = useRef<HTMLDivElement | null>(null);

  const overlayContent = (
    <div className="ps-overlay-shell space-y-2">
      <PlayerOverlay
        canGoBack={false}
        canGoHome={canGoHome}
        showBackButton={false}
        showHomeButton={menuButtons.home}
        showMenuButton={menuButtons.menu}
        showSoundButton={menuButtons.sound}
        homeLabel={homeLabel}
        menuShortcuts={menuShortcutItems}
        menuOpen={false}
        highContrast={flags.highContrast}
        hideBackground={flags.hideBackground}
        soundEnabled
        statisticsEnabled={false}
        statisticsDisabled
        statisticsDisabledReason={null}
        navigationStyle={navigationConfig.style}
        navPlacement={navigationConfig.placement}
        gameNodeId={node.nodeId ?? null}
        viewportActiveNodeId={node.nodeId ?? null}
        scrollytellActive={false}
        onBack={() => undefined}
        onHome={() => undefined}
        onToggleMenu={() => undefined}
        onCloseMenu={() => undefined}
        onToggleHighContrast={() => undefined}
        onToggleHideBackground={() => undefined}
        onToggleSound={() => undefined}
        onToggleStatistics={() => undefined}
        onShortcut={() => undefined}
        menuRef={menuRef}
        showDebug={false}
      />
    </div>
  );

  return (
    <PlayerLayout
      className={playerClassName}
      style={propsStyle}
      overlayColor={flags.hideBackground ? null : typography.overlayColor ?? undefined}
      backgroundImage={backgroundImage}
      hideBackground={flags.hideBackground}
      mediaFilter={media.filter}
      objectFit={media.objectFit}
      backgroundPosition={media.backgroundPosition}
      backgroundSize={media.backgroundSize}
      dataProps={{
        background: dataProps.background,
        backgroundImage: dataProps.background_image,
        player: dataProps.player,
        content: contentDataProps,
      }}
      layout={{
        verticalAlign: layout.verticalAlign,
        containerWidthVw: layout.containerWidthVw,
        containerMarginsVw: layout.containerMarginsVw,
        textAlign: layout.textAlign,
      }}
      overlay={overlayContent}
    >
      <>
        <div className="ps-player__text">
          <div className="ps-player__card">
            <NodeContent
              nodeText={legacyContent.value}
              allowMarkdown={legacyContent.allowMarkdown}
            />
          </div>
        </div>
        <div className="ps-player__nav">
          <NavigationArea
            navStyle={navigationConfig.style}
            navPlacement={navigationConfig.placement}
            swipeMode={navigationConfig.swipeMode}
            buttons={navigationModel.buttons}
            primaryLinkId={navigationModel.primaryLinkId}
            showLeftArrow={navigationConfig.style === "leftright"}
            showRightArrow={
              navigationConfig.style === "leftright" || navigationConfig.style === "right"
            }
            showDownArrow={false}
            interactionDisabled
            onChooseLink={() => undefined}
            onBack={() => undefined}
            disableBack
          />
        </div>
      </>
    </PlayerLayout>
  );
}

function PlayerOverlay({
  canGoBack,
  canGoHome,
  showBackButton,
  showHomeButton,
  showMenuButton,
  showSoundButton,
  homeLabel,
  menuShortcuts,
  menuOpen,
  highContrast,
  hideBackground,
  soundEnabled,
  statisticsEnabled,
  statisticsDisabled,
  statisticsDisabledReason,
  navigationStyle,
  navPlacement,
  gameNodeId,
  viewportActiveNodeId,
  scrollytellActive,
  onBack,
  onHome,
  onToggleMenu,
  onCloseMenu,
  onToggleHighContrast,
  onToggleHideBackground,
  onToggleSound,
  onToggleStatistics,
  onShortcut,
  menuRef,
  showDebug,
}: {
  canGoBack: boolean;
  canGoHome: boolean;
  showBackButton: boolean;
  showHomeButton: boolean;
  showMenuButton: boolean;
  showSoundButton: boolean;
  homeLabel?: string;
  menuShortcuts: MenuShortcutItem[];
  menuOpen: boolean;
  highContrast: boolean;
  hideBackground: boolean;
  soundEnabled: boolean;
  statisticsEnabled: boolean;
  statisticsDisabled: boolean;
  statisticsDisabledReason?: string | null;
  navigationStyle: NavStyle;
  navPlacement: NavPlacement;
  gameNodeId: number | null;
  viewportActiveNodeId: number | null;
  scrollytellActive: boolean;
  onBack: () => void;
  onHome: () => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onToggleHighContrast: () => void;
  onToggleHideBackground: () => void;
  onToggleSound: () => void;
  onToggleStatistics: () => void;
  onShortcut: (nodeId: number) => void;
  menuRef: MutableRefObject<HTMLDivElement | null>;
  showDebug: boolean;
}) {
  const showLeftGroup = showBackButton || showHomeButton;
  const showRightGroup = showSoundButton || showMenuButton;

  return (
    <div className="ps-overlay" data-menu-open={menuOpen ? "true" : undefined}>
      {showLeftGroup || showRightGroup ? (
        <div className="ps-overlay__bar">
          {showLeftGroup ? (
            <div className="ps-overlay__group">
              {showBackButton ? (
                <OverlayButton
                  label="Back"
                  icon={<ArrowLeft aria-hidden />}
                  disabled={!canGoBack}
                  onClick={onBack}
                />
              ) : null}
              {showHomeButton ? (
                <OverlayButton
                  label="Home"
                  subtleLabel={homeLabel || undefined}
                  icon={<Home aria-hidden />}
                  disabled={!canGoHome}
                  onClick={onHome}
                />
              ) : null}
            </div>
          ) : null}
          {showRightGroup ? (
            <div className="ps-overlay__group">
              {showSoundButton ? (
                <OverlayButton
                  label="Sound"
                  subtleLabel={soundEnabled ? "On" : "Muted"}
                  icon={soundEnabled ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
                  onClick={onToggleSound}
                  active={soundEnabled}
                  ariaPressed={soundEnabled}
                />
              ) : null}
              {showMenuButton ? (
                <OverlayButton
                  label="Menu"
                  subtleLabel={menuOpen ? "Close" : "Open"}
                  icon={menuOpen ? <X aria-hidden /> : <MenuIcon aria-hidden />}
                  onClick={menuOpen ? onCloseMenu : onToggleMenu}
                  active={menuOpen}
                  ariaExpanded={menuOpen}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {menuOpen && showMenuButton ? (
        <>
          <div className="ps-overlay__backdrop" onClick={onCloseMenu} />
          <div
            className="ps-overlay__panel"
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Player menu"
          >
            <div className="ps-overlay__panel-header">
              <span className="ps-overlay__panel-title">Settings</span>
              <button
                type="button"
                className="ps-overlay__panel-close"
                onClick={onCloseMenu}
                aria-label="Close menu"
              >
                <X aria-hidden />
              </button>
            </div>

            <div className="ps-overlay__panel-body">
              {menuShortcuts.length ? (
                <>
                  <span className="ps-overlay__panel-title">Shortcuts</span>
                  {menuShortcuts.map((shortcut, index) => (
                    <OverlayShortcutRow
                      key={`${shortcut.nodeId}-${index}`}
                      label={shortcut.label}
                      nodeId={shortcut.nodeId}
                      onClick={() => onShortcut(shortcut.nodeId)}
                    />
                  ))}
                </>
              ) : null}
              <OverlayToggleRow
                label="High contrast"
                description="Stronger contrast for text and UI"
                value={highContrast}
                onToggle={onToggleHighContrast}
              />
              <OverlayToggleRow
                label="Hide background"
                description="Disable background images or videos"
                value={hideBackground}
                onToggle={onToggleHideBackground}
              />
              <OverlayToggleRow
                label="Sound"
                description="Mute or enable music and effects"
                value={soundEnabled}
                onToggle={onToggleSound}
              />
              <OverlayToggleRow
                label="Statistics tracking"
                description={statisticsDisabledReason ?? "Send node visit data"}
                value={statisticsEnabled}
                onToggle={onToggleStatistics}
                disabled={statisticsDisabled}
              />
            </div>

            {showDebug ? (
              <div className="ps-overlay__debug">
                <p className="ps-overlay__debug-title">Debug</p>
                <p className="ps-overlay__debug-row">
                  HC {highContrast ? "on" : "off"} В· BG {hideBackground ? "hidden" : "visible"} В·
                  Sound {soundEnabled ? "on" : "muted"}
                </p>
                <p className="ps-overlay__debug-row">
                  Nav {navigationStyle}
                  {navPlacement === "bottom" ? " В· bottom" : ""}
                </p>
                <p className="ps-overlay__debug-row">
                  Game {gameNodeId ?? "?"} - Viewport {viewportActiveNodeId ?? "?"}
                </p>
                <p className="ps-overlay__debug-row">
                  Scrollytell{" "}
                  {scrollytellActive
                    ? "tracking on"
                    : "tracking off (nav style not scrollytell)"}
                </p>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function OverlayButton({
  icon,
  label,
  subtleLabel,
  onClick,
  disabled,
  active,
  ariaExpanded,
  ariaPressed,
}: {
  icon: ReactNode;
  label: string;
  subtleLabel?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  ariaExpanded?: boolean;
  ariaPressed?: boolean;
}) {
  return (
    <button
      type="button"
      className="ps-overlay__btn"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      data-active={active ? "true" : undefined}
      aria-expanded={ariaExpanded}
      aria-pressed={ariaPressed}
    >
      <span className="ps-overlay__btn-icon" aria-hidden>
        {icon}
      </span>
      <span className="ps-overlay__btn-text">
        <span className="ps-overlay__btn-label">{label}</span>
        {subtleLabel ? <span className="ps-overlay__btn-meta">{subtleLabel}</span> : null}
      </span>
    </button>
  );
}

function OverlayToggleRow({
  label,
  description,
  value,
  onToggle,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "ps-overlay__toggle",
        disabled ? "cursor-not-allowed opacity-60" : ""
      )}
      role="switch"
      aria-checked={value}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={disabled ? undefined : onToggle}
    >
      <div className="ps-overlay__toggle-text">
        <span className="ps-overlay__toggle-label">{label}</span>
        {description ? <span className="ps-overlay__toggle-desc">{description}</span> : null}
      </div>
      <span
        className={cn(
          "ps-overlay__pill",
          value ? "ps-overlay__pill--on" : "ps-overlay__pill--off"
        )}
      >
        {value ? "On" : "Off"}
      </span>
    </button>
  );
}

function OverlayShortcutRow({
  label,
  nodeId,
  onClick,
}: {
  label: string;
  nodeId: number;
  onClick: () => void;
}) {
  return (
    <button type="button" className="ps-overlay__toggle" onClick={onClick}>
      <span className="ps-overlay__toggle-text">
        <span className="ps-overlay__toggle-label">{label}</span>
        <span className="ps-overlay__toggle-desc">Node #{nodeId}</span>
      </span>
      <span className="ps-overlay__pill ps-overlay__pill--on">Go</span>
    </button>
  );
}

function SwipeNodeNavigator({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  currentNodeId,
  children,
}: {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  currentNodeId?: number | null;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lockRef = useRef(false);
  const lastTriggerRef = useRef(0);

  const scrollToCenter = useCallback((behavior: ScrollBehavior = "auto") => {
    const container = containerRef.current;
    if (!container) return;
    const top = container.clientHeight;
    container.scrollTo({ top, behavior });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    lockRef.current = true;
    requestAnimationFrame(() => {
      scrollToCenter("auto");
      window.setTimeout(() => {
        lockRef.current = false;
      }, 200);
    });
  }, [currentNodeId, scrollToCenter]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const sentinels = Array.from(
      container.querySelectorAll<HTMLElement>("[data-swipe-sentinel]")
    );
    if (!sentinels.length) return;

    const triggerSwipe = (direction: "prev" | "next") => {
      if (lockRef.current) return;
      const now = Date.now();
      if (now - lastTriggerRef.current < 400) return;
      lastTriggerRef.current = now;
      lockRef.current = true;

      if (direction === "prev") {
        if (canGoBack) {
          onBack();
        }
      } else if (canGoForward) {
        onForward();
      }

      window.setTimeout(() => {
        scrollToCenter("smooth");
        lockRef.current = false;
      }, 240);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (lockRef.current) return;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          const direction = target.getAttribute("data-swipe-target");
          if (direction === "prev") {
            triggerSwipe("prev");
          } else if (direction === "next") {
            triggerSwipe("next");
          }
        });
      },
      {
        root: container,
        rootMargin: "-35% 0px -35% 0px",
        threshold: 0,
      }
    );

    sentinels.forEach((sentinel) => observer.observe(sentinel));

    return () => {
      observer.disconnect();
    };
  }, [canGoBack, canGoForward, onBack, onForward, scrollToCenter]);

  return (
    <div className="ps-swipe-node" ref={containerRef}>
      <div className="ps-swipe-node__block ps-swipe-node__block--prev">
        <span
          className="ps-swipe-node__sentinel"
          data-swipe-sentinel
          data-swipe-target="prev"
          aria-hidden
        />
      </div>
      <div className="ps-swipe-node__block ps-swipe-node__block--current">
        <div className="ps-swipe-node__block-inner">{children}</div>
      </div>
      <div className="ps-swipe-node__block ps-swipe-node__block--next">
        <span
          className="ps-swipe-node__sentinel"
          data-swipe-sentinel
          data-swipe-target="next"
          aria-hidden
        />
      </div>
    </div>
  );
}

function NavigationArea({
  navStyle,
  navPlacement,
  swipeMode,
  buttons,
  primaryLinkId,
  showLeftArrow,
  showRightArrow,
  showDownArrow,
  interactionDisabled,
  onChooseLink,
  onBack,
  disableBack,
}: {
  navStyle: NavStyle;
  navPlacement: NavPlacement;
  swipeMode: boolean;
  buttons: NavigationButton[];
  primaryLinkId?: number;
  showLeftArrow: boolean;
  showRightArrow: boolean;
  showDownArrow: boolean;
  interactionDisabled?: boolean;
  onChooseLink: (linkId: number) => void;
  onBack: () => void;
  disableBack: boolean;
}) {
  const hasButtons = buttons.length > 0;
  const hasArrows = showLeftArrow || showRightArrow || showDownArrow;
  const shouldShowEmptyState = !hasButtons && navStyle !== "noButtons";
  const interactionsOff = Boolean(interactionDisabled);

  if (navStyle === "swipe") {
    return null;
  }

  if (navStyle === "swipeWithButton") {
    const primaryButton =
      buttons.find((button) => button.linkId === primaryLinkId) ??
      buttons.find((button) => Boolean(button.linkId)) ??
      null;

    if (!primaryButton) {
      return null;
    }

    const isDisabled = interactionsOff || Boolean(primaryButton.disabled);

    return (
      <div
        className="ps-nav"
        data-nav-style={navStyle}
        data-nav-placement={navPlacement}
        data-swipe-mode={swipeMode ? navStyle : undefined}
      >
        <div className="ps-nav__bar ps-nav__bar--center">
          <button
            type="button"
            className={cn(
              "ps-player__choice ps-nav__choice",
              isDisabled ? "cursor-not-allowed opacity-60" : ""
            )}
            onClick={
              isDisabled || !primaryButton.linkId
                ? undefined
                : () => {
                    if (primaryButton.linkId) onChooseLink(primaryButton.linkId);
                  }
            }
            onPointerDown={
              isDisabled ? undefined : addPressedClass
            }
            onPointerUp={removePressedClass}
            onPointerLeave={removePressedClass}
            onPointerCancel={removePressedClass}
            disabled={isDisabled}
            aria-disabled={isDisabled}
          >
            <span className="font-semibold">{primaryButton.label}</span>
          </button>
        </div>
      </div>
    );
  }

  if (!hasButtons && !hasArrows && !shouldShowEmptyState) {
    return null;
  }

  return (
    <div
      className="ps-nav"
      data-nav-style={navStyle}
      data-nav-placement={navPlacement}
      data-swipe-mode={swipeMode ? navStyle : undefined}
      data-nav-empty={!hasButtons ? "true" : undefined}
    >
      <div className="ps-nav__bar" data-has-arrows={hasArrows ? "true" : undefined}>
        {showLeftArrow ? (
          <NavArrowButton
            label="Previous"
            icon={<ChevronLeft aria-hidden />}
            onClick={onBack}
            disabled={interactionsOff || disableBack}
          />
        ) : null}

        <div
          className={cn(
            "ps-nav__choices ps-player__choices",
            navStyle === "right" ? "ps-nav__choices--right" : "",
            navStyle === "leftright" ? "ps-nav__choices--compact" : ""
          )}
        >
          {hasButtons ? (
            buttons.map((button) => {
              const isDisabled =
                interactionsOff || Boolean(button.disabled) || Boolean(button.isCurrent);
              return (
                <button
                  key={button.key}
                  type="button"
                  className={cn(
                    "ps-player__choice ps-nav__choice",
                    button.isCurrent ? "ps-nav__choice--current" : "",
                    isDisabled ? "cursor-not-allowed opacity-60" : ""
                  )}
                  onClick={
                    isDisabled || !button.linkId
                      ? undefined
                      : () => {
                          if (button.linkId) onChooseLink(button.linkId);
                        }
                  }
                  onPointerDown={isDisabled ? undefined : addPressedClass}
                  onPointerUp={removePressedClass}
                  onPointerLeave={removePressedClass}
                  onPointerCancel={removePressedClass}
                  disabled={isDisabled}
                  aria-disabled={isDisabled}
                >
                  <span className="font-semibold">{button.label}</span>
                </button>
              );
            })
          ) : (
            <p className="text-sm opacity-75">No outgoing links.</p>
          )}
        </div>

        {showRightArrow ? (
          <NavArrowButton
            label="Next"
            icon={<ChevronRight aria-hidden />}
            disabled={interactionsOff || !primaryLinkId}
            onClick={() => {
              if (primaryLinkId) onChooseLink(primaryLinkId);
            }}
          />
        ) : null}

        {showDownArrow ? (
          <NavArrowButton
            label="Continue"
            className="ps-nav__arrow--down"
            icon={<ChevronDown aria-hidden />}
            disabled={interactionsOff || !primaryLinkId}
            onClick={() => {
              if (primaryLinkId) onChooseLink(primaryLinkId);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function NavArrowButton({
  label,
  icon,
  className,
  onClick,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  className?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn("ps-nav__arrow", className)}
      onClick={disabled ? undefined : onClick}
      onPointerDown={disabled ? undefined : addPressedClass}
      onPointerUp={removePressedClass}
      onPointerLeave={removePressedClass}
      onPointerCancel={removePressedClass}
      disabled={disabled}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

function NodeContent({
  nodeText,
  allowMarkdown,
}: {
  nodeText: string;
  allowMarkdown: boolean;
}) {
  const prose = nodeText ? (
    <LegacyContent
      value={nodeText}
      allowMarkdown={allowMarkdown}
      className="ps-player__prose"
    />
  ) : (
    <p className="text-sm opacity-70">No content.</p>
  );

  return <div className="space-y-3">{prose}</div>;
}

function DevToggles({
  highContrast,
  hideBackground,
  subtitleStatus,
  audioDebug,
  statsDebug,
  mode,
  statisticsEnabled,
  nodeStatisticsEnabled,
  statisticsDisabledReason,
  showDebug,
  onToggleHighContrast,
  onToggleHideBackground,
}: {
  highContrast: boolean;
  hideBackground: boolean;
  subtitleStatus: SubtitleStatus;
  audioDebug: AudioDebugSnapshot | null;
  statsDebug: StatsDebugState;
  mode: "play" | "preview" | "standalone";
  statisticsEnabled: boolean;
  nodeStatisticsEnabled: boolean;
  statisticsDisabledReason?: string | null;
  showDebug: boolean;
  onToggleHighContrast: () => void;
  onToggleHideBackground: () => void;
}) {
  return (
    <div className="pointer-events-none flex w-full items-start justify-between gap-2 px-3 pt-3">
      <div className="pointer-events-auto flex flex-col gap-1 text-xs">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onToggleHighContrast}
            className="rounded-md bg-black/50 px-2 py-1 text-white shadow-sm"
          >
            HC: {highContrast ? "on" : "off"}
          </button>
          <button
            type="button"
            onClick={onToggleHideBackground}
            className="rounded-md bg-black/50 px-2 py-1 text-white shadow-sm"
          >
            BG: {hideBackground ? "hidden" : "show"}
          </button>
        </div>
        <span className="rounded-md bg-black/40 px-2 py-1 text-[10px] text-white/80">
          Query params: hc=1 hideBg=1 debugMedia=1 navStyle=leftright navCurrent=1 navHideVisited=1 navBottom=1
        </span>
      </div>

      <div className="pointer-events-auto space-y-2">
        {showDebug ? (
          <div className="rounded-md bg-black/60 px-3 py-2 text-[11px] text-white shadow">
            <p className="font-semibold">Media debug</p>
            <p>
              Subtitles:{" "}
              <span
                className={
                  subtitleStatus.state === "ok"
                    ? "text-green-200"
                    : subtitleStatus.state === "loading"
                      ? "text-yellow-200"
                      : subtitleStatus.state === "idle"
                        ? "text-white"
                        : "text-red-200"
                }
              >
                {subtitleStatus.state}
              </span>
            </p>
            <p>
              Audio:{" "}
              <span
                className={
                  audioDebug?.main?.status === "playing"
                    ? "text-green-200"
                    : audioDebug?.main?.status === "error"
                      ? "text-red-200"
                      : "text-yellow-200"
                }
              >
                {audioDebug?.main?.status ?? "idle"}
              </span>
            </p>
            {audioDebug?.main?.requested ? (
              <p className="mt-1 text-[10px] opacity-80">
                Main: {audioDebug.main.requested}
              </p>
            ) : null}
            {audioDebug?.alt?.requested ? (
              <p className="text-[10px] opacity-80">
                Alt: {audioDebug.alt.requested} ({audioDebug.alt.status ?? "idle"})
              </p>
            ) : null}
            {subtitleStatus.attempted.length ? (
              <div className="mt-1 max-w-[260px] space-y-1">
                {subtitleStatus.attempted.map((url) => (
                  <p key={url} className="truncate text-[10px] opacity-80">
                    {url}
                  </p>
                ))}
              </div>
            ) : null}
            {audioDebug?.preload?.length ? (
              <div className="mt-2 max-w-[260px] space-y-1">
                {audioDebug.preload.map((item, index) => (
                  <p
                    key={`${item.url}-${item.status}-${index}`}
                    className="truncate text-[10px] opacity-70"
                  >
                    {item.status.toUpperCase()}: {item.url}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-md bg-black/60 px-3 py-2 text-[11px] text-white shadow">
          <p className="font-semibold">Statistics</p>
          <p>
            Mode:{" "}
            {mode === "preview"
              ? "preview"
              : mode === "standalone"
                ? "standalone"
                : "normal"}
          </p>
          {statisticsDisabledReason ? <p>Stats: {statisticsDisabledReason}</p> : null}
          {mode === "standalone" ? <p>API: disabled in standalone mode</p> : null}
          <p>
            Toggle: {statisticsEnabled ? "on" : "off"} (node{" "}
            {nodeStatisticsEnabled ? "on" : "off"})
          </p>
          <p>
            Last:{" "}
            {statsDebug.lastAttempt
              ? `node ${statsDebug.lastAttempt.nodeId} @ ${statsDebug.lastAttempt.adventureSlug}`
              : "none"}
          </p>
          <p className="mt-1">
            Sent {statsDebug.sent} - Deduped {statsDebug.deduped}
          </p>
          <p>
            Skipped {statsDebug.skippedDisabled} - Errors {statsDebug.errors}
          </p>
        </div>
      </div>
    </div>
  );
}




