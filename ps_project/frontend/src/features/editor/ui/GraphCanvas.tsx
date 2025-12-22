"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  getBezierPath,
  useEdgesState,
  useNodesState,
  type Connection,
  type DefaultEdgeOptions,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type OnConnectStartParams,
  type ReactFlowInstance,
} from "@xyflow/react";
import type { AdventureModel } from "@/domain/models";
import type { EditorSelection } from "../state/editorStore";
import { cn } from "@/lib/utils";

type GraphNodeData = {
  label: string;
  nodeId: number;
  chapterType: string | null;
  badges: Array<{ key: string; label: string; tone: "flag" | "media" }>;
  style: {
    background: string;
    border: string;
    accent: string;
  };
};

type GraphEdgeData = {
  linkId: number;
  isBidirectional: boolean;
  hasConditions: boolean;
};

type GraphCanvasProps = {
  adventure: AdventureModel;
  editSlug?: string;
  editVersion?: number | null;
  selection: EditorSelection;
  onSelectionChange: (selection: EditorSelection) => void;
  onNodePositionsChange: (
    updates: Array<{ nodeId: number; position: { x: number; y: number } }>
  ) => void;
  onCreateLink: (sourceId: number, targetId: number) => number | null;
  onCreateNodeWithLink: (
    sourceId: number,
    position: { x: number; y: number }
  ) => { nodeId: number; linkId: number } | null;
  onDeleteNodes: (nodeIds: number[]) => void;
  onDeleteLinks: (linkIds: number[]) => void;
  className?: string;
};

type NodePosition = { x: number; y: number };

type NodeVariant =
  | "start"
  | "chapter"
  | "chapter-plain"
  | "ref"
  | "ref-tab"
  | "random"
  | "video"
  | "audio"
  | "default";

const nodeVariantStyles: Record<NodeVariant, GraphNodeData["style"]> = {
  start: {
    background: "#143323",
    border: "rgba(52,211,153,0.65)",
    accent: "#34d399",
  },
  chapter: {
    background: "#172b4d",
    border: "rgba(96,165,250,0.65)",
    accent: "#60a5fa",
  },
  "chapter-plain": {
    background: "#1f2a3a",
    border: "rgba(148,163,184,0.5)",
    accent: "#94a3b8",
  },
  ref: {
    background: "#322615",
    border: "rgba(251,191,36,0.6)",
    accent: "#fbbf24",
  },
  "ref-tab": {
    background: "#3b2f1a",
    border: "rgba(245,158,11,0.6)",
    accent: "#f59e0b",
  },
  random: {
    background: "#3a1f1f",
    border: "rgba(249,115,22,0.6)",
    accent: "#f97316",
  },
  video: {
    background: "#331926",
    border: "rgba(251,113,133,0.6)",
    accent: "#fb7185",
  },
  audio: {
    background: "#193332",
    border: "rgba(45,212,191,0.6)",
    accent: "#2dd4bf",
  },
  default: {
    background: "#162644",
    border: "rgba(148,163,184,0.25)",
    accent: "rgba(148,163,184,0.7)",
  },
};

function buildFallbackPositions(
  nodes: AdventureModel["nodes"]
): Map<number, NodePosition> {
  const positions = new Map<number, NodePosition>();
  if (!nodes.length) return positions;

  const columns = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const spacingX = 220;
  const spacingY = 140;

  nodes.forEach((node, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    positions.set(node.nodeId, { x: col * spacingX, y: row * spacingY });
  });

  return positions;
}

function readStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((entry): entry is string => typeof entry === "string");
        }
      } catch {
        return [trimmed];
      }
    }
    return [trimmed];
  }
  return [];
}

function isTruthyFlag(value: unknown): boolean {
  if (value === true) return true;
  if (value === false || value == null) return false;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return (
      normalized === "on" ||
      normalized === "true" ||
      normalized === "yes" ||
      normalized === "1" ||
      normalized === "hide_visited"
    );
  }
  return false;
}

function getChapterType(rawProps: Record<string, unknown> | null): string | null {
  if (!rawProps) return null;
  const rawValue =
    rawProps.settings_chapterType ??
    rawProps.settingsChapterType ??
    rawProps.chapterType ??
    rawProps.chapter_type;
  const values = readStringArray(rawValue);
  return values[0] ?? null;
}

