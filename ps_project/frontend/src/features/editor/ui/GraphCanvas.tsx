"use client";

import { useMemo, useState } from "react";
import ReactFlow, { Background, Controls, type Edge, type Node } from "reactflow";
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
  className?: string;
};

type NodePosition = { x: number; y: number };

function buildFallbackPositions(nodes: AdventureModel["nodes"]): Map<number, NodePosition> {
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

export function GraphCanvas({
  adventure,
  editSlug,
  editVersion,
  selection,
  onSelectionChange,
  className,
}: GraphCanvasProps) {
  const [hudOpen, setHudOpen] = useState(true);

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

  const nodes = useMemo(() => {
    const hasPosition = adventure.nodes.some(
      (node) => node.position.x !== 0 || node.position.y !== 0
    );
    const fallbackPositions = hasPosition
      ? new Map<number, NodePosition>()
      : buildFallbackPositions(adventure.nodes);

    return adventure.nodes.map((node) => {
      const position = hasPosition
        ? node.position
        : fallbackPositions.get(node.nodeId) ?? { x: 0, y: 0 };

      return {
        id: String(node.nodeId),
        position,
        data: { label: node.title || `Node ${node.nodeId}`, nodeId: node.nodeId },
        selected: selection.type === "node" && selection.nodeId === node.nodeId,
        draggable: false,
      } satisfies Node<GraphNodeData>;
    });
  }, [adventure.nodes, selection]);

  const edges = useMemo(() => {
    const nodeIds = new Set(adventure.nodes.map((node) => String(node.nodeId)));

    return adventure.links
      .filter(
        (link) =>
          nodeIds.has(String(link.source)) && nodeIds.has(String(link.target))
      )
      .map((link) => {
        return {
          id: String(link.linkId),
          source: String(link.source),
          target: String(link.target),
          data: { linkId: link.linkId },
          selected: selection.type === "link" && selection.linkId === link.linkId,
        } satisfies Edge<GraphEdgeData>;
      });
  }, [adventure.links, adventure.nodes, selection]);

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-[var(--surface-2)]",
        className
      )}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        edgesUpdatable={false}
        selectionOnDrag={false}
        selectNodesOnDrag={false}
        onNodeClick={(event, node) => {
          event.stopPropagation();
          onSelectionChange({ type: "node", nodeId: node.data.nodeId });
        }}
        onEdgeClick={(event, edge) => {
          event.stopPropagation();
          const linkId = edge.data?.linkId ?? Number(edge.id);
          if (Number.isFinite(linkId)) {
            onSelectionChange({ type: "link", linkId });
          }
        }}
        onPaneClick={() => onSelectionChange({ type: "none" })}
      >
        <Background color="var(--border)" gap={24} />
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
