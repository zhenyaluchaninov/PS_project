import type { MouseEvent } from "react";
import type { AdventureModel } from "@/domain/models";

type NodePosition = { x: number; y: number };

export function buildFallbackPositions(
  nodes: AdventureModel["nodes"]
): Map<number, NodePosition> {
  const positions = new Map<number, NodePosition>();
  if (!nodes.length) return positions;

  const columns = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const spacingX = 240;
  const spacingY = 180;

  nodes.forEach((node, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    positions.set(node.nodeId, { x: col * spacingX, y: row * spacingY });
  });

  return positions;
}

export function toNumericId(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function getEventClientPosition(
  event: MouseEvent | TouchEvent
): { x: number; y: number } | null {
  if ("touches" in event) {
    const touch = event.touches[0] ?? event.changedTouches[0];
    if (!touch) return null;
    return { x: touch.clientX, y: touch.clientY };
  }
  return { x: event.clientX, y: event.clientY };
}

export function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}