function getNodeVariant(chapterType: string | null, nodeType: string | null): NodeVariant {
  if (nodeType === "root") return "start";
  switch (chapterType) {
    case "start-node":
      return "start";
    case "chapter-node":
      return "chapter";
    case "chapter-node-plain":
      return "chapter-plain";
    case "ref-node":
      return "ref";
    case "ref-node-tab":
      return "ref-tab";
    case "random-node":
      return "random";
    case "videoplayer-node":
      return "video";
    case "podplayer-node":
      return "audio";
    default:
      return "default";
  }
}

function hasStatisticsFlag(rawProps: Record<string, unknown> | null): boolean {
  if (!rawProps) return false;
  const directKeys = ["node_statistics", "nodeStatistics", "node_stats", "nodeStats"];
  for (const key of directKeys) {
    if (isTruthyFlag(rawProps[key])) return true;
  }
  for (const [key, value] of Object.entries(rawProps)) {
    if (/statistics/i.test(key) && isTruthyFlag(value)) {
      return true;
    }
  }
  return false;
}

function hasNodeVariableFlag(rawProps: Record<string, unknown> | null): boolean {
  if (!rawProps) return false;
  const directKeys = [
    "node_conditions",
    "nodeConditions",
    "node_condition",
    "nodeCondition",
    "node_variable",
    "nodeVariable",
  ];
  for (const key of directKeys) {
    if (isTruthyFlag(rawProps[key])) return true;
  }
  for (const [key, value] of Object.entries(rawProps)) {
    if (/node.*condition/i.test(key) && isTruthyFlag(value)) {
      return true;
    }
    if (/node.*variable/i.test(key) && isTruthyFlag(value)) {
      return true;
    }
  }
  for (const value of Object.values(rawProps)) {
    if (typeof value === "string" && value.toLowerCase().includes("hide_visited")) {
      return true;
    }
  }
  return false;
}

function hasConditionList(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "[]") return false;
    if (/^\d+$/.test(trimmed)) {
      return Number(trimmed) > 0;
    }
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) && parsed.length > 0;
      } catch {
        return true;
      }
    }
    return true;
  }
  if (typeof value === "number") return value > 0;
  return false;
}

function hasEdgeConditions(props: Record<string, unknown> | null): boolean {
  if (!props) return false;
  const positive =
    props.positiveNodeList ??
    props.positive_node_list ??
    props.positiveNodes ??
    props.positive_nodes;
  const negative =
    props.negativeNodeList ??
    props.negative_node_list ??
    props.negativeNodes ??
    props.negative_nodes;
  return hasConditionList(positive) || hasConditionList(negative);
}

