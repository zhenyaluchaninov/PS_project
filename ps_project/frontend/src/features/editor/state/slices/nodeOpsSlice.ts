import type { StateCreator } from "zustand";
import { cloneRawProps, getNextLinkId, getNextNodeId } from "../helpers";
import type { EditorState } from "../types";
import { pushHistory } from "./historySlice";

type EditorSlice = StateCreator<EditorState, [], [], Partial<EditorState>>;

export const nodeOpsSlice: EditorSlice = (set, get) => ({
  updateNodeTitle: (nodeId, title) => {
    if (get().readOnly) return;
    set((state) => {
      if (!state.adventure) return {};
      const nodeIndex = state.adventure.nodes.findIndex(
        (node) => node.nodeId === nodeId
      );
      if (nodeIndex === -1) return {};
      const node = state.adventure.nodes[nodeIndex];
      if (node.title === title) return {};
      const nextNodes = [...state.adventure.nodes];
      nextNodes[nodeIndex] = { ...node, title, changed: true };
      return {
        adventure: { ...state.adventure, nodes: nextNodes },
        dirty: true,
        undoStack: pushHistory(state),
      };
    });
  },
  updateNodeText: (nodeId, text) => {
    if (get().readOnly) return;
    set((state) => {
      if (!state.adventure) return {};
      const nodeIndex = state.adventure.nodes.findIndex(
        (node) => node.nodeId === nodeId
      );
      if (nodeIndex === -1) return {};
      const node = state.adventure.nodes[nodeIndex];
      if (node.text === text) return {};
      const nextNodes = [...state.adventure.nodes];
      nextNodes[nodeIndex] = { ...node, text, changed: true };
      return {
        adventure: { ...state.adventure, nodes: nextNodes },
        dirty: true,
        undoStack: pushHistory(state),
      };
    });
  },
  updateNodeImageUrl: (nodeId, url) => {
    if (get().readOnly) return;
    set((state) => {
      if (!state.adventure) return {};
      const nodeIndex = state.adventure.nodes.findIndex(
        (node) => node.nodeId === nodeId
      );
      if (nodeIndex === -1) return {};
      const node = state.adventure.nodes[nodeIndex];
      const nextUrl = url ?? null;
      if (node.image.url === nextUrl) return {};
      const nextNodes = [...state.adventure.nodes];
      nextNodes[nodeIndex] = {
        ...node,
        image: { ...node.image, url: nextUrl },
        changed: true,
      };
      return {
        adventure: { ...state.adventure, nodes: nextNodes },
        dirty: true,
        undoStack: pushHistory(state),
      };
    });
  },
  updateNodePositions: (updates) => {
    if (get().readOnly) return;
    if (!updates.length) return;
    set((state) => {
      if (!state.adventure) return {};
      const updateMap = new Map(
        updates.map((update) => [update.nodeId, update.position])
      );
      let changed = false;
      const nodes = state.adventure.nodes.map((node) => {
        const nextPosition = updateMap.get(node.nodeId);
        if (!nextPosition) return node;
        if (
          node.position.x === nextPosition.x &&
          node.position.y === nextPosition.y
        ) {
          return node;
        }
        changed = true;
        return {
          ...node,
          position: { x: nextPosition.x, y: nextPosition.y },
          changed: true,
        };
      });
      if (!changed) return {};
      return {
        adventure: { ...state.adventure, nodes },
        dirty: true,
        undoStack: pushHistory(state),
      };
    });
  },
  addNodeWithLink: (sourceId, position) => {
    if (get().readOnly) return null;
    const adventure = get().adventure;
    if (!adventure) return null;
    const sourceExists = adventure.nodes.some((node) => node.nodeId === sourceId);
    if (!sourceExists) return null;
    const nextNodeId = getNextNodeId(adventure);
    const nextLinkId = getNextLinkId(adventure);
    const newNode = {
      id: 0,
      nodeId: nextNodeId,
      title: `#${nextNodeId}`,
      text: "",
      icon: null,
      position: { x: position.x, y: position.y },
      image: { url: null, id: null, layoutType: null },
      type: "default",
      changed: true,
      props: null,
      rawProps: null,
    };
    const newLink = {
      id: 0,
      linkId: nextLinkId,
      source: sourceId,
      sourceTitle: "",
      target: nextNodeId,
      targetTitle: "",
      fromNodeId: sourceId,
      toNodeId: nextNodeId,
      label: null,
      type: "default",
      changed: true,
      props: null,
    };
    set((state) => {
      if (!state.adventure) return {};
      return {
        adventure: {
          ...state.adventure,
          nodes: [...state.adventure.nodes, newNode],
          links: [...state.adventure.links, newLink],
        },
        dirty: true,
        undoStack: pushHistory(state),
      };
    });
    return { nodeId: nextNodeId, linkId: nextLinkId };
  },
  duplicateNode: (nodeId) => {
    if (get().readOnly) return null;
    const adventure = get().adventure;
    if (!adventure) return null;
    const sourceNode = adventure.nodes.find((node) => node.nodeId === nodeId);
    if (!sourceNode) return null;
    const nextNodeId = getNextNodeId(adventure);
    const clonedRawProps = cloneRawProps(sourceNode.rawProps);
    const offset = { x: 60, y: 60 };
    const newNode = {
      ...sourceNode,
      id: 0,
      nodeId: nextNodeId,
      position: {
        x: sourceNode.position.x + offset.x,
        y: sourceNode.position.y + offset.y,
      },
      image: { ...sourceNode.image },
      props: sourceNode.props ? { ...sourceNode.props } : null,
      rawProps: clonedRawProps,
      changed: true,
    };
    set((state) => {
      if (!state.adventure) return {};
      return {
        adventure: {
          ...state.adventure,
          nodes: [...state.adventure.nodes, newNode],
        },
        dirty: true,
        selection: { type: "node", nodeId: nextNodeId },
        selectedNodeIds: [nextNodeId],
        selectedLinkIds: [],
        undoStack: pushHistory(state),
      };
    });
    return nextNodeId;
  },
  removeSelection: (nodeIds, linkIds) => {
    if (get().readOnly) return;
    if (!nodeIds.length && !linkIds.length) return;
    set((state) => {
      if (!state.adventure) return {};
      const nodeIdSet = new Set(nodeIds);
      const linkIdSet = new Set(linkIds);
      const nodes = nodeIdSet.size
        ? state.adventure.nodes.filter((node) => !nodeIdSet.has(node.nodeId))
        : state.adventure.nodes;
      const removedLinkIds = new Set<number>();
      const links = state.adventure.links.filter((link) => {
        const remove =
          linkIdSet.has(link.linkId) ||
          nodeIdSet.has(link.source) ||
          nodeIdSet.has(link.target);
        if (remove) {
          removedLinkIds.add(link.linkId);
        }
        return !remove;
      });
      if (
        nodes.length === state.adventure.nodes.length &&
        links.length === state.adventure.links.length
      ) {
        return {};
      }
      let selection = state.selection;
      if (selection.type === "node" && nodeIdSet.has(selection.nodeId)) {
        selection = { type: "none" };
      } else if (selection.type === "link" && removedLinkIds.has(selection.linkId)) {
        selection = { type: "none" };
      }
      const selectedNodeIds = state.selectedNodeIds.filter(
        (id) => !nodeIdSet.has(id)
      );
      const selectedLinkIds = state.selectedLinkIds.filter(
        (id) => !removedLinkIds.has(id)
      );
      return {
        adventure: { ...state.adventure, nodes, links },
        dirty: true,
        selection,
        selectedNodeIds,
        selectedLinkIds,
        undoStack: pushHistory(state),
      };
    });
  },
  removeNodes: (nodeIds) => {
    if (get().readOnly) return;
    if (!nodeIds.length) return;
    set((state) => {
      if (!state.adventure) return {};
      const nodeIdSet = new Set(nodeIds);
      const nodes = state.adventure.nodes.filter(
        (node) => !nodeIdSet.has(node.nodeId)
      );
      if (nodes.length === state.adventure.nodes.length) {
        return {};
      }
      const removedLinkIds = new Set<number>();
      const links = state.adventure.links.filter((link) => {
        const remove = nodeIdSet.has(link.source) || nodeIdSet.has(link.target);
        if (remove) {
          removedLinkIds.add(link.linkId);
        }
        return !remove;
      });
      let selection = state.selection;
      if (selection.type === "node" && nodeIdSet.has(selection.nodeId)) {
        selection = { type: "none" };
      } else if (selection.type === "link" && removedLinkIds.has(selection.linkId)) {
        selection = { type: "none" };
      }
      const selectedNodeIds = state.selectedNodeIds.filter(
        (id) => !nodeIdSet.has(id)
      );
      const selectedLinkIds = state.selectedLinkIds.filter(
        (id) => !removedLinkIds.has(id)
      );
      return {
        adventure: { ...state.adventure, nodes, links },
        dirty: true,
        selection,
        selectedNodeIds,
        selectedLinkIds,
        undoStack: pushHistory(state),
      };
    });
  },
});
