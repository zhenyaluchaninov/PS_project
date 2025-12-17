"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AdventurePropsModel, NodeModel } from "@/domain/models";
import { LegacyContent } from "@/features/ui-core/components/LegacyContent";
import { PlayerLayout } from "@/features/ui-core/components/PlayerLayout";
import { buildPropsStyle } from "@/features/ui-core/props";
import { Button } from "@/features/ui-core/primitives";
import { toastError } from "@/features/ui-core/toast";
import { cn } from "@/lib/utils";
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
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
  const [subtitleStatus, setSubtitleStatus] = useState<SubtitleStatus>({
    state: "idle",
    attempted: [],
  });

  const debugMedia = paramIsTruthy(
    searchParams?.get("debugMedia") ?? searchParams?.get("debugmedia")
  );

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
    if (typeof window === "undefined") return;

    const updateMetrics = () => {
      if (typeof window === "undefined") return;
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
      setOrientation(window.innerHeight > window.innerWidth ? "portrait" : "landscape");
    };

    let resizeTimer: number | undefined;
    const handleResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(updateMetrics, 140);
    };

    updateMetrics();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

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

  const resolvedMargins =
    layout.containerWidthVw || orientation === "landscape"
      ? layout.containerMarginsVw
      : ([6, 6] as [number, number]);

  const contentDataProps = [
    dataProps.player_container,
    dataProps.inner_container,
    dataProps.text_block,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

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

        <div className="ps-player__choices">
          {currentNode && outgoingLinks.length > 0 ? (
            outgoingLinks.map((link, idx) => {
              const targetNode = getNodeById(link.toNodeId);
              const isBroken = !link.toNodeId || !targetNode;
              return (
                <button
                  key={link.linkId}
                  type="button"
                  onClick={() => chooseLink(link.linkId)}
                  aria-disabled={isBroken}
                  className={cn(
                    "ps-player__choice",
                    isBroken ? "cursor-not-allowed opacity-60" : ""
                  )}
                  disabled={isBroken}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="font-semibold">
                        {link.label && link.label.trim().length > 0
                          ? link.label
                          : targetNode?.title || `Continue ${idx + 1}`}
                      </span>
                      {isBroken ? (
                        <span className="text-xs opacity-75 text-red-200">Broken link</span>
                      ) : null}
                    </div>
                    <span className="text-xs opacity-75">
                      {isBroken ? "No target" : `-> Node ${link.toNodeId}`}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <p className="text-sm opacity-75">No outgoing links.</p>
          )}
        </div>

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
          Query params: hc=1 hideBg=1 debugMedia=1
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
