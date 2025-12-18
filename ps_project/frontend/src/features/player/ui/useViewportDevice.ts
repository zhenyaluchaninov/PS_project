import { useEffect } from "react";

type ViewportOrientation = "portrait" | "landscape";
type InputMode = "touch" | "mouse";
type HoverMode = "hover" | "none";

type ViewportDeviceOptions = {
  /**
   * Debounce delay for resize/orientation updates.
   * Defaults to 150ms to avoid thrash from visualViewport events.
   */
  debounceMs?: number;
  /**
   * Optional selector or ref target that should mirror the root data attributes.
   * Useful so component-level CSS can react without extra React renders.
   */
  targetSelector?: string;
};

const DEFAULT_DEBOUNCE_MS = 150;

const getInputMode = (): { input: InputMode; hover: HoverMode } => {
  if (typeof window === "undefined") {
    return { input: "mouse", hover: "hover" };
  }

  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const anyHover = window.matchMedia?.("(hover: hover)")?.matches ?? false;
  const hasTouchPoint =
    coarsePointer || "ontouchstart" in window || (navigator?.maxTouchPoints ?? 0) > 0;

  return {
    input: hasTouchPoint ? "touch" : "mouse",
    hover: anyHover ? "hover" : "none",
  };
};

const readViewport = () => {
  if (typeof window === "undefined") {
    return {
      width: 0,
      height: 0,
      orientation: "portrait" as ViewportOrientation,
      ...getInputMode(),
    };
  }

  const vv = window.visualViewport;
  const height = vv?.height ?? window.innerHeight ?? 0;
  const width = vv?.width ?? window.innerWidth ?? 0;
  const orientation: ViewportOrientation = height >= width ? "portrait" : "landscape";

  return {
    width,
    height,
    orientation,
    ...getInputMode(),
  };
};

const cleanListener = (
  target: MediaQueryList | undefined,
  handler: ((event: MediaQueryListEvent) => void) | (() => void)
) => {
  if (!target) return;
  if (typeof target.removeEventListener === "function") {
    target.removeEventListener("change", handler as (event: MediaQueryListEvent) => void);
  } else if (typeof target.removeListener === "function") {
    target.removeListener(handler as () => void);
  }
};

export const useViewportDevice = (options?: ViewportDeviceOptions) => {
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const { targetSelector } = options ?? {};

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const root = document.documentElement;
    const body = document.body;

    const getTargets = () => {
      const playerTarget =
        targetSelector && typeof document !== "undefined"
          ? (document.querySelector<HTMLElement>(targetSelector) ?? null)
          : null;

      return [root, body, playerTarget].filter(Boolean) as HTMLElement[];
    };

    let lastHeight = 0;
    let lastOrientation: ViewportOrientation | null = null;
    let lastInput: InputMode | null = null;
    let lastHover: HoverMode | null = null;

    const applyAttributes = (data: {
      orientation: ViewportOrientation;
      input: InputMode;
      hover: HoverMode;
      height: number;
    }) => {
      const targets = getTargets();
      const vh = Math.max(data.height, 0) * 0.01;
      const heightChanged = Math.abs(data.height - lastHeight) > 0.5;

      if (heightChanged) {
        targets.forEach((el) => {
          el.style.setProperty("--vh", `${vh}px`);
          el.style.setProperty("--player-viewport-height", `${data.height}px`);
        });
        lastHeight = data.height;
      }

      if (data.orientation !== lastOrientation) {
        targets.forEach((el) => el.setAttribute("data-orientation", data.orientation));
        lastOrientation = data.orientation;
      }

      if (data.input !== lastInput) {
        targets.forEach((el) => el.setAttribute("data-input", data.input));
        lastInput = data.input;
      }

      if (data.hover !== lastHover) {
        targets.forEach((el) => el.setAttribute("data-hover", data.hover));
        lastHover = data.hover;
      }
    };

    const runUpdate = () => {
      const snapshot = readViewport();
      applyAttributes(snapshot);
    };

    let debounceTimer: number | null = null;
    const scheduleUpdate = () => {
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        runUpdate();
      }, debounceMs);
    };

    runUpdate();

    const viewport = window.visualViewport;
    const resizeHandler = scheduleUpdate;
    const orientationHandler = scheduleUpdate;

    window.addEventListener("resize", resizeHandler, { passive: true });
    window.addEventListener("orientationchange", orientationHandler);
    viewport?.addEventListener("resize", resizeHandler);
    viewport?.addEventListener("scroll", resizeHandler);

    const hoverQuery = window.matchMedia?.("(hover: hover)");
    const pointerQuery = window.matchMedia?.("(pointer: coarse)");

    const mediaHandler = () => scheduleUpdate();
    if (hoverQuery?.addEventListener) {
      hoverQuery.addEventListener("change", mediaHandler);
    } else if (hoverQuery?.addListener) {
      hoverQuery.addListener(mediaHandler);
    }

    if (pointerQuery?.addEventListener) {
      pointerQuery.addEventListener("change", mediaHandler);
    } else if (pointerQuery?.addListener) {
      pointerQuery.addListener(mediaHandler);
    }

    return () => {
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
      }
      window.removeEventListener("resize", resizeHandler);
      window.removeEventListener("orientationchange", orientationHandler);
      viewport?.removeEventListener("resize", resizeHandler);
      viewport?.removeEventListener("scroll", resizeHandler);
      cleanListener(hoverQuery, mediaHandler);
      cleanListener(pointerQuery, mediaHandler);
    };
  }, [debounceMs, targetSelector]);
};
