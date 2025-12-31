import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";

type LegacyAnimationSettings = {
  animationDelay: number;
  navigationDelay: number;
  backgroundFadeSeconds: number;
  paragraphDelay: number;
};

type UseLegacyAnimationsParams = {
  playerRootRef: MutableRefObject<HTMLDivElement | null>;
  animationSettings: LegacyAnimationSettings;
  backgroundIdentity: string;
  highContrast: boolean;
  hideBackground: boolean;
  isScrollytell: boolean;
  isSwipeNav: boolean;
  currentNodeId?: number | null;
};

export const useLegacyAnimations = ({
  playerRootRef,
  animationSettings,
  backgroundIdentity,
  highContrast,
  hideBackground,
  isScrollytell,
  isSwipeNav,
  currentNodeId,
}: UseLegacyAnimationsParams) => {
  const runningAnimationsRef = useRef<Animation[]>([]);
  const previousBackgroundIdentityRef = useRef<string | null>(null);
  const animationRetryRef = useRef(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

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

  const shouldAnimateLegacy =
    !highContrast && !prefersReducedMotion && !isScrollytell && !isSwipeNav;

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
        if (hasBackgroundChange && media && !hideBackground) {
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
    hideBackground,
    playerRootRef,
    shouldAnimateLegacy,
  ]);
};
