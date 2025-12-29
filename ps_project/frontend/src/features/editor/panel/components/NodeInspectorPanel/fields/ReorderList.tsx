import { useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReorderList({
  items,
  selectedId,
  onSelect,
  onReorder,
  enableReorder = true,
}: {
  items: Array<{ linkId: number; targetId: number; label: string }>;
  selectedId?: number | null;
  onSelect?: (linkId: number) => void;
  onReorder?: (
    items: Array<{ linkId: number; targetId: number; label: string }>
  ) => void;
  enableReorder?: boolean;
}) {
  const rowRefs = useRef(new Map<number, HTMLDivElement>());
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const [draftItems, setDraftItems] = useState(items);
  const draftItemsRef = useRef(draftItems);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const draggingIdRef = useRef<number | null>(null);
  const didDropRef = useRef(false);
  const canReorder = enableReorder && Boolean(onReorder);

  useEffect(() => {
    draftItemsRef.current = draftItems;
  }, [draftItems]);

  useEffect(() => {
    draggingIdRef.current = draggingId;
  }, [draggingId]);

  useEffect(() => {
    if (draggingIdRef.current === null) {
      setDraftItems(items);
    }
  }, [items]);

  const reorderItems = (
    list: Array<{ linkId: number; targetId: number; label: string }>,
    sourceId: number,
    targetId: number
  ) => {
    const fromIndex = list.findIndex((item) => item.linkId === sourceId);
    const toIndex = list.findIndex((item) => item.linkId === targetId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return list;
    }
    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  };

  const handleDragStart = (itemId: number) => (event: React.DragEvent) => {
    if (!canReorder) return;
    didDropRef.current = false;
    setDraggingId(itemId);
    setDraftItems(items);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(itemId));
    const row = rowRefs.current.get(itemId);
    if (row) {
      const rect = row.getBoundingClientRect();
      ghostRef.current?.remove();
      const ghost = document.createElement("div");
      const computed = window.getComputedStyle(row);
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      ghost.style.border = `${computed.borderTopWidth} solid ${computed.borderTopColor}`;
      ghost.style.borderRadius = computed.borderRadius;
      ghost.style.backgroundColor = computed.backgroundColor;
      ghost.style.boxShadow = "0 10px 20px rgba(0, 0, 0, 0.25)";
      ghost.style.opacity = "0.95";
      ghost.style.boxSizing = "border-box";
      ghost.style.position = "absolute";
      ghost.style.top = "-9999px";
      ghost.style.left = "-9999px";
      ghost.style.pointerEvents = "none";
      document.body.appendChild(ghost);
      ghostRef.current = ghost;
      event.dataTransfer.setDragImage(
        ghost,
        rect.width / 2,
        rect.height / 2
      );
    }
  };

  const handleDragOver = (itemId: number) => (event: React.DragEvent) => {
    if (!canReorder) return;
    if (draggingId === null || draggingId === itemId) return;
    event.preventDefault();
    setDraftItems((prev) => reorderItems(prev, draggingId, itemId));
  };

  const handleDrop = (event: React.DragEvent) => {
    if (!canReorder || !onReorder) return;
    event.preventDefault();
    didDropRef.current = true;
    const finalItems = draftItemsRef.current;
    const changed =
      finalItems.length === items.length &&
      finalItems.some(
        (item, index) => item.linkId !== items[index]?.linkId
      );
    ghostRef.current?.remove();
    ghostRef.current = null;
    if (changed) {
      onReorder(finalItems);
    }
    setDraggingId(null);
  };

  const handleDragEnd = () => {
    if (!didDropRef.current) {
      setDraftItems(items);
    }
    setDraggingId(null);
    ghostRef.current?.remove();
    ghostRef.current = null;
  };

  const displayItems = canReorder ? draftItems : items;

  return (
    <div
      className="space-y-2"
      role="list"
      onDragOver={
        canReorder
          ? (event) => {
              if (draggingId !== null) event.preventDefault();
            }
          : undefined
      }
      onDrop={canReorder ? handleDrop : undefined}
    >
      {displayItems.map((item) => (
        <div
          key={item.linkId}
          role="listitem"
          ref={(node) => {
            if (node) {
              rowRefs.current.set(item.linkId, node);
            } else {
              rowRefs.current.delete(item.linkId);
            }
          }}
          onDragOver={canReorder ? handleDragOver(item.linkId) : undefined}
          onDrop={canReorder ? handleDrop : undefined}
          className={cn(
            "flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-2",
            "hover:border-[var(--border-light)] hover:bg-[var(--bg-hover)]",
            draggingId === item.linkId ? "opacity-0" : "",
            selectedId === item.linkId
              ? "border-[var(--accent)] ring-2 ring-[var(--accent-muted)]"
              : ""
          )}
          onClick={(event) => {
            if (process.env.NODE_ENV !== "production") {
              console.debug("[Choices] row click", {
                linkId: item.linkId,
                targetTag:
                  event.target instanceof HTMLElement ? event.target.tagName : null,
              });
            }
            onSelect?.(item.linkId);
          }}
        >
          {canReorder ? (
            <button
              type="button"
              draggable
              onDragStart={(event) => {
                if (process.env.NODE_ENV !== "production") {
                  console.debug("[Choices] drag start", { linkId: item.linkId });
                }
                handleDragStart(item.linkId)(event);
              }}
              onDragEnd={handleDragEnd}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              aria-label={`Reorder ${item.label}`}
              className="cursor-grab px-1 text-[var(--muted)] active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--text-secondary)]">
              {item.label}
            </p>
            <p className="text-xs text-[var(--muted)]">
              Node #{item.targetId}
            </p>
          </div>
          <span className="text-[10px] font-semibold text-[var(--muted)]">
            #{item.linkId}
          </span>
        </div>
      ))}
    </div>
  );
}
