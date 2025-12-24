"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Eye, Maximize2, Minimize2, Play, X } from "lucide-react";
import type { AdventureModel, NodeModel } from "@/domain/models";
import { StaticPlayerPreview } from "@/features/player/ui/PlayerRuntime";
import { cn } from "@/lib/utils";

type PreviewOverlayProps = {
  adventure: AdventureModel;
  selectedNode?: NodeModel;
  containerRef: RefObject<HTMLDivElement>;
};

const PREVIEW_WIDTH = 1920;
const PREVIEW_HEIGHT = 1080;
const PREVIEW_ASPECT = PREVIEW_WIDTH / PREVIEW_HEIGHT;
const DEFAULT_POSITION = { x: 60, y: 16 };
const DEFAULT_WIDTH = 360;
const DEFAULT_SIZE = {
  width: DEFAULT_WIDTH,
  height: Math.round(DEFAULT_WIDTH / PREVIEW_ASPECT),
};
const MIN_WIDTH = 320;
const MIN_SIZE = { width: MIN_WIDTH, height: Math.round(MIN_WIDTH / PREVIEW_ASPECT) };
const EXPANDED_INSET = { top: 12, right: 12, bottom: 12, left: 60 };
const MARGIN = 12;

export function PreviewOverlay({
  adventure,
  selectedNode,
  containerRef,
}: PreviewOverlayProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const lastFloatingRef = useRef({ position: DEFAULT_POSITION, size: DEFAULT_SIZE });

  const nodeLabel = selectedNode ? `Node #${selectedNode.nodeId}` : "No node selected";

  const clampPosition = useCallback(
    (nextPosition: { x: number; y: number }, nextSize = size) => {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds) return nextPosition;
      const maxX = Math.max(MARGIN, bounds.width - nextSize.width - MARGIN);
      const maxY = Math.max(MARGIN, bounds.height - nextSize.height - MARGIN);
      return {
        x: Math.min(Math.max(nextPosition.x, MARGIN), maxX),
        y: Math.min(Math.max(nextPosition.y, MARGIN), maxY),
      };
    },
    [containerRef, size]
  );

  const clampSize = useCallback(
    (nextSize: { width: number; height: number }, anchor = position) => {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds) {
        const width = Math.max(nextSize.width, MIN_SIZE.width);
        return { width, height: Math.round(width / PREVIEW_ASPECT) };
      }
      const maxWidth = Math.max(160, bounds.width - anchor.x - MARGIN);
      const maxHeight = Math.max(140, bounds.height - anchor.y - MARGIN);
      const maxWidthByHeight = maxHeight * PREVIEW_ASPECT;
      const maxWidthAllowed = Math.max(80, Math.min(maxWidth, maxWidthByHeight));
      const width = Math.min(Math.max(nextSize.width, MIN_SIZE.width), maxWidthAllowed);
      return { width, height: Math.round(width / PREVIEW_ASPECT) };
    },
    [containerRef, position]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        setContainerSize((prev) =>
          prev.width === rect.width && prev.height === rect.height
            ? prev
            : { width: rect.width, height: rect.height }
        );
      }
      if (!isExpanded) {
        setPosition((prev) => {
          const next = clampPosition(prev, size);
          return next.x === prev.x && next.y === prev.y ? prev : next;
        });
        setSize((prev) => {
          const next = clampSize(prev);
          return next.width === prev.width && next.height === prev.height
            ? prev
            : next;
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [clampPosition, clampSize, containerRef, isExpanded, size]);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isExpanded) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const start = {
      x: event.clientX,
      y: event.clientY,
      position,
    };
    const startUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const handleMove = (moveEvent: PointerEvent) => {
      const next = {
        x: start.position.x + (moveEvent.clientX - start.x),
        y: start.position.y + (moveEvent.clientY - start.y),
      };
      setPosition(clampPosition(next));
    };

    const handleUp = () => {
      document.body.style.userSelect = startUserSelect;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isExpanded) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const start = {
      x: event.clientX,
      y: event.clientY,
      size,
      position,
    };
    const startUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const handleMove = (moveEvent: PointerEvent) => {
      const widthFromX = start.size.width + (moveEvent.clientX - start.x);
      const heightFromY = start.size.height + (moveEvent.clientY - start.y);
      const widthFromHeight = heightFromY * PREVIEW_ASPECT;
      const nextWidth =
        Math.abs(widthFromHeight - start.size.width) >
        Math.abs(widthFromX - start.size.width)
          ? widthFromHeight
          : widthFromX;
      const nextSize = clampSize({ width: nextWidth, height: 0 }, start.position);
      setSize(nextSize);
      setPosition((prev) => clampPosition(prev, nextSize));
    };

    const handleUp = () => {
      document.body.style.userSelect = startUserSelect;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const toggleExpanded = () => {
    if (!isExpanded) {
      lastFloatingRef.current = { position, size };
      setIsExpanded(true);
      return;
    }
    setIsExpanded(false);
    const restored = lastFloatingRef.current;
    const clampedSize = clampSize(restored.size, restored.position);
    setSize(clampedSize);
    setPosition(clampPosition(restored.position, clampedSize));
  };

  const panelMetrics = useMemo(() => {
    if (isExpanded && containerSize.width && containerSize.height) {
      const availableWidth =
        containerSize.width - EXPANDED_INSET.left - EXPANDED_INSET.right;
      const availableHeight =
        containerSize.height - EXPANDED_INSET.top - EXPANDED_INSET.bottom;
      const width = Math.min(availableWidth, availableHeight * PREVIEW_ASPECT);
      const height = Math.round(width / PREVIEW_ASPECT);
      return {
        width,
        height,
      };
    }
    if (isExpanded) {
      return {
        width: size.width,
        height: size.height,
      };
    }
    return {
      width: size.width,
      height: size.height,
    };
  }, [
    containerSize.height,
    containerSize.width,
    isExpanded,
    size.height,
    size.width,
  ]);

  const panelStyle = useMemo(() => {
    if (isExpanded && containerSize.width && containerSize.height) {
      const availableWidth =
        containerSize.width - EXPANDED_INSET.left - EXPANDED_INSET.right;
      const availableHeight =
        containerSize.height - EXPANDED_INSET.top - EXPANDED_INSET.bottom;
      const width = Math.min(availableWidth, availableHeight * PREVIEW_ASPECT);
      const height = Math.round(width / PREVIEW_ASPECT);
      const left = EXPANDED_INSET.left + (availableWidth - width) / 2;
      const top = EXPANDED_INSET.top + (availableHeight - height) / 2;
      return {
        top,
        left,
        width,
        height,
      };
    }
    if (isExpanded) {
      return {
        top: EXPANDED_INSET.top,
        left: EXPANDED_INSET.left,
        width: size.width,
        height: size.height,
      };
    }
    return {
      top: position.y,
      left: position.x,
      width: size.width,
      height: size.height,
    };
  }, [
    containerSize.height,
    containerSize.width,
    isExpanded,
    position.x,
    position.y,
    size.height,
    size.width,
  ]);

  const previewScale = useMemo(() => {
    if (!panelMetrics.width || !panelMetrics.height) return 1;
    return Math.min(
      panelMetrics.width / PREVIEW_WIDTH,
      panelMetrics.height / PREVIEW_HEIGHT
    );
  }, [panelMetrics.height, panelMetrics.width]);

  const previewOffset = useMemo(() => {
    const scaledWidth = PREVIEW_WIDTH * previewScale;
    const scaledHeight = PREVIEW_HEIGHT * previewScale;
    return {
      x: Math.max(0, (panelMetrics.width - scaledWidth) / 2),
      y: Math.max(0, (panelMetrics.height - scaledHeight) / 2),
    };
  }, [panelMetrics.height, panelMetrics.width, previewScale]);

  if (!isOpen) {
    return (
      <div
        className="absolute z-30"
        style={{ top: DEFAULT_POSITION.y, left: DEFAULT_POSITION.x }}
      >
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text)] shadow-[0_12px_30px_-22px_rgba(0,0,0,0.8)]"
        >
          <Eye className="h-4 w-4" aria-hidden />
          Preview
        </button>
      </div>
    );
  }

  return (
    <div className="absolute z-30" style={panelStyle}>
      <div className="relative h-full w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text)] shadow-[0_18px_40px_-28px_rgba(0,0,0,0.85)]">
        <div
          className={cn(
            "absolute left-0 right-0 top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-tertiary)]/95 px-3 py-2 text-sm backdrop-blur",
            isExpanded ? "cursor-default" : "cursor-move",
            "select-none"
          )}
          onPointerDown={startDrag}
        >
          <div className="flex min-w-0 flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Preview
            </span>
            <span className="truncate font-semibold">{nodeLabel}</span>
          </div>

          <div
            className="flex shrink-0 items-center gap-2"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center rounded-full border border-[var(--border)] bg-[var(--bg)]/80 p-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              <button
                type="button"
                className="rounded-full bg-[var(--bg-tertiary)] px-2 py-1 text-[var(--text)]"
                aria-pressed
              >
                Static
              </button>
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="rounded-full px-2 py-1 text-[var(--muted)] opacity-60"
              >
                <span className="sr-only">Play (disabled)</span>
                <span className="flex items-center gap-1">
                  <Play className="h-3 w-3" aria-hidden />
                  Play
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={toggleExpanded}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] transition hover:border-[var(--border-light)]"
              aria-label={isExpanded ? "Collapse preview" : "Expand preview"}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" aria-hidden />
              ) : (
                <Maximize2 className="h-4 w-4" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] transition hover:border-[var(--border-light)]"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="absolute inset-0 overflow-hidden bg-[var(--bg)]">
          {selectedNode ? (
            <div
              className="absolute"
              style={{
                width: PREVIEW_WIDTH,
                height: PREVIEW_HEIGHT,
                left: previewOffset.x,
                top: previewOffset.y,
                transform: `scale(${previewScale})`,
                transformOrigin: "top left",
              }}
            >
              <StaticPlayerPreview
                adventure={adventure}
                node={selectedNode}
                className="h-full w-full"
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-sm text-[var(--muted)]">
              Select a node to render its scene.
            </div>
          )}
        </div>

        {!isExpanded ? (
          <div
            className="absolute bottom-1 right-1 flex h-4 w-4 cursor-se-resize items-end justify-end text-[var(--muted)]"
            onPointerDown={startResize}
            aria-hidden="true"
          >
            <div className="h-2 w-2 border-b border-r border-[var(--border-light)]" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
