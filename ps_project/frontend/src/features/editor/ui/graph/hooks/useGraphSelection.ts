import {
  useCallback,
  useLayoutEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { EditorSelection } from "../../../state/types";
import type { GraphEdge, GraphNode } from "../types";
import { arraysEqual, toNumericId } from "../utils/graphHelpers";

type GraphSetter<T> = Dispatch<SetStateAction<T>>;

type UseGraphSelectionParams = {
  selection: EditorSelection;
  selectedNodeIds: number[];
  selectedLinkIds: number[];
  selectionToolActive: boolean;
  onSelectionChange: (selection: EditorSelection) => void;
  onSelectionSnapshotChange: (nodeIds: number[], linkIds: number[]) => void;
  setNodes: GraphSetter<GraphNode[]>;
  setEdges: GraphSetter<GraphEdge[]>;
};

const normalizeIds = (ids: number[]): number[] => [...ids].sort((a, b) => a - b);

const deriveSelection = (
  currentSelection: EditorSelection,
  nodeIds: number[],
  linkIds: number[]
): EditorSelection => {
  if (nodeIds.length) {
    if (
      currentSelection.type === "node" &&
      nodeIds.includes(currentSelection.nodeId)
    ) {
      return currentSelection;
    }
    return { type: "node", nodeId: nodeIds[nodeIds.length - 1] };
  }
  if (linkIds.length) {
    if (
      currentSelection.type === "link" &&
      linkIds.includes(currentSelection.linkId)
    ) {
      return currentSelection;
    }
    return { type: "link", linkId: linkIds[linkIds.length - 1] };
  }
  return { type: "none" };
};

const selectionsEqual = (a: EditorSelection, b: EditorSelection): boolean => {
  if (a.type !== b.type) return false;
  if (a.type === "node" && b.type === "node") return a.nodeId === b.nodeId;
  if (a.type === "link" && b.type === "link") return a.linkId === b.linkId;
  return true;
};

export function useGraphSelection({
  selection,
  selectedNodeIds,
  selectedLinkIds,
  selectionToolActive,
  onSelectionChange,
  onSelectionSnapshotChange,
  setNodes,
  setEdges,
}: UseGraphSelectionParams) {
  const suppressSelectionChangeRef = useRef(false);
  const selectionSourceRef = useRef<"reactflow" | "store" | null>(null);

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: GraphNode[]; edges: GraphEdge[] }) => {
      if (selectionSourceRef.current === "store") {
        return;
      }
      if (suppressSelectionChangeRef.current) {
        return;
      }
      const nodeIds = normalizeIds(
        selectedNodes
          .map((node) => toNumericId(node.data?.nodeId ?? node.id))
          .filter((id): id is number => id !== null)
      );
      const linkIds = normalizeIds(
        selectedEdges
          .map((edge) => toNumericId(edge.data?.linkId ?? edge.id))
          .filter((id): id is number => id !== null)
      );
      const effectiveLinkIds = selectionToolActive ? [] : linkIds;
      const nextSelection = deriveSelection(selection, nodeIds, effectiveLinkIds);
      const currentNodeIds = normalizeIds(selectedNodeIds);
      const currentLinkIds = normalizeIds(selectedLinkIds);
      const selectionUnchanged =
        arraysEqual(nodeIds, currentNodeIds) &&
        arraysEqual(effectiveLinkIds, currentLinkIds) &&
        selectionsEqual(selection, nextSelection);

      if (selectionUnchanged) {
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        console.debug("[Graph] selection change from ReactFlow", {
          nodeIds,
          linkIds: effectiveLinkIds,
          nextSelection,
          prevSelection: selection,
          storeSelectedNodeIds: selectedNodeIds,
          storeSelectedLinkIds: selectedLinkIds,
          selectionToolActive,
        });
      }

      selectionSourceRef.current = "reactflow";
      onSelectionSnapshotChange(nodeIds, effectiveLinkIds);
      onSelectionChange(nextSelection);
    },
    [
      onSelectionChange,
      onSelectionSnapshotChange,
      selection,
      selectedLinkIds,
      selectedNodeIds,
      selectionToolActive,
    ]
  );

  useLayoutEffect(() => {
    if (selectionSourceRef.current === "reactflow") {
      selectionSourceRef.current = null;
      return;
    }
    const nodeIdSet = new Set(selectedNodeIds);
    const linkIdSet = new Set(selectedLinkIds);
    selectionSourceRef.current = "store";
    suppressSelectionChangeRef.current = true;

    setNodes((current) => {
      let changed = false;
      const next = current.map((node) => {
        const nodeId = toNumericId(node.data?.nodeId ?? node.id);
        const shouldSelect = nodeId != null && nodeIdSet.has(nodeId);
        if (node.selected === shouldSelect) return node;
        changed = true;
        return { ...node, selected: shouldSelect };
      });
      return changed ? next : current;
    });

    setEdges((current) => {
      let changed = false;
      const next = current.map((edge) => {
        const linkId = toNumericId(edge.data?.linkId ?? edge.id);
        const shouldSelect = linkId != null && linkIdSet.has(linkId);
        if (edge.selected === shouldSelect) return edge;
        changed = true;
        return { ...edge, selected: shouldSelect };
      });
      return changed ? next : current;
    });

    if (process.env.NODE_ENV !== "production") {
      console.debug("[Graph] applying store selection to ReactFlow", {
        selectedNodeIds,
        selectedLinkIds,
      });
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        suppressSelectionChangeRef.current = false;
        if (selectionSourceRef.current === "store") {
          selectionSourceRef.current = null;
        }
      });
    });
  }, [selectedLinkIds, selectedNodeIds, setEdges, setNodes]);

  return { handleSelectionChange };
}
