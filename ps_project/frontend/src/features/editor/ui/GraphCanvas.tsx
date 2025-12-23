"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
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
import {
  Activity,
  BarChart3,
  BookOpen,
  Bookmark,
  ExternalLink,
  FileText,
  FunctionSquare,
  Film,
  GitBranch,
  Headphones,
  Image as ImageIcon,
  Link as LinkIcon,
  Music,
  PlayCircle,
  Shuffle,
  type LucideIcon,
} from "lucide-react";
import type { AdventureModel } from "@/domain/models";
import type { EditorSelection } from "../state/editorStore";
import { cn } from "@/lib/utils";
import { ShortcutHud } from "./ShortcutHud";

type GraphNodeData = {
  label: string;
  nodeId: number;
  chapterType: string | null;
  variant: NodeVariant;
  badges: Array<{ key: string; label: string; tone: "flag" | "media" }>;
};

type GraphEdgeData = {
  linkId: number;
  isBidirectional: boolean;
  hasConditions: boolean;
};

type GraphNode = Node<GraphNodeData>;
type GraphEdge = Edge<GraphEdgeData>;

type GraphCanvasProps = {
  adventure: AdventureModel;
  editSlug?: string;
  editVersion?: number | null;
  selection: EditorSelection;
  selectedNodeIds: number[];
  selectedLinkIds: number[];
  onSelectionChange: (selection: EditorSelection) => void;
  onSelectionSnapshotChange: (nodeIds: number[], linkIds: number[]) => void;
  onViewportCenterChange: (center: { x: number; y: number }) => void;
  onNodePositionsChange: (
    updates: Array<{ nodeId: number; position: { x: number; y: number } }>
  ) => void;
  onCreateLink: (sourceId: number, targetId: number) => number | null;
  onCreateNodeWithLink: (
    sourceId: number,
    position: { x: number; y: number }
  ) => { nodeId: number; linkId: number } | null;
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

const nodeTypeIcons: Record<NodeVariant, LucideIcon> = {
  start: PlayCircle,
  chapter: BookOpen,
  "chapter-plain": Bookmark,
  ref: LinkIcon,
  "ref-tab": ExternalLink,
  random: Shuffle,
  video: Film,
  audio: Headphones,
  default: FileText,
};

const badgeIcons: Record<string, LucideIcon> = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  stats: BarChart3,
  "node-variable": FunctionSquare,
};

function readCssColor(variableName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
  return value || fallback;
}

function buildFallbackPositions(
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

function isFlagEnabled(value: unknown): boolean {
  const entries = readStringArray(value);
  if (entries.length) {
    return entries.some((entry) => isTruthyFlag(entry));
  }
  return isTruthyFlag(value);
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
    if (isFlagEnabled(rawProps[key])) return true;
  }
  for (const [key, value] of Object.entries(rawProps)) {
    if (/statistics/i.test(key) && isFlagEnabled(value)) {
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
    if (isFlagEnabled(rawProps[key])) return true;
  }
  for (const [key, value] of Object.entries(rawProps)) {
    if (/node.*condition/i.test(key) && isFlagEnabled(value)) {
      return true;
    }
    if (/node.*variable/i.test(key) && isFlagEnabled(value)) {
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

function buildGraphNodes(
  nodes: AdventureModel["nodes"],
  existingNodes: GraphNode[]
): GraphNode[] {
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
    const hasStatistics = hasStatisticsFlag(node.rawProps);
    const hasNodeVariable = hasNodeVariableFlag(node.rawProps);
    const hasImage = Boolean(node.image.url || node.image.id);
    const hasAudio = Boolean(node.props?.audioUrl || node.props?.audioUrlAlt);
    const hasVideo = Boolean(node.props?.subtitlesUrl) || chapterType === "videoplayer-node";
    const badges: GraphNodeData["badges"] = [];

    if (hasStatistics) {
      badges.push({ key: "stats", label: "STAT", tone: "flag" });
    }
    if (hasNodeVariable) {
      badges.push({ key: "node-variable", label: "VAR", tone: "flag" });
    }
    if (hasVideo) {
      badges.push({ key: "video", label: "VID", tone: "media" });
    } else if (hasImage) {
      badges.push({ key: "image", label: "IMG", tone: "media" });
    }
    if (hasAudio) {
      badges.push({ key: "audio", label: "AUD", tone: "media" });
    }

    return {
      id: String(node.nodeId),
      type: "adventure",
      position,
      data: {
        label: node.title || `Node ${node.nodeId}`,
        nodeId: node.nodeId,
        chapterType,
        variant,
        badges,
      },
      selected: existing?.selected ?? false,
    };
  });
}

function buildGraphEdges(
  links: AdventureModel["links"],
  nodes: AdventureModel["nodes"],
  existingEdges: GraphEdge[]
): GraphEdge[] {
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
      return {
        id: String(link.linkId),
        source: String(link.source),
        target: String(link.target),
        type: "adventure",
        data: { linkId: link.linkId, isBidirectional, hasConditions },
        selected: existing?.selected ?? false,
      };
    });
}

