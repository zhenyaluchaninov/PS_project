"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type DefaultEdgeOptions,
  type Edge,
  type OnConnectStartParams,
  type ReactFlowInstance,
} from "@xyflow/react";
import type { AdventureModel } from "@/domain/models";
import type { EditorSelection } from "../../state/types";
import { cn } from "@/lib/utils";
import { ShortcutHud } from "../ShortcutHud";
import { EditorToolStrip } from "../EditorToolStrip";
import { PreviewOverlay, type PreviewPlayTrace } from "../PreviewOverlay";
import { AdventureEdge } from "./edges/AdventureEdge";
import { useGraphSelection } from "./hooks/useGraphSelection";
import { AdventureNode } from "./nodes/AdventureNode";
import { buildGraphEdges } from "./utils/buildGraphEdges";
import { buildGraphNodes } from "./utils/buildGraphNodes";
import {
  arraysEqual,
  getEventClientPosition,
  toNumericId,
} from "./utils/graphHelpers";
import type { GraphEdge, GraphNode, PlayTraceState } from "./types";

type GraphCanvasProps = {
  adventure: AdventureModel;
  editSlug?: string;
  editVersion?: number | null;
  selection: EditorSelection;
  selectedNodeIds: number[];
  selectedLinkIds: number[];
  selectionToolActive: boolean;
  onSelectionToolActiveChange: (active: boolean) => void;
  onSelectionChange: (selection: EditorSelection) => void;
  onSelectionSnapshotChange: (nodeIds: number[], linkIds: number[]) => void;
  onViewportCenterChange: (center: { x: number; y: number }) => void;
  focusNodeId: number | null;
  onFocusNodeHandled: () => void;
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
  selectionToolActive,
  onSelectionToolActiveChange,
  onSelectionChange,
  onSelectionSnapshotChange,
  onViewportCenterChange,
  focusNodeId,
  onFocusNodeHandled,
  onNodePositionsChange,
  onCreateLink,
  onCreateNodeWithLink,
  className,
}: GraphCanvasProps) {
  const [hudOpen, setHudOpen] = useState(true);
  const [previewTrace, setPreviewTrace] = useState<PreviewPlayTrace>({
    nodeIds: [],
    linkIds: [],
    currentNodeId: null,
    currentLinkId: null,
  });
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
    buildGraphEdges(adventure.links, adventure.nodes, [], !selectionToolActive)
  );

  const { handleSelectionChange } = useGraphSelection({
    selection,
    selectedNodeIds,
    selectedLinkIds,
    selectionToolActive,
    onSelectionChange,
    onSelectionSnapshotChange,
    setNodes,
    setEdges,
  });

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
      buildGraphEdges(
        adventure.links,
        adventure.nodes,
        isNewAdventure ? [] : current,
        !selectionToolActive
      )
    );
  }, [adventure.id, adventure.links, adventure.nodes, selectionToolActive, setEdges]);

  const handlePreviewTraceChange = useCallback((next: PreviewPlayTrace) => {
    setPreviewTrace((prev) => {
      if (
        prev.currentNodeId === next.currentNodeId &&
        prev.currentLinkId === next.currentLinkId &&
        arraysEqual(prev.nodeIds, next.nodeIds) &&
        arraysEqual(prev.linkIds, next.linkIds)
      ) {
        return prev;
      }
      return next;
    });
  }, []);

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
    const nodeIdSet = new Set(previewTrace.nodeIds);
    const linkIdSet = new Set(previewTrace.linkIds);
    const currentNodeId = previewTrace.currentNodeId;
    const currentLinkId = previewTrace.currentLinkId;

    setNodes((current) => {
      let changed = false;
      const next = current.map((node) => {
        const nodeId = toNumericId(node.data?.nodeId ?? node.id);
        const nextPlayState: PlayTraceState =
          nodeId != null && currentNodeId != null && nodeId === currentNodeId
            ? "current"
            : nodeId != null && nodeIdSet.has(nodeId)
              ? "visited"
              : null;
        if (node.data?.playState === nextPlayState) return node;
        changed = true;
        return { ...node, data: { ...node.data, playState: nextPlayState } };
      });
      return changed ? next : current;
    });

    setEdges((current) => {
      let changed = false;
      const next = current.map((edge) => {
        const linkId = toNumericId(edge.data?.linkId ?? edge.id);
        const nextPlayState: PlayTraceState =
          linkId != null && currentLinkId != null && linkId === currentLinkId
            ? "current"
            : linkId != null && linkIdSet.has(linkId)
              ? "visited"
              : null;
        if (edge.data?.playState === nextPlayState) return edge;
        changed = true;
        return { ...edge, data: { ...edge.data, playState: nextPlayState } };
      });
      return changed ? next : current;
    });
  }, [
    adventure.links,
    adventure.nodes,
    previewTrace.currentLinkId,
    previewTrace.currentNodeId,
    previewTrace.linkIds,
    previewTrace.nodeIds,
    setEdges,
    setNodes,
  ]);

  useEffect(() => {
    if (focusNodeId == null) return;
    const instance = reactFlowRef.current;
    if (!instance) return;

    const attemptFocus = (remaining: number) => {
      const target = nodes.find(
        (node) => toNumericId(node.data?.nodeId ?? node.id) === focusNodeId
      );
      if (!target) {
        if (remaining > 0) {
          requestAnimationFrame(() => attemptFocus(remaining - 1));
        } else {
          onFocusNodeHandled();
        }
        return;
      }
      instance.fitView({
        nodes: [target],
        padding: 0.35,
        duration: 320,
        maxZoom: 1.4,
      });
      onSelectionSnapshotChange([focusNodeId], []);
      onSelectionChange({ type: "node", nodeId: focusNodeId });
      onFocusNodeHandled();
    };

    attemptFocus(2);
  }, [
    focusNodeId,
    nodes,
    onFocusNodeHandled,
    onSelectionChange,
    onSelectionSnapshotChange,
  ]);

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
        elementsSelectable
        selectionOnDrag={selectionToolActive}
        selectNodesOnDrag={selectionToolActive}
        selectionKeyCode={null}
        panOnDrag={selectionToolActive ? [1, 2] : true}
        multiSelectionKeyCode={["Control", "Shift"]}
        deleteKeyCode={null}
        onInit={handleInit}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={handleSelectionChange}
        onSelectionEnd={() => {
          if (selectionToolActive) {
            onSelectionToolActiveChange(false);
          }
        }}
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
      <div className="absolute inset-y-0 left-0 z-20">
        <EditorToolStrip adventure={adventure} />
      </div>
      <div className="absolute bottom-3 left-[60px] z-10 flex flex-col gap-2">
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
      <PreviewOverlay
        adventure={adventure}
        selectedNode={selectedNode}
        containerRef={containerRef}
        onPlayTraceChange={handlePreviewTraceChange}
      />
    </div>
  );
}
