import { useCallback, useEffect, useRef, type ReactNode } from "react";

export function SwipeNodeNavigator({
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
