type TrackKind = "main" | "alt";

type AudioHandle = {
  kind: TrackKind;
  element: HTMLAudioElement;
  originalUrl: string;
  resolvedUrl: string;
  fromCache: boolean;
  baseVolume: number;
  fadeInMs: number;
  fadeOutMs: number;
  hasStarted: boolean;
  resumeOnVisible: boolean;
  nodeId?: number | null;
  oneShot?: boolean;
  fadeTimer?: number;
};

export type AudioSourceConfig = {
  nodeId: number | null;
  mainCandidates: string[];
  altCandidates: string[];
  volume: number;
  fadeInSeconds?: number | null;
  fadeOutSeconds?: number | null;
  loop?: boolean;
  altBehavior?: "play_once" | "always";
};

export type AudioEnginePlaybackState = {
  soundEnabled: boolean;
  canAutoplay: boolean;
  isDocumentVisible: boolean;
};

export type AudioDebugSnapshot = {
  main?: {
    requested?: string | null;
    resolved?: string | null;
    status: "idle" | "playing" | "paused" | "stopped" | "error";
    volume?: number;
    fromCache?: boolean;
  };
  alt?: {
    requested?: string | null;
    resolved?: string | null;
    status: "idle" | "playing" | "paused" | "stopped" | "error";
    fromCache?: boolean;
  };
  preload: Array<{ url: string; status: "pending" | "loaded" | "hit" | "error" }>;
};

export type AudioEngine = {
  setPlaybackState: (state: AudioEnginePlaybackState) => void;
  setSource: (source: AudioSourceConfig | null) => void;
  preload: (urls: Array<string | null | undefined>) => void;
  setDebugListener: (listener?: (snapshot: AudioDebugSnapshot) => void) => void;
  reset: () => void;
  dispose: () => void;
  getDebugState: () => AudioDebugSnapshot;
};

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

const safePlay = (element: HTMLAudioElement) => {
  try {
    const result = element.play();
    if (result && typeof result.catch === "function") {
      result.catch((err) => {
        console.warn("[audio] play blocked", err);
      });
    }
  } catch (err) {
    console.warn("[audio] play failed", err);
  }
};

const clearHandleFade = (handle?: AudioHandle | null) => {
  if (handle?.fadeTimer) {
    window.clearInterval(handle.fadeTimer);
    handle.fadeTimer = undefined;
  }
};

const cosineFade = (
  handle: AudioHandle,
  targetVolume: number,
  durationMs: number,
  onDone?: () => void
) => {
  clearHandleFade(handle);
  const startVolume = clamp01(handle.element.volume);
  const endVolume = clamp01(targetVolume);
  const duration = Math.max(durationMs, 0);
  if (duration === 0) {
    handle.element.volume = endVolume;
    onDone?.();
    return;
  }

  const interval = 20;
  const steps = Math.max(Math.round(duration / interval), 1);
  let tick = 0;

  handle.fadeTimer = window.setInterval(() => {
    tick += 1;
    const progress = Math.min(tick / steps, 1);
    const eased = 0.5 - 0.5 * Math.cos(progress * Math.PI);
    const volume = startVolume + eased * (endVolume - startVolume);
    handle.element.volume = clamp01(volume);
    if (progress >= 1) {
      clearHandleFade(handle);
      onDone?.();
    }
  }, interval);
};

const disposeHandle = (handle?: AudioHandle | null) => {
  if (!handle) return;
  clearHandleFade(handle);
  handle.element.pause();
  handle.element.src = "";
  handle.element.load();
};