function toNumericId(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getEventClientPosition(
  event: MouseEvent | TouchEvent
): { x: number; y: number } | null {
  if ("touches" in event) {
    const touch = event.touches[0] ?? event.changedTouches[0];
    if (!touch) return null;
    return { x: touch.clientX, y: touch.clientY };
  }
  return { x: event.clientX, y: event.clientY };
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function buildGraphNodes(
  nodes: AdventureModel["nodes"],
  existingNodes: Node<GraphNodeData>[]
): Node<GraphNodeData>[] {
  const existingById = new Map(existingNodes.map((node) => [node.id, node]));
  const fallbackPositions = buildFallbackPositions(nodes);

  return nodes.map((node) => {
    const existing = existingById.get(String(node.nodeId));
    const hasPosition = node.position.x !== 0 || node.position.y !== 0;
    const position = hasPosition
      ? node.position
      : existing?.position ??
        fallbackPositions.get(node.nodeId) ?? { x: 0, y: 0 };
    const chapterType = getChapterType(node.rawProps);
    const variant = getNodeVariant(chapterType, node.type ?? null);
    const style = nodeVariantStyles[variant] ?? nodeVariantStyles.default;
    const hasStatistics = hasStatisticsFlag(node.rawProps);
    const hasNodeVariable = hasNodeVariableFlag(node.rawProps);
    const hasImage = Boolean(node.image.url || node.image.id);
    const hasAudio =
      Boolean(node.props?.audioUrl || node.props?.audioUrlAlt) ||
      chapterType === "podplayer-node";
    const hasVideo =
      Boolean(node.props?.subtitlesUrl) || chapterType === "videoplayer-node";
    const badges: GraphNodeData["badges"] = [];

    if (hasStatistics) {
      badges.push({ key: "stats", label: "STAT", tone: "flag" });
    }
    if (hasNodeVariable) {
      badges.push({ key: "node-variable", label: "VAR", tone: "flag" });
    }
    if (hasImage) {
      badges.push({ key: "image", label: "IMG", tone: "media" });
    }
    if (hasAudio) {
      badges.push({ key: "audio", label: "AUD", tone: "media" });
    }
    if (hasVideo) {
      badges.push({ key: "video", label: "VID", tone: "media" });
    }

    return {
      id: String(node.nodeId),
      type: "adventure",
      position,
      data: {
        label: node.title || `Node ${node.nodeId}`,
        nodeId: node.nodeId,
        chapterType,
        badges,
        style,
      },
      selected: existing?.selected ?? false,
    };
  });
}

function buildGraphEdges(
  links: AdventureModel["links"],
  nodes: AdventureModel["nodes"],
  existingEdges: Edge<GraphEdgeData>[]
): Edge<GraphEdgeData>[] {
  const existingById = new Map(existingEdges.map((edge) => [edge.id, edge]));
  const nodeIds = new Set(nodes.map((node) => String(node.nodeId)));

  return links
    .filter(
      (link) => nodeIds.has(String(link.source)) && nodeIds.has(String(link.target))
    )
    .map((link) => {
      const existing = existingById.get(String(link.linkId));
      const normalizedType = String(link.type ?? "").toLowerCase();
      const isBidirectional = normalizedType.includes("bidirectional");
      const hasConditions = hasEdgeConditions(link.props);
      const markerColor = isBidirectional
        ? "var(--editor-edge-bidirectional)"
        : "var(--editor-edge)";
      const markerEnd = {
        type: MarkerType.ArrowClosed,
        color: markerColor,
        width: 14,
        height: 14,
      };
      const markerStart = isBidirectional ? markerEnd : undefined;
      return {
        id: String(link.linkId),
        source: String(link.source),
        target: String(link.target),
        type: "adventure",
        data: { linkId: link.linkId, isBidirectional, hasConditions },
        markerEnd,
        markerStart,
        selected: existing?.selected ?? false,
      };
    });
}

function AdventureNode({ data, selected }: NodeProps<GraphNodeData>) {
  const flagBadges = data.badges.filter((badge) => badge.tone === "flag");
  const mediaBadges = data.badges.filter((badge) => badge.tone === "media");
  const hasBadges = data.badges.length > 0;
  const nodeStyle = {
    "--node-bg": data.style.background,
    "--node-border": data.style.border,
    "--node-accent": data.style.accent,
  } as CSSProperties;

  return (
    <div
      className={cn(
        "relative rounded-xl border px-4 pb-3 text-xs shadow-[0_10px_30px_-26px_rgba(0,0,0,0.8)]",
        hasBadges ? "pt-6" : "pt-3",
        selected
          ? "border-[var(--node-border)] bg-[var(--node-bg)] ring-2 ring-[var(--accent)] shadow-[0_0_0_1px_var(--accent),0_16px_40px_-24px_rgba(0,0,0,0.9)]"
          : "border-[var(--node-border)] bg-[var(--node-bg)]"
      )}
      style={nodeStyle}
    >
      <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-[var(--node-accent)]" />
      {mediaBadges.length ? (
        <div className="absolute left-3 top-2 flex flex-wrap gap-1">
          {mediaBadges.map((badge) => (
            <span
              key={badge.key}
              className="rounded border border-[var(--editor-badge-media-border)] bg-[var(--editor-badge-media-bg)] px-1 py-[1px] text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--editor-badge-media-text)]"
            >
              {badge.label}
            </span>
          ))}
        </div>
      ) : null}
      {flagBadges.length ? (
        <div className="absolute right-3 top-2 flex flex-wrap gap-1">
          {flagBadges.map((badge) => (
            <span
              key={badge.key}
              className="rounded border border-[var(--editor-badge-flag-border)] bg-[var(--editor-badge-flag-bg)] px-1 py-[1px] text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--editor-badge-flag-text)]"
            >
              {badge.label}
            </span>
          ))}
        </div>
      ) : null}
      <Handle
        type="target"
        position={Position.Top}
        className="h-2 w-2 border-2 border-[var(--node-bg)] bg-[var(--node-accent)]"
      />
      <div className="font-semibold text-[var(--text)]">{data.label}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        #{data.nodeId}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2 w-2 border-2 border-[var(--node-bg)] bg-[var(--node-accent)]"
      />
    </div>
  );
}

function AdventureEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  markerStart,
  selected,
  style,
}: EdgeProps<GraphEdgeData>) {
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
  const stroke = selected
    ? "var(--editor-edge-selected)"
    : isBidirectional
      ? "var(--editor-edge-bidirectional)"
      : "var(--editor-edge)";
  const edgeStyle = {
    ...style,
    stroke,
    strokeWidth: selected ? 2.8 : 2,
    strokeDasharray: isBidirectional ? "6 5" : undefined,
  } as CSSProperties;

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={edgeStyle}
        markerEnd={markerEnd}
        markerStart={markerStart}
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

const nodeTypes = { adventure: AdventureNode };
const edgeTypes = { adventure: AdventureEdge };
const defaultEdgeOptions = {
  type: "adventure",
  style: {
    stroke: "var(--editor-edge)",
    strokeWidth: 2,
  },
} satisfies DefaultEdgeOptions;
const editorThemeStyle = {
  "--editor-graph-bg": "#0b1020",
  "--editor-node-bg": "#162644",
  "--editor-node-border": "rgba(148,163,184,0.18)",
  "--editor-grid": "rgba(148,163,184,0.12)",
  "--editor-edge": "rgba(148,163,184,0.32)",
  "--editor-edge-bidirectional": "rgba(148,163,184,0.65)",
  "--editor-edge-selected": "var(--accent)",
  "--editor-edge-condition-bg": "rgba(226,232,240,0.9)",
  "--editor-edge-condition-border": "rgba(15,23,42,0.35)",
  "--editor-edge-condition-text": "#0f172a",
  "--editor-badge-media-bg": "rgba(56,189,248,0.18)",
  "--editor-badge-media-border": "rgba(56,189,248,0.35)",
  "--editor-badge-media-text": "#7dd3fc",
  "--editor-badge-flag-bg": "rgba(251,191,36,0.18)",
  "--editor-badge-flag-border": "rgba(251,191,36,0.35)",
  "--editor-badge-flag-text": "#fcd34d",
} as unknown as CSSProperties;

export function GraphCanvas({
  adventure,
  editSlug,
  editVersion,
  selection,
  onSelectionChange,
  onNodePositionsChange,
  onCreateLink,
  onCreateNodeWithLink,
  onDeleteNodes,
  onDeleteLinks,
  className,
}: GraphCanvasProps) {
  const [hudOpen, setHudOpen] = useState(true);
  const reactFlowRef = useRef<ReactFlowInstance<GraphNodeData, GraphEdgeData> | null>(
    null
  );
  const connectingNodeIdRef = useRef<number | null>(null);
  const nodesRef = useRef<Node<GraphNodeData>[]>([]);
  const edgesRef = useRef<Edge<GraphEdgeData>[]>([]);
  const nodesAdventureIdRef = useRef<number | null>(null);
  const edgesAdventureIdRef = useRef<number | null>(null);

  const nodeById = useMemo(() => {
    const map = new Map<number, AdventureModel["nodes"][number]>();
    adventure.nodes.forEach((node) => {
      map.set(node.nodeId, node);
    });
    return map;
  }, [adventure.nodes]);

  const linkById = useMemo(() => {
    const map = new Map<number, AdventureModel["links"][number]>();
    adventure.links.forEach((link) => {
      map.set(link.linkId, link);
    });
    return map;
  }, [adventure.links]);

  const selectedNode =
    selection.type === "node" ? nodeById.get(selection.nodeId) : undefined;
  const selectedLink =
    selection.type === "link" ? linkById.get(selection.linkId) : undefined;

  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNodeData>(
    buildGraphNodes(adventure.nodes, [])
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<GraphEdgeData>(
    buildGraphEdges(adventure.links, adventure.nodes, [])
  );

  useEffect(() => {
    const isNewAdventure = nodesAdventureIdRef.current !== adventure.id;
    nodesAdventureIdRef.current = adventure.id;
    setNodes((current) =>
      buildGraphNodes(adventure.nodes, isNewAdventure ? [] : current)
    );
  }, [adventure.id, adventure.nodes, setNodes]);

  useEffect(() => {
    const isNewAdventure = edgesAdventureIdRef.current !== adventure.id;
    edgesAdventureIdRef.current = adventure.id;
    setEdges((current) =>
      buildGraphEdges(adventure.links, adventure.nodes, isNewAdventure ? [] : current)
    );
  }, [adventure.id, adventure.links, adventure.nodes, setEdges]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const handleInit = useCallback(
    (instance: ReactFlowInstance<GraphNodeData, GraphEdgeData>) => {
      reactFlowRef.current = instance;
    },
    []
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: Node[]; edges: Edge[] }) => {
      const nodeIds = selectedNodes
        .map((node) => toNumericId(node.data?.nodeId ?? node.id))
        .filter((id): id is number => id !== null);
      const linkIds = selectedEdges
        .map((edge) => toNumericId(edge.data?.linkId ?? edge.id))
        .filter((id): id is number => id !== null);

      if (nodeIds.length) {
        onSelectionChange({ type: "node", nodeId: nodeIds[nodeIds.length - 1] });
        return;
      }
      if (linkIds.length) {
        onSelectionChange({ type: "link", linkId: linkIds[linkIds.length - 1] });
        return;
      }
      onSelectionChange({ type: "none" });
    },
    [onSelectionChange]
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const sourceId = toNumericId(connection.source);
      const targetId = toNumericId(connection.target);
      if (sourceId == null || targetId == null) return false;
      if (sourceId === targetId) return false;
      if (!nodeById.has(sourceId) || !nodeById.has(targetId)) return false;
      const exists = adventure.links.some(
        (link) =>
          (link.source === sourceId && link.target === targetId) ||
          (link.source === targetId && link.target === sourceId)
      );
      return !exists;
    },
    [adventure.links, nodeById]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection)) return;
      const sourceId = toNumericId(connection.source);
      const targetId = toNumericId(connection.target);
      if (sourceId == null || targetId == null) return;
      onCreateLink(sourceId, targetId);
    },
    [isValidConnection, onCreateLink]
  );

  const handleConnectStart = useCallback(
    (_event: unknown, params: OnConnectStartParams) => {
      if (params.handleType !== "source") {
        connectingNodeIdRef.current = null;
        return;
      }
      const nodeId = toNumericId(params.nodeId);
      connectingNodeIdRef.current = nodeId;
    },
    []
  );

  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const sourceId = connectingNodeIdRef.current;
      connectingNodeIdRef.current = null;
      if (sourceId == null) return;
      const target = event.target as Element | null;
      if (!target || !target.classList.contains("react-flow__pane")) {
        return;
      }
      const instance = reactFlowRef.current;
      if (!instance) return;
      const clientPosition = getEventClientPosition(event);
      if (!clientPosition) return;
      const position = instance.screenToFlowPosition(clientPosition);
      onCreateNodeWithLink(sourceId, position);
    },
    [onCreateNodeWithLink]
  );

  const handleNodeDragStop = useCallback(
    (_event: unknown, node: Node<GraphNodeData>, nodesAtStop?: Node[]) => {
      if (nodesAtStop && nodesAtStop.length > 1) {
        return;
      }
      const nodeId = toNumericId(node.data?.nodeId ?? node.id);
      if (nodeId == null) return;
      onNodePositionsChange([{ nodeId, position: node.position }]);
    },
    [onNodePositionsChange]
  );

  const handleSelectionDragStop = useCallback(
    (_event: unknown, draggedNodes: Node[]) => {
      if (!draggedNodes.length) return;
      const updates = draggedNodes
        .map((node) => {
          const nodeId = toNumericId(node.data?.nodeId ?? node.id);
          if (nodeId == null) return null;
          return { nodeId, position: node.position };
        })
        .filter(
          (update): update is { nodeId: number; position: { x: number; y: number } } =>
            Boolean(update)
        );
      if (!updates.length) return;
      onNodePositionsChange(updates);
    },
    [onNodePositionsChange]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (isEditableTarget(event.target)) return;
      const selectedNodeIds = nodesRef.current
        .filter((node) => node.selected)
        .map((node) => toNumericId(node.data?.nodeId ?? node.id))
        .filter((id): id is number => id !== null);
      const selectedLinkIds = edgesRef.current
        .filter((edge) => edge.selected)
        .map((edge) => toNumericId(edge.data?.linkId ?? edge.id))
        .filter((id): id is number => id !== null);

      if (selectedNodeIds.length) {
        event.preventDefault();
        onDeleteNodes(selectedNodeIds);
        onSelectionChange({ type: "none" });
        return;
      }
      if (selectedLinkIds.length) {
        event.preventDefault();
        onDeleteLinks(selectedLinkIds);
        onSelectionChange({ type: "none" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDeleteLinks, onDeleteNodes, onSelectionChange]);

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-[var(--editor-graph-bg)]",
        className
      )}
      style={editorThemeStyle}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        nodesDraggable
        nodesConnectable
        edgesReconnectable={false}
        selectionOnDrag
        selectNodesOnDrag
        multiSelectionKeyCode={["Control", "Shift"]}
        deleteKeyCode={null}
        onInit={handleInit}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={handleSelectionChange}
        onNodeDragStop={handleNodeDragStop}
        onSelectionDragStop={handleSelectionDragStop}
        onConnect={handleConnect}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        isValidConnection={isValidConnection}
      >
        <Background color="var(--editor-grid)" gap={32} size={2.5} />
        <Controls position="bottom-right" />
      </ReactFlow>
      <div className="pointer-events-none absolute bottom-3 left-3 z-10">
        <div className="pointer-events-auto w-[240px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/90 text-[var(--text)] shadow-[0_12px_40px_-30px_rgba(0,0,0,0.8)] backdrop-blur">
          <button
            type="button"
            onClick={() => setHudOpen((open) => !open)}
            className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]"
          >
            <span>Debug HUD</span>
            <span className="text-[var(--text)]/70">
              {hudOpen ? "Hide" : "Show"}
            </span>
          </button>
          {hudOpen ? (
            <div className="space-y-3 border-t border-[var(--border)] px-3 py-3 text-xs text-[var(--text)]/90">
              <div className="space-y-1">
                <p className="uppercase tracking-[0.18em] text-[var(--muted)]">
                  Selection
                </p>
                <p>
                  Type:{" "}
                  <span className="font-semibold">
                    {selection.type === "none"
                      ? "Empty"
                      : selection.type === "node"
                        ? "Node"
                        : "Link"}
                  </span>
                </p>
                {selection.type === "none" ? (
                  <p className="text-[var(--muted)]">Nothing selected.</p>
                ) : null}
                {selection.type === "node" ? (
                  <div className="space-y-1">
                    <p>
                      node_id:{" "}
                      <span className="font-semibold">
                        {selection.nodeId}
                      </span>
                    </p>
                    <p>
                      title:{" "}
                      <span className="font-semibold">
                        {selectedNode?.title ?? "n/a"}
                      </span>
                    </p>
                    {selectedNode?.type ? (
                      <p>
                        node_type:{" "}
                        <span className="font-semibold">{selectedNode.type}</span>
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {selection.type === "link" ? (
                  <div className="space-y-1">
                    <p>
                      link_id:{" "}
                      <span className="font-semibold">
                        {selection.linkId}
                      </span>
                    </p>
                    <p>
                      source:{" "}
                      <span className="font-semibold">
                        {selectedLink?.source ?? "n/a"}
                      </span>
                    </p>
                    <p>
                      target:{" "}
                      <span className="font-semibold">
                        {selectedLink?.target ?? "n/a"}
                      </span>
                    </p>
                    {selectedLink?.label ? (
                      <p>
                        label:{" "}
                        <span className="font-semibold">
                          {selectedLink.label}
                        </span>
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="space-y-1 border-t border-[var(--border)] pt-3 text-[var(--muted)]">
                <p className="uppercase tracking-[0.18em]">Adventure</p>
                <p>
                  nodes: <span className="font-semibold">{adventure.nodes.length}</span>
                </p>
                <p>
                  links: <span className="font-semibold">{adventure.links.length}</span>
                </p>
                {editSlug ? (
                  <p>
                    edit slug: <span className="font-semibold">{editSlug}</span>
                  </p>
                ) : null}
                {typeof editVersion === "number" ? (
                  <p>
                    edit version:{" "}
                    <span className="font-semibold">{editVersion}</span>
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
