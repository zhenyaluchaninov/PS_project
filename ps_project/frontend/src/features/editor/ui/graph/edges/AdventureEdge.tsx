import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import type { CSSProperties } from "react";
import type { GraphEdge } from "../types";

function readCssColor(variableName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
  return value || fallback;
}

export function AdventureEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style,
}: EdgeProps<GraphEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const isBidirectional = data?.isBidirectional ?? false;
  const hasConditions = data?.hasConditions ?? false;
  const playState = data?.playState ?? null;
  const isPlayCurrent = playState === "current";
  const isPlayVisited = playState === "visited";
  const stroke = selected
    ? "var(--editor-edge-selected)"
    : isPlayCurrent
      ? "var(--editor-play-edge-current)"
      : isPlayVisited
        ? "var(--editor-play-edge)"
        : isBidirectional
          ? "var(--editor-edge-bidirectional)"
          : "var(--editor-edge)";
  const markerColor = selected
    ? readCssColor("--accent", "#d08770")
    : isPlayCurrent
      ? readCssColor("--editor-play-edge-current", "#ebcb8b")
      : isPlayVisited
        ? readCssColor("--editor-play-edge", "#88c0d0")
        : readCssColor("--border-light", "#5c6678");
  const markerId = `edge-arrow-${id}${isBidirectional ? "-bi" : ""}-${selected ? "on" : "off"}`;
  const markerUrl = `url(#${markerId})`;
  const edgeStyle = {
    ...style,
    stroke,
    strokeWidth: selected || isPlayCurrent ? 3.2 : isPlayVisited ? 2.8 : 2.4,
    strokeDasharray: isBidirectional ? "6 5" : undefined,
  } as CSSProperties;

  return (
    <>
      <defs>
        <marker
          id={markerId}
          viewBox="-10 -10 20 20"
          refX="0"
          refY="0"
          markerWidth="12.5"
          markerHeight="12.5"
          markerUnits="strokeWidth"
          orient="auto-start-reverse"
        >
          <polyline
            className="arrowclosed"
            style={{ stroke: markerColor, fill: markerColor, strokeWidth: 1 }}
            strokeLinecap="round"
            strokeLinejoin="round"
            points="-5,-4 0,0 -5,4 -5,-4"
          />
        </marker>
      </defs>
      <BaseEdge
        path={edgePath}
        style={edgeStyle}
        markerEnd={markerUrl}
        markerStart={isBidirectional ? markerUrl : undefined}
      />
      {hasConditions ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute rounded-full border border-[var(--editor-edge-condition-border)] bg-[var(--editor-edge-condition-bg)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--editor-edge-condition-text)] shadow-[0_8px_18px_-12px_rgba(0,0,0,0.8)]"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            IF
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