function AdventureNode({ data, selected }: NodeProps<GraphNode>) {
  const flagBadges = data.badges
    .filter((badge) => badge.tone === "flag")
    .sort((a, b) => {
      if (a.key === b.key) return 0;
      if (a.key === "stats") return 1;
      if (b.key === "stats") return -1;
      return a.key.localeCompare(b.key);
    });
  const mediaBadges = data.badges.filter((badge) => badge.tone === "media");
  const isStart = data.variant === "start";
  const NodeTypeIcon = nodeTypeIcons[data.variant] ?? FileText;

  return (
    <div
      className={cn(
        "relative min-w-[160px] max-w-[240px] w-fit rounded-lg border transition-all duration-150",
        isStart
          ? "border-[var(--editor-node-start-border)] shadow-[0_0_20px_-16px_var(--editor-node-start-border)]"
          : "border-[var(--editor-node-border)]",
        selected
          ? "border-[var(--editor-edge-selected)] shadow-[0_0_0_2.2px_var(--editor-edge-selected)]"
          : isStart
            ? "hover:border-[var(--success)]"
            : "hover:border-[var(--border-light)]"
      )}
    >
      <div
        className={cn(
          "flex items-center rounded-t-lg border-b px-3 py-1.5",
          isStart
            ? "border-[var(--editor-node-start-border)] bg-[var(--editor-node-start-header-bg)]"
            : "border-[var(--editor-node-border)] bg-[var(--bg-tertiary)]"
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md border",
            isStart
              ? "border-[var(--editor-node-start-border)] bg-[var(--editor-node-start-bg)] text-[var(--success)]"
              : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--warning)]"
          )}
        >
          <NodeTypeIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        {flagBadges.length > 0 ? (
          <div className="ml-auto flex items-center gap-1">
            {flagBadges.map((badge) => {
              const BadgeIcon = badgeIcons[badge.key] ?? FileText;
              return (
                <span
                  key={badge.key}
                  title={badge.label}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--muted)]"
                >
                  <BadgeIcon className="h-4 w-4" aria-hidden="true" />
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "flex min-h-[64px] items-center justify-center px-4 py-3 w-full",
          isStart ? "bg-[var(--editor-node-start-bg)]" : "bg-[var(--editor-node-bg)]"
        )}
      >
        <div className="w-full break-words whitespace-normal text-center text-[15px] font-semibold leading-snug text-[var(--text)]">
          {data.label}
        </div>
      </div>

      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-b-lg border-t px-3 py-1.5",
          isStart
            ? "border-[var(--editor-node-start-border)] bg-[var(--editor-node-start-bg)]"
            : "border-[var(--border)] bg-[var(--editor-node-bg)]"
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {mediaBadges.map((badge) => {
            const BadgeIcon = badgeIcons[badge.key] ?? FileText;
            return (
              <span key={badge.key} title={badge.label}>
                <BadgeIcon
                  className={cn("h-4 w-4 text-[var(--accent)]")}
                  aria-hidden="true"
                />
              </span>
            );
          })}
        </div>
        <div className="shrink-0 font-mono text-xs text-[var(--muted)]">#{data.nodeId}</div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-2 !border-[var(--border)] !bg-[var(--bg-tertiary)]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-2 !border-[var(--border)] !bg-[var(--bg-tertiary)]"
      />
    </div>
  );
}

