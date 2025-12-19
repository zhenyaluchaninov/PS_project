import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ScrollyBlock = {
  key: string;
  nodeId?: number | null;
  isActive?: boolean;
  content: ReactNode;
};

type ScrollyTrackerProps = {
  blocks: ScrollyBlock[];
  activeNodeId?: number | null;
  onViewportActiveChange?: (nodeId: number | null) => void;
  className?: string;
};

export function ScrollyTracker({
  blocks,
  activeNodeId,
  onViewportActiveChange,
  className,
}: ScrollyTrackerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastViewportActiveRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeNodeId == null) return;
    const container = containerRef.current;
    if (!container) return;

    const target = container.querySelector<HTMLElement>('[data-active="true"]');
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeNodeId]);

  useEffect(() => {
    if (!onViewportActiveChange) return;
    const container = containerRef.current;
    if (!container) return;

    const sentinels = Array.from(
      container.querySelectorAll<HTMLElement>("[data-scrolly-sentinel]")
    );
    if (!sentinels.length) return;

    const visible = new Map<Element, IntersectionObserverEntry>();

    const pickActive = (entries: IntersectionObserverEntry[]) => {
      const rootBounds =
        entries.find((entry) => entry.rootBounds)?.rootBounds ??
        container.getBoundingClientRect();
      const rootCenter = rootBounds.top + rootBounds.height / 2;

      let best: { nodeId: number; distance: number } | null = null;
      visible.forEach((entry) => {
        const target = entry.target as HTMLElement;
        const nodeIdRaw = target.getAttribute("data-node-id");
        const nodeId = nodeIdRaw ? Number(nodeIdRaw) : NaN;
        if (!Number.isFinite(nodeId)) return;
        const rect = entry.boundingClientRect;
        const targetCenter = rect.top + rect.height / 2;
        const distance = Math.abs(targetCenter - rootCenter);
        if (!best || distance < best.distance) {
          best = { nodeId, distance };
        }
      });

      if (!best) return;
      if (lastViewportActiveRef.current === best.nodeId) return;
      lastViewportActiveRef.current = best.nodeId;
      onViewportActiveChange(best.nodeId);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visible.set(entry.target, entry);
          } else {
            visible.delete(entry.target);
          }
        });
        if (!visible.size) return;
        pickActive(entries);
      },
      {
        root: container,
        rootMargin: "-40% 0px -40% 0px",
        threshold: [0, 1],
      }
    );

    sentinels.forEach((sentinel) => observer.observe(sentinel));

    return () => {
      observer.disconnect();
      visible.clear();
    };
  }, [blocks, onViewportActiveChange]);

  return (
    <div className={cn("ps-scrollytell", className)} ref={containerRef}>
      {blocks.map((block) => (
        <section
          key={block.key}
          className="ps-scrollytell__block"
          data-node-id={block.nodeId ?? undefined}
          data-active={block.isActive ? "true" : undefined}
        >
          <span
            className="ps-scrollytell__sentinel"
            data-scrolly-sentinel
            data-node-id={block.nodeId ?? undefined}
            aria-hidden
          />
          <div className="ps-scrollytell__block-inner">{block.content}</div>
        </section>
      ))}
    </div>
  );
}