export const createAudioEngine = ({
  crossfadeMs = 350,
  onDebug,
}: {
  crossfadeMs?: number;
  onDebug?: (snapshot: AudioDebugSnapshot) => void;
} = {}): AudioEngine => {
  let playbackState: AudioEnginePlaybackState = {
    soundEnabled: true,
    canAutoplay: false,
    isDocumentVisible: true,
  };

  let currentMain: AudioHandle | null = null;
  let currentAlt: AudioHandle | null = null;
  let requestId = 0;

  const preloadCache = new Map<string, string>();
  const inflight = new Map<string, Promise<string | null>>();
  const altPlayed = new Set<number>();
  const preloadLog = new Map<string, "pending" | "loaded" | "hit" | "error">();

  const debugState: AudioDebugSnapshot = { preload: [] };
  const updateDebug = () => {
    debugState.preload = Array.from(preloadLog.entries()).map(([url, status]) => ({
      url,
      status,
    }));
    onDebug?.({ ...debugState });
  };

  const setDebugListener = (listener?: (snapshot: AudioDebugSnapshot) => void) => {
    onDebug = listener;
    if (listener) updateDebug();
  };

  const stopHandle = (handle: AudioHandle | null, fadeMs: number) => {
    if (!handle) return;
    cosineFade(handle, 0, fadeMs, () => disposeHandle(handle));
  };

  const setTrackStatus = (
    kind: TrackKind,
    status: "idle" | "playing" | "paused" | "stopped" | "error",
    data?: Partial<{
      requested: string | null;
      resolved: string | null;
      volume: number;
      fromCache: boolean;
    }>
  ) => {
    const target = kind === "main" ? (debugState.main ??= { status: "idle" }) : (debugState.alt ??= { status: "idle" });
    target.status = status;
    if (data?.requested !== undefined) target.requested = data.requested;
    if (data?.resolved !== undefined) target.resolved = data.resolved;
    if (data?.volume !== undefined) target.volume = data.volume;
    if (data?.fromCache !== undefined) target.fromCache = data.fromCache;
    updateDebug();
  };

  const preload = async (url: string) => {
    if (!url) return { objectUrl: null, fromCache: false, ok: false };
    const cached = preloadCache.get(url);
    if (cached) {
      preloadLog.set(url, "hit");
      updateDebug();
      return { objectUrl: cached, fromCache: true, ok: true };
    }
    const existing = inflight.get(url);
    if (existing) {
      const objectUrl = await existing;
      const ok = Boolean(objectUrl);
      preloadLog.set(url, ok ? "hit" : "error");
      updateDebug();
      return { objectUrl, fromCache: ok, ok };
    }

    preloadLog.set(url, "pending");
    updateDebug();
    const fetchPromise = fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        preloadCache.set(url, objectUrl);
        preloadLog.set(url, "loaded");
        updateDebug();
        return objectUrl;
      })
      .catch((err) => {
        console.warn("[audio] preload failed", url, err);
        preloadLog.set(url, "error");
        updateDebug();
        return null;
      })
      .finally(() => {
        inflight.delete(url);
      });

    inflight.set(url, fetchPromise);
    const objectUrl = await fetchPromise;
    const ok = Boolean(objectUrl);
    return { objectUrl, fromCache: false, ok };
  };

  const resolveCandidates = async (
    candidates: string[],
    kind: TrackKind,
    token: number
  ): Promise<{ url: string; resolved: string; fromCache: boolean } | null> => {
    for (const candidate of candidates) {
      setTrackStatus(kind, "idle", { requested: candidate });
      const { objectUrl, fromCache, ok } = await preload(candidate);
      if (token !== requestId) return null;
      if (ok && objectUrl) {
        return { url: candidate, resolved: objectUrl, fromCache };
      }
    }
    return null;
  };

  const applyPlaybackState = (handle: AudioHandle | null) => {
    if (!handle) return;
    const shouldPause = !playbackState.canAutoplay || !playbackState.isDocumentVisible;
    const targetVolume = handle.baseVolume * (playbackState.soundEnabled ? 1 : 0);

    if (shouldPause) {
      handle.resumeOnVisible = !handle.element.paused;
      handle.element.pause();
      setTrackStatus(handle.kind, "paused", {
        volume: handle.element.volume,
        resolved: handle.resolvedUrl,
        requested: handle.originalUrl,
      });
      return;
    }

    if (playbackState.soundEnabled) {
      if (handle.element.paused) {
        safePlay(handle.element);
      }
      if (handle.kind === "alt" && handle.oneShot && handle.nodeId != null) {
        altPlayed.add(handle.nodeId);
      }
      const fadeMs = handle.hasStarted ? 120 : handle.fadeInMs;
      cosineFade(handle, targetVolume, fadeMs, () => {
        setTrackStatus(handle.kind, "playing", {
          volume: handle.element.volume,
          resolved: handle.resolvedUrl,
          requested: handle.originalUrl,
          fromCache: handle.fromCache,
        });
      });
      handle.hasStarted = true;
    } else {
      cosineFade(handle, targetVolume, 100, () => {
        setTrackStatus(handle.kind, "paused", {
          volume: handle.element.volume,
          resolved: handle.resolvedUrl,
          requested: handle.originalUrl,
        });
      });
    }
  };

  const setSource = async (source: AudioSourceConfig | null) => {
    requestId += 1;
    const token = requestId;

    stopHandle(currentAlt, crossfadeMs);
    currentAlt = null;
    setTrackStatus("alt", "stopped", { requested: null, resolved: null });

    if (!source || (source.mainCandidates.length === 0 && source.altCandidates.length === 0)) {
      stopHandle(currentMain, source?.fadeOutSeconds ? source.fadeOutSeconds * 1000 : crossfadeMs);
      currentMain = null;
      setTrackStatus("main", "stopped", { requested: null, resolved: null, volume: 0 });
      setTrackStatus("alt", "stopped", { requested: null, resolved: null });
      return;
    }

    if (source.mainCandidates.length === 0) {
      stopHandle(currentMain, source.fadeOutSeconds ? source.fadeOutSeconds * 1000 : crossfadeMs);
      currentMain = null;
      setTrackStatus("main", "stopped", { requested: null, resolved: null, volume: 0 });
    } else {
      const resolvedMain = await resolveCandidates(source.mainCandidates, "main", token);
      if (token !== requestId) return;
      if (!resolvedMain) {
        setTrackStatus("main", "error", { requested: source.mainCandidates[0] ?? null });
        return;
      }

      const fadeInMs =
        source.fadeInSeconds != null ? Math.max(0, source.fadeInSeconds * 1000) : crossfadeMs;
      const fadeOutMs =
        source.fadeOutSeconds != null ? Math.max(0, source.fadeOutSeconds * 1000) : crossfadeMs;

      if (currentMain && currentMain.originalUrl === resolvedMain.url) {
        currentMain.baseVolume = source.volume;
        currentMain.fadeInMs = fadeInMs;
        currentMain.fadeOutMs = fadeOutMs;
        currentMain.element.loop = Boolean(source.loop);
        currentMain.nodeId = source.nodeId;
        currentMain.resolvedUrl = resolvedMain.resolved;
        currentMain.fromCache = resolvedMain.fromCache;
        applyPlaybackState(currentMain);
      } else {
        stopHandle(currentMain, fadeOutMs);
        const element = new Audio(resolvedMain.resolved);
        element.loop = Boolean(source.loop);
        element.preload = "auto";
        element.volume = 0;

        currentMain = {
          kind: "main",
          element,
          originalUrl: resolvedMain.url,
          resolvedUrl: resolvedMain.resolved,
          fromCache: resolvedMain.fromCache,
          baseVolume: source.volume,
          fadeInMs,
          fadeOutMs,
          hasStarted: false,
          resumeOnVisible: false,
          nodeId: source.nodeId,
        };

        element.addEventListener("ended", () => {
          if (currentMain === null) return;
          if (currentMain.element === element && !element.loop) {
            setTrackStatus("main", "stopped", { requested: currentMain.originalUrl, resolved: currentMain.resolvedUrl });
          }
        });

        applyPlaybackState(currentMain);
      }
    }

    const shouldPlayAlt =
      source.altCandidates.length > 0 &&
      !(
        source.altBehavior === "play_once" &&
        source.nodeId != null &&
        altPlayed.has(source.nodeId)
      );

    if (shouldPlayAlt) {
      const resolvedAlt = await resolveCandidates(source.altCandidates, "alt", token);
      if (token !== requestId) return;
      if (resolvedAlt) {
        const fadeInMs =
          source.fadeInSeconds != null ? Math.max(0, source.fadeInSeconds * 1000) : crossfadeMs;
        const element = new Audio(resolvedAlt.resolved);
        element.loop = false;
        element.preload = "auto";
        element.volume = 0;

        currentAlt = {
          kind: "alt",
          element,
          originalUrl: resolvedAlt.url,
          resolvedUrl: resolvedAlt.resolved,
          fromCache: resolvedAlt.fromCache,
          baseVolume: source.volume,
          fadeInMs,
          fadeOutMs: crossfadeMs,
          hasStarted: false,
          resumeOnVisible: false,
          nodeId: source.nodeId,
          oneShot: source.altBehavior === "play_once",
        };

        const handleRef = currentAlt;
        element.addEventListener("ended", () => {
          if (source.altBehavior === "play_once" && source.nodeId != null) {
            altPlayed.add(source.nodeId);
          }
          setTrackStatus("alt", "stopped", {
            requested: handleRef?.originalUrl ?? resolvedAlt.url,
            resolved: handleRef?.resolvedUrl ?? resolvedAlt.resolved,
          });
          disposeHandle(handleRef);
          if (currentAlt === handleRef) {
            currentAlt = null;
          }
        });

        applyPlaybackState(currentAlt);
      } else {
        setTrackStatus("alt", "error", { requested: source.altCandidates[0] });
      }
    }
  };

  const setPlaybackState = (state: AudioEnginePlaybackState) => {
    playbackState = state;
    applyPlaybackState(currentMain);
    applyPlaybackState(currentAlt);
  };

  const preloadUrls = (urls: Array<string | null | undefined>) => {
    urls
      .map((url) => (url ?? "").trim())
      .filter(Boolean)
      .forEach((url) => {
        void preload(url);
      });
  };

  const reset = () => {
    requestId += 1;
    stopHandle(currentMain, 0);
    stopHandle(currentAlt, 0);
    currentMain = null;
    currentAlt = null;
    altPlayed.clear();
    preloadCache.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    preloadCache.clear();
    inflight.clear();
    preloadLog.clear();
    debugState.main = { status: "idle" };
    debugState.alt = { status: "idle" };
    debugState.preload = [];
    updateDebug();
  };

  const dispose = () => {
    reset();
  };

  const getDebugState = () => ({ ...debugState });

  return {
    setPlaybackState,
    setSource,
    preload: preloadUrls,
    setDebugListener,
    reset,
    dispose,
    getDebugState,
  };
};
