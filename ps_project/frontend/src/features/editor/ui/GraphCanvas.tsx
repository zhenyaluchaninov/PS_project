"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type DefaultEdgeOptions,
  type Edge,
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
};

type GraphEdgeData = {
  linkId: number;
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

    return {
      id: String(node.nodeId),
      type: "adventure",
      position,
      data: { label: node.title || `Node ${node.nodeId}`, nodeId: node.nodeId },
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
      return {
        id: String(link.linkId),
        source: String(link.source),
        target: String(link.target),
        data: { linkId: link.linkId },
        selected: existing?.selected ?? false,
      };
    });
}

function AdventureNode({ data, selected }: NodeProps<GraphNodeData>) {
  return (
    <div
      className={cn(
        "relative rounded-lg border px-3 py-2 text-xs shadow-sm",
        selected
          ? "border-[var(--accent)] bg-[var(--editor-node-bg)]"
          : "border-[var(--editor-node-border)] bg-[var(--editor-node-bg)]"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-2 w-2 border-2 border-[var(--editor-node-bg)] bg-[var(--text)]"
      />
      <div className="font-semibold text-[var(--text)]">{data.label}</div>
      <div className="text-[10px] text-[var(--muted)]">#{data.nodeId}</div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2 w-2 border-2 border-[var(--editor-node-bg)] bg-[var(--text)]"
      />
    </div>
  );
}

const nodeTypes = { adventure: AdventureNode };
const edgeTypes = {};
const defaultEdgeOptions = {
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