function AdventureEdge({
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
  const stroke = selected
    ? "var(--editor-edge-selected)"
    : isBidirectional
      ? "var(--editor-edge-bidirectional)"
      : "var(--editor-edge)";
  const markerColor = selected
    ? readCssColor("--accent", "#d08770")
    : readCssColor("--border-light", "#5c6678");
  const markerId = `edge-arrow-${id}${isBidirectional ? "-bi" : ""}-${selected ? "on" : "off"}`;
  const markerUrl = `url(#${markerId})`;
  const edgeStyle = {
    ...style,
    stroke,
    strokeWidth: selected ? 3.2 : 2.4,
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

const nodeTypes = { adventure: AdventureNode };
const edgeTypes = { adventure: AdventureEdge };
const defaultEdgeOptions = {
  type: "adventure",
  style: {
    stroke: "var(--editor-edge)",
    strokeWidth: 2.4,
  },
} satisfies DefaultEdgeOptions;

export function GraphCanvas({
  adventure,
  editSlug,
  editVersion,
  selection,
  selectedNodeIds,
  selectedLinkIds,
  onSelectionChange,
  onSelectionSnapshotChange,
  onViewportCenterChange,
  onNodePositionsChange,
  onCreateLink,
  onCreateNodeWithLink,
  className,
}: GraphCanvasProps) {
  const [hudOpen, setHudOpen] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reactFlowRef = useRef<ReactFlowInstance<GraphNode, GraphEdge> | null>(
    null
  );
  const connectingNodeIdRef = useRef<number | null>(null);
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

  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNode>(
    buildGraphNodes(adventure.nodes, [])
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<GraphEdge>(
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

  const reportViewportCenter = useCallback(() => {
    const instance = reactFlowRef.current;
    const container = containerRef.current;
    if (!instance || !container) return;
    const rect = container.getBoundingClientRect();
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    onViewportCenterChange(instance.screenToFlowPosition(center));
  }, [onViewportCenterChange]);

  const handleInit = useCallback(
    (instance: ReactFlowInstance<GraphNode, GraphEdge>) => {
      reactFlowRef.current = instance;
      requestAnimationFrame(() => {
        reportViewportCenter();
      });
    },
    [reportViewportCenter]
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: GraphNode[]; edges: GraphEdge[] }) => {
      const nodeIds = selectedNodes
        .map((node) => toNumericId(node.data?.nodeId ?? node.id))
        .filter((id): id is number => id !== null);
      const linkIds = selectedEdges
        .map((edge) => toNumericId(edge.data?.linkId ?? edge.id))
        .filter((id): id is number => id !== null);

      onSelectionSnapshotChange(nodeIds, linkIds);

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
    [onSelectionChange, onSelectionSnapshotChange]
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
    (_event: unknown, node: GraphNode, nodesAtStop?: GraphNode[]) => {
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
    (_event: unknown, draggedNodes: GraphNode[]) => {
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
    if (!reactFlowRef.current) return;
    reportViewportCenter();
  }, [reportViewportCenter, adventure.id]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      reportViewportCenter();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [reportViewportCenter]);

  useEffect(() => {
    const nodeIdSet = new Set(selectedNodeIds);
    setNodes((current) =>
      current.map((node) => {
        const nodeId = toNumericId(node.data?.nodeId ?? node.id);
        const shouldSelect = nodeId != null && nodeIdSet.has(nodeId);
        return node.selected === shouldSelect ? node : { ...node, selected: shouldSelect };
      })
    );
  }, [selectedNodeIds, setNodes]);

  useEffect(() => {
    const linkIdSet = new Set(selectedLinkIds);
    setEdges((current) =>
      current.map((edge) => {
        const linkId = toNumericId(edge.data?.linkId ?? edge.id);
        const shouldSelect = linkId != null && linkIdSet.has(linkId);
        return edge.selected === shouldSelect ? edge : { ...edge, selected: shouldSelect };
      })
    );
  }, [selectedLinkIds, setEdges]);

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-[var(--editor-graph-bg)]",
        className
      )}
      ref={containerRef}
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
        onMoveEnd={reportViewportCenter}
        isValidConnection={isValidConnection}
      >
        <Background color="var(--editor-edge)" gap={36} size={3} variant={BackgroundVariant.Dots} />
        <Controls position="bottom-right" />
      </ReactFlow>
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-2">
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
        <ShortcutHud />
      </div>
    </div>
  );
}
