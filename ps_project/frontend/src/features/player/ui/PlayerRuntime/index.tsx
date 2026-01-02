"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { NodeModel } from "@/domain/models";
import { ChevronDown } from "lucide-react";
import { PlayerLayout } from "@/features/ui-core/components/PlayerLayout";
import { buildPropsStyle } from "@/features/ui-core/props";
import { Button } from "@/features/ui-core/primitives";
import { toastError, toastInfo } from "@/features/ui-core/toast";
import { cn } from "@/lib/utils";
import "../player-runtime.css";
import "../player-legacy-skin.css";
import {
  selectPlayerAdventure,
  selectPlayerCurrentNode,
  selectPlayerCurrentNodeKind,
  selectPlayerCurrentNodeId,
  selectPlayerHistoryLength,
  selectPlayerMode,
  usePlayerStore,
} from "../../state/playerStore";
import { resolveReferenceUrl } from "../../engine/playerEngine";
import type { AudioDebugSnapshot } from "../../media/audioEngine";
import {
  buildNavigationConfig,
  normalizeNavStyle,
} from "../../utils/navigationUtils";
import { resolveNodeKind, type NodeKind } from "../../utils/nodeUtils";
import { ScrollyTracker } from "../ScrollyTracker";
import { useViewportDevice } from "../useViewportDevice";
import { NavigationArea, NodeContent, PlayerOverlay, SwipeNodeNavigator } from "./components";
import { EMPTY_LINKS } from "./constants";
import { useAudioEngine } from "./hooks/useAudioEngine";
import { useLegacyAnimations } from "./hooks/useLegacyAnimations";
import { useLoadAdventureFonts } from "./hooks/useLoadAdventureFonts";
import { useMediaOverscan } from "./hooks/useMediaOverscan";
import { usePlayerPreferences } from "./hooks/usePlayerPreferences";
import { useStatsTracking } from "./hooks/useStatsTracking";
import { buildNavigationModel } from "./navigation/buildNavigationModel";
import { getNavigationLinksForNode } from "./navigation/helpers";
import type { NavigationModel } from "./navigation/types";
import type { MenuShortcutItem, PlayerRuntimeProps, StatsDebugState, SubtitleStatus } from "./types";
import { buildAudioSourceConfig } from "./utils/audioHelpers";
import { buildLegacyContent, readLegacyAnimationSettings } from "./utils/contentHelpers";
import {
  getRawSubtitlesValue,
  getVideoAudioSetting,
  getVideoLoopSetting,
  resolveNodeImageUrl,
  resolveNodeVideoSource,
  resolveSubtitleCandidates,
} from "./utils/mediaHelpers";
import {
  readMenuOptions,
  readMenuShortcuts,
  readMenuSoundOverride,
} from "./utils/menuHelpers";
import { paramIsTruthy, readNumberParam } from "./utils/paramHelpers";
import { parsePropsInput } from "./utils/propsParser";

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
  const mode = store(selectPlayerMode);
  const historyLength = store(selectPlayerHistoryLength);
  const history = store((s) => s.history);
  const visitedNodes = store((s) => s.visited);
  const chooseLink = store((s) => s.chooseLink);
  const start = store((s) => s.start);
  const getNodeById = store((s) => s.getNodeById);
  const goBack = store((s) => s.goBack);
  const goToNode = store((s) => s.goToNode);

  const navigationLinks = useMemo(
    () => getNavigationLinksForNode(currentNodeId ?? null, adventure?.links ?? EMPTY_LINKS),
    [adventure?.links, currentNodeId]
  );
  const currentNodeProps = useMemo(
    () => ({
      ...parsePropsInput(currentNode?.rawProps),
      ...parsePropsInput(currentNode?.props),
    }),
    [currentNode?.rawProps, currentNode?.props]
  );

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
  const { preferences, setPreferences } = usePlayerPreferences({
    searchParams,
    adventureSlug: adventure?.slug,
    adventureViewSlug: adventure?.viewSlug,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuNavigationMutePending, setMenuNavigationMutePending] = useState(false);
  const mutedMenuNodeIdRef = useRef<number | null>(null);
  const [viewportActiveNodeId, setViewportActiveNodeId] = useState<number | null>(null);
  const [scrollyReturnNonce, setScrollyReturnNonce] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const playerRootRef = useRef<HTMLDivElement | null>(null);
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
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);

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
    const handleVisibility = () => {
      setDocumentVisible(document.visibilityState !== "hidden");
    };
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

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
  useMediaOverscan(playerRootRef, media.filter);
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
  const audioSource = useMemo(
    () => buildAudioSourceConfig(activeNode, adventure),
    [activeNode, adventure]
  );
  const audioVolume = audioSource?.volume ?? 1;

  const { statsDebug, nodeStatisticsEnabled } = useStatsTracking({
    adventureSlug: adventure?.slug ?? null,
    currentNode,
    statisticsAllowed,
    statisticsEnabled,
  });

  const { audioDebug } = useAudioEngine({
    debugMedia,
    soundEnabled: effectiveSoundEnabled,
    canAutoplay: hasInteracted,
    documentVisible,
    audioSource,
    adventureSlug: adventure?.slug,
  });

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

  const resolvedImageUrl = resolveNodeImageUrl(activeNode, adventure);
  const videoSource = resolveNodeVideoSource(activeNode, resolvedImageUrl);
  const isVideoNode = activeNodeKind === "video";
  const backgroundImage = videoSource ? null : resolvedImageUrl;
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
  useLegacyAnimations({
    playerRootRef,
    animationSettings,
    backgroundIdentity,
    highContrast: flags.highContrast,
    hideBackground: flags.hideBackground,
    isScrollytell,
    isSwipeNav,
    currentNodeId,
  });

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
    return buildNavigationModel({
      currentNode,
      currentNodeId,
      currentNodeProps,
      navigationLinks,
      navigationConfig,
      getNodeById,
      visitedNodes,
    });
  }, [
    currentNode,
    currentNodeId,
    currentNodeProps,
    getNodeById,
    navigationConfig.hideVisited,
    navigationConfig.orderedIds,
    navigationConfig.showCurrent,
    navigationConfig.skipCount,
    navigationConfig.style,
    navigationLinks,
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
      highContrast={flags.highContrast}
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

export { StaticPlayerPreview } from "./StaticPlayerPreview";

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




