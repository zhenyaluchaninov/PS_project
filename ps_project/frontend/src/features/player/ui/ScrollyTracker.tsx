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
  className?: string;
};

export function ScrollyTracker({ blocks, activeNodeId, className }: ScrollyTrackerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeNodeId == null) return;
    const container = containerRef.current;
    if (!container) return;

    const target = container.querySelector<HTMLElement>('[data-active="true"]');
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeNodeId]);

  return (
    <div className={cn("ps-scrollytell", className)} ref={containerRef}>
      {blocks.map((block) => (
        <section
          key={block.key}
          className="ps-scrollytell__block"
          data-node-id={block.nodeId ?? undefined}
          data-active={block.isActive ? "true" : undefined}
        >
          <div className="ps-scrollytell__block-inner">{block.content}</div>
        </section>
      ))}
    </div>
  );
}
