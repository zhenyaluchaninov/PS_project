"use client";

import {
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import type { AdventurePropsModel, LinkModel, NodeModel } from "@/domain/models";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { LegacyContent } from "@/features/ui-core/components/LegacyContent";
import { PlayerLayout } from "@/features/ui-core/components/PlayerLayout";
import { buildPropsStyle } from "@/features/ui-core/props";
import { Button } from "@/features/ui-core/primitives";
import { toastError } from "@/features/ui-core/toast";
import { cn } from "@/lib/utils";
import "./player-runtime.css";
import {
  selectPlayerAdventure,
  selectPlayerCurrentNode,
  selectPlayerCurrentNodeKind,
  selectPlayerHistoryLength,
  selectPlayerMode,
  selectPlayerOutgoingLinks,
  selectPlayerProgress,
  selectPlayerRootNodeId,
  selectPlayerVisitedCount,
  usePlayerStore,
} from "../state/playerStore";
import {
  resolveReferenceUrl,
  resolveVideoSource,
  type NodeKind,
} from "../engine/playerEngine";
import { useViewportDevice } from "./useViewportDevice";

const paramIsTruthy = (value?: string | null) =>
  value ? ["1", "true", "yes", "on"].includes(value.toLowerCase()) : false;

type SubtitleStatus = {
  state: "idle" | "loading" | "ok" | "error";
  attempted: string[];
};

const injectedFonts = new Set<string>();

const parseFontEntry = (entry: string) => {
  const trimmed = entry.trim();
  const isUrl = /^https?:\/\//.test(trimmed) || trimmed.startsWith("/");
  const name =
    isUrl && trimmed.includes("/")
      ? trimmed.split("/").pop()?.replace(/\.[^/.]+$/, "") ?? trimmed
      : trimmed;
  return { name, url: isUrl ? trimmed : undefined };
};

const useLoadAdventureFonts = (
  fontList?: AdventurePropsModel["fontList"],
  requestedFont?: string
) => {
  useEffect(() => {
    if (!fontList?.length) return;
    if (typeof document === "undefined") return;

    fontList.forEach((entry) => {
      const { name, url } = parseFontEntry(entry);
      if (!url) {
        injectedFonts.add(name);
        return;
      }
      const key = `${name}:${url}`;
      if (injectedFonts.has(key)) return;
      injectedFonts.add(key);
      const style = document.createElement("style");
      style.setAttribute("data-player-font", name);
      style.textContent = `@font-face { font-family: "${name}"; src: url("${url}"); font-display: swap; }`;
      document.head.appendChild(style);
    });
  }, [fontList]);

  useEffect(() => {
    if (!requestedFont) return;
    injectedFonts.add(requestedFont);
  }, [requestedFont]);
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

const resolveSubtitleCandidates = (
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

type NavStyle = "default" | "right" | "leftright" | "noButtons" | "swipe" | "swipeWithButton";
type NavPlacement = "inline" | "bottom";

type NavItem = { kind: "link"; link: LinkModel } | { kind: "current" };
type NavigationButton = {
  key: string;
  label: string;
  meta?: string;
  linkId?: number;
  targetNodeId?: number;
  disabled?: boolean;
  isCurrent?: boolean;
};

type NavigationModel = {
  buttons: NavigationButton[];
  primaryLinkId?: number;
};

const normalizeNavStyle = (raw?: string | null): NavStyle | null => {
  if (raw === null || raw === undefined) return null;
  let asString: string | null = null;
  if (typeof raw === "string") {
    asString = raw;
  } else if (Array.isArray(raw)) {
    const first = raw.find((item) => typeof item === "string") as string | undefined;
    asString = first ?? null;
  } else {
    asString = String(raw);
  }
  const key = asString?.toLowerCase().trim() ?? "";
  if (!key) return null;
  if (key === "right") return "right";
  if (key === "leftright" || key === "left-right" || key === "left_right") return "leftright";
  if (key === "nobuttons" || key === "no-buttons" || key === "no") return "noButtons";
  if (key === "swipewithbutton" || key === "swipe-with-button") return "swipeWithButton";
  if (key === "swipe") return "swipe";
  return "default";
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

const parseOrderedLinkIds = (value: unknown): number[] => {
  const tokens = tokenize(value);
  return tokens
    .map((token) => Number(token))
    .filter((num) => Number.isFinite(num))
    .map((num) => Number(num));
};

const hasHideVisitedCondition = (node?: NodeModel | null): boolean => {
  if (!node?.rawProps) return false;
  const conditions = tokenize(
    readRawProp(node.rawProps, ["node_conditions", "nodeConditions", "node-conditions"])
  ).map((token) => token.toLowerCase());
  return conditions.includes("hide_visited");
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

export function PlayerRuntime() {
  const searchParams = useSearchParams();
  const adventure = usePlayerStore(selectPlayerAdventure);
  const currentNode = usePlayerStore(selectPlayerCurrentNode);
  const currentNodeKind = usePlayerStore(selectPlayerCurrentNodeKind);
  const outgoingLinks = usePlayerStore(selectPlayerOutgoingLinks);
  const mode = usePlayerStore(selectPlayerMode);
  const historyLength = usePlayerStore(selectPlayerHistoryLength);
  const visitedCount = usePlayerStore(selectPlayerVisitedCount);
  const progress = usePlayerStore(selectPlayerProgress);
  const rootNodeId = usePlayerStore(selectPlayerRootNodeId);
  const visitedNodes = usePlayerStore((s) => s.visited);
  const chooseLink = usePlayerStore((s) => s.chooseLink);
  const start = usePlayerStore((s) => s.start);
  const getNodeById = usePlayerStore((s) => s.getNodeById);
  const goBack = usePlayerStore((s) => s.goBack);
  const goHome = usePlayerStore((s) => s.goHome);

  const [devHighContrast, setDevHighContrast] = useState(
    paramIsTruthy(searchParams?.get("hc") ?? searchParams?.get("highContrast"))
  );
  const [devHideBackground, setDevHideBackground] = useState(
    paramIsTruthy(searchParams?.get("hideBg") ?? searchParams?.get("hidebg"))
  );
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
  const [subtitleStatus, setSubtitleStatus] = useState<SubtitleStatus>({
    state: "idle",
    attempted: [],
  });

  const debugMedia = paramIsTruthy(
    searchParams?.get("debugMedia") ?? searchParams?.get("debugmedia")
  );
  const debugLayout = paramIsTruthy(
    searchParams?.get("debugLayout") ?? searchParams?.get("debuglayout")
  );

  useViewportDevice({ targetSelector: ".ps-player" });

  useEffect(() => {
    setDevHighContrast(
      paramIsTruthy(searchParams?.get("hc") ?? searchParams?.get("highContrast"))
    );
    setDevHideBackground(
      paramIsTruthy(searchParams?.get("hideBg") ?? searchParams?.get("hidebg"))
    );
  }, [searchParams]);

  useEffect(() => {
    if (!currentNode) {
      start();
    }
  }, [currentNode, start]);

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

  const navigationConfig = useMemo(() => {
    const navSettingsTokens = tokenize(
      readRawProp(currentNode?.rawProps, [
        "playerNavigation.settings",
        "playerNavigation_settings",
        "playerNavigationSettings",
      ])
    ).map((token) => token.toLowerCase());

    const styleFromProps = normalizeNavStyle(
      readRawProp(currentNode?.rawProps, [
        "background.navigation_style",
        "navigation_style",
        "backgroundNavigationStyle",
      ]) as string | undefined
    );

    const style: NavStyle = navOverrides.styleOverride ?? styleFromProps ?? "default";
    const placement: NavPlacement =
      navOverrides.bottomOverride || navSettingsTokens.includes("bottom-navigation")
        ? "bottom"
        : "inline";
    const showCurrent =
      navOverrides.showCurrentOverride ?? navSettingsTokens.includes("show-current-node");
    const hideVisited =
      (navOverrides.hideVisitedOverride ?? false) || navSettingsTokens.includes("hide-visited");
    const orderedIds = parseOrderedLinkIds(
      readRawProp(currentNode?.rawProps, ["ordered_link_ids", "button_order", "button-order"])
    );
    const skipCount = style === "default" || style === "swipeWithButton" ? 0 : 1;
    const swipeMode = style === "swipe" || style === "swipeWithButton";

    return {
      style,
      placement,
      showCurrent,
      orderedIds,
      skipCount,
      hideVisited,
      swipeMode,
    };
  }, [currentNode?.rawProps, navOverrides]);

  const propsResult = useMemo(
    () =>
      buildPropsStyle({
        adventureProps: adventure?.props ?? undefined,
        nodeProps: currentNode?.rawProps ?? currentNode?.props ?? undefined,
        forceHighContrast: devHighContrast,
        forceHideBackground: devHideBackground,
      }),
    [adventure?.props, currentNode?.props, currentNode?.rawProps, devHighContrast, devHideBackground]
  );

  const { style: propsStyle, flags, dataProps, layout, media, typography } = propsResult;

  useLoadAdventureFonts(adventure?.props?.fontList, typography.fontFamily);

  const subtitleCandidates = useMemo(
    () =>
      resolveSubtitleCandidates(
        adventure?.slug,
        adventure?.viewSlug,
        getRawSubtitlesValue(currentNode)
      ),
    [adventure?.slug, adventure?.viewSlug, currentNode]
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

  const handleSubtitleError = () => {
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
  };

  const handleSubtitleLoad = () => {
    setSubtitleStatus((prev) => {
      const attempted = prev.attempted.includes(subtitleUrl ?? "")
        ? prev.attempted
        : subtitleUrl
          ? [...prev.attempted, subtitleUrl]
          : prev.attempted;
      return { state: "ok", attempted };
    });
  };

  const referenceUrl =
    currentNodeKind === "reference" || currentNodeKind === "reference-tab"
      ? resolveReferenceUrl(currentNode)
      : null;

  const videoSource = resolveVideoSource(currentNode);
  const backgroundImage = videoSource ? null : currentNode?.image?.url ?? null;
  const backgroundVideo = videoSource
    ? {
        src: videoSource,
        subtitlesUrl: subtitleUrl,
        onSubtitlesError: handleSubtitleError,
        onSubtitlesLoad: handleSubtitleLoad,
      }
    : undefined;

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
          meta: "You are here",
          isCurrent: true,
        });
        return;
      }

      const link = item.link;
      const targetNode = getNodeById(link.toNodeId);
      if (shouldHideLink(link)) return;

      const isBroken = !link.toNodeId || !targetNode;
      const label =
        link.label && link.label.trim().length > 0
          ? link.label.trim()
          : targetNode?.title || `Continue ${buttons.length + 1}`;

      buttons.push({
        key: String(link.linkId),
        label,
        meta: isBroken ? "No target" : `-> Node ${link.toNodeId}`,
        linkId: link.linkId,
        targetNodeId: link.toNodeId,
        disabled: isBroken,
      });
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
    `ps-player--nav-${navigationConfig.style}`,
    navigationConfig.placement === "bottom" ? "ps-player--nav-bottom" : "",
    navigationConfig.swipeMode ? "ps-player--swipe" : ""
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
      overlay={
        <DevToggles
          highContrast={flags.highContrast}
          hideBackground={flags.hideBackground}
          subtitleStatus={subtitleStatus}
          showDebug={debugMedia}
          onToggleHighContrast={() => setDevHighContrast((prev) => !prev)}
          onToggleHideBackground={() => setDevHideBackground((prev) => !prev)}
        />
      }
    >
      <div className="ps-player__card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] opacity-70">
              {adventure.title}
            </p>
            <p className="text-sm opacity-70">
              Node {currentNode?.nodeId ?? "?"} - {currentNodeKind}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase">
            {mode === "preview" ? (
              <span className="rounded-full bg-white/15 px-3 py-1 text-white">
                Preview
              </span>
            ) : null}
            {flags.highContrast ? (
              <span className="rounded-full bg-black/60 px-3 py-1 text-white border border-white/30">
                High contrast
              </span>
            ) : null}
            {flags.hideBackground ? (
              <span className="rounded-full bg-black/50 px-3 py-1 text-white border border-white/20">
                Background hidden
              </span>
            ) : null}
          </div>
        </div>

        <NodeContent
          nodeKind={currentNodeKind}
          nodeTitle={currentNode?.title ?? ""}
          nodeText={currentNode?.text ?? ""}
        />

        {currentNodeKind === "reference" || currentNodeKind === "reference-tab" ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/15 bg-black/20 p-3">
            <Button onClick={openReference} disabled={!referenceUrl} size="sm">
              {currentNodeKind === "reference-tab" ? "Open in new tab" : "Open link"}
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

        <div className="flex flex-wrap items-center gap-2 text-xs opacity-80">
          <span>Visited {visitedCount}/{adventure.nodes.length}</span>
          <span aria-hidden>-</span>
          <span>Progress {progress}%</span>
        </div>

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
          showDownArrow={navigationConfig.style === "swipe"}
          onChooseLink={(linkId) => chooseLink(linkId)}
          onBack={goBack}
          disableBack={historyLength <= 1}
        />

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            type="button"
            onClick={goBack}
            disabled={historyLength <= 1}
            className={cn(
              "rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold transition",
              historyLength <= 1
                ? "cursor-not-allowed opacity-60"
                : "hover:border-[var(--player-accent,#fff)] hover:bg-white/15"
            )}
          >
            Back
          </button>
          <button
            type="button"
            onClick={goHome}
            disabled={!rootNodeId || historyLength <= 1}
            className={cn(
              "rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold transition",
              !rootNodeId || historyLength <= 1
                ? "cursor-not-allowed opacity-60"
                : "hover:border-[var(--player-accent,#fff)] hover:bg-white/15"
            )}
          >
            Home
          </button>
        </div>
      </div>
    </PlayerLayout>
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
  onChooseLink: (linkId: number) => void;
  onBack: () => void;
  disableBack: boolean;
}) {
  const hasButtons = buttons.length > 0;
  const hasArrows = showLeftArrow || showRightArrow || showDownArrow;
  const shouldShowEmptyState = !hasButtons && navStyle !== "noButtons";

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
            disabled={disableBack}
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
            buttons.map((button) => (
              <button
                key={button.key}
                type="button"
                className={cn(
                  "ps-player__choice ps-nav__choice",
                  button.isCurrent ? "ps-nav__choice--current" : "",
                  button.disabled ? "cursor-not-allowed opacity-60" : ""
                )}
                onClick={
                  button.disabled || !button.linkId || button.isCurrent
                    ? undefined
                    : () => {
                        if (button.linkId) onChooseLink(button.linkId);
                      }
                }
                onPointerDown={button.disabled || button.isCurrent ? undefined : addPressedClass}
                onPointerUp={removePressedClass}
                onPointerLeave={removePressedClass}
                onPointerCancel={removePressedClass}
                disabled={button.disabled || button.isCurrent}
                aria-disabled={button.disabled || button.isCurrent}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="font-semibold">{button.label}</span>
                    {button.isCurrent ? (
                      <span className="text-xs opacity-75">Current node</span>
                    ) : button.disabled ? (
                      <span className="text-xs opacity-75 text-red-200">Broken link</span>
                    ) : null}
                  </div>
                  {button.meta ? (
                    <span className="text-xs opacity-75">{button.meta}</span>
                  ) : null}
                </div>
              </button>
            ))
          ) : (
            <p className="text-sm opacity-75">No outgoing links.</p>
          )}
        </div>

        {showRightArrow ? (
          <NavArrowButton
            label="Next"
            icon={<ChevronRight aria-hidden />}
            disabled={!primaryLinkId}
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
            disabled={!primaryLinkId}
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
  nodeKind,
  nodeTitle,
  nodeText,
}: {
  nodeKind: NodeKind;
  nodeTitle: string;
  nodeText: string;
}) {
  const prose = nodeText ? (
    <LegacyContent value={nodeText} className="ps-player__prose" />
  ) : (
    <p className="text-sm opacity-70">No content.</p>
  );

  if (nodeKind === "start") {
    return (
      <div className="space-y-3">
        <h1 className="ps-player__title text-3xl">{nodeTitle || "Start"}</h1>
        {prose}
      </div>
    );
  }

  if (nodeKind === "chapter") {
    return (
      <div className="space-y-3">
        <div className="border-b border-white/15 pb-2">
          <p className="text-xs uppercase tracking-[0.2em] opacity-70">Chapter</p>
          <h2 className="ps-player__title mt-1 text-2xl">
            {nodeTitle || "Untitled chapter"}
          </h2>
        </div>
        {prose}
      </div>
    );
  }

  if (nodeKind === "chapter-plain") {
    return (
      <div className="space-y-2">
        <h2 className="ps-player__title text-xl">{nodeTitle || "Untitled chapter"}</h2>
        {prose}
      </div>
    );
  }

  return <div className="space-y-3">{prose}</div>;
}

function DevToggles({
  highContrast,
  hideBackground,
  subtitleStatus,
  showDebug,
  onToggleHighContrast,
  onToggleHideBackground,
}: {
  highContrast: boolean;
  hideBackground: boolean;
  subtitleStatus: SubtitleStatus;
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

      {showDebug ? (
        <div className="pointer-events-auto rounded-md bg-black/60 px-3 py-2 text-[11px] text-white shadow">
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
          {subtitleStatus.attempted.length ? (
            <div className="mt-1 max-w-[260px] space-y-1">
              {subtitleStatus.attempted.map((url) => (
                <p key={url} className="truncate text-[10px] opacity-80">
                  {url}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
