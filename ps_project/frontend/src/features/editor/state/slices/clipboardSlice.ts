import type { StateCreator } from "zustand";
import { cloneRawProps, getNextNodeId } from "../helpers";
import type { ClipboardNode, EditorState } from "../types";
import { pushHistory } from "./historySlice";

type EditorSlice = StateCreator<EditorState, [], [], Partial<EditorState>>;

export const clipboardSlice: EditorSlice = (set, get) => ({
  clipboard: null,
  copySelection: () => {
    const { adventure, selectedNodeIds } = get();
    if (!adventure || selectedNodeIds.length === 0) return;
    const nodes = adventure.nodes.filter((node) =>
      selectedNodeIds.includes(node.nodeId)
    );
    if (!nodes.length) return;
    const minX = Math.min(...nodes.map((node) => node.position.x));
    const minY = Math.min(...nodes.map((node) => node.position.y));
    const maxX = Math.max(...nodes.map((node) => node.position.x));
    const maxY = Math.max(...nodes.map((node) => node.position.y));
    const clipboardNodes: ClipboardNode[] = nodes.map((node) => ({
      title: node.title,
      text: node.text,
      icon: node.icon ?? null,
      position: {
        x: node.position.x - minX,
        y: node.position.y - minY,
      },
      image: { ...node.image },
      type: node.type ?? null,
      props: node.props ? { ...node.props } : null,
      rawProps: cloneRawProps(node.rawProps),
    }));
    set({
      clipboard: {
        nodes: clipboardNodes,
        bounds: { width: maxX - minX, height: maxY - minY },
      },
    });
  },
  pasteClipboard: (target) => {
    if (get().readOnly) return [];
    const { adventure, clipboard } = get();
    if (!adventure || !clipboard || clipboard.nodes.length === 0) return [];
    let createdIds: number[] = [];
    set((state) => {
      if (!state.adventure || !state.clipboard) return {};
      const { nodes: clipNodes, bounds } = state.clipboard;
      if (!clipNodes.length) return {};
      let nextNodeId = getNextNodeId(state.adventure);
      const offsetX = target.x - bounds.width / 2;
      const offsetY = target.y - bounds.height / 2;
      const newNodes = clipNodes.map((node) => {
        const nodeId = nextNodeId;
        nextNodeId += 1;
        return {
          id: 0,
          nodeId,
          title: node.title,
          text: node.text,
          icon: node.icon ?? null,
          position: {
            x: node.position.x + offsetX,
            y: node.position.y + offsetY,
          },
          image: { ...node.image },
          type: node.type ?? null,
          changed: true,
          props: node.props ? { ...node.props } : null,
          rawProps: cloneRawProps(node.rawProps),
        };
      });
      createdIds = newNodes.map((node) => node.nodeId);
      return {
        adventure: {
          ...state.adventure,
          nodes: [...state.adventure.nodes, ...newNodes],
        },
        dirty: true,
        selection: { type: "node", nodeId: createdIds[createdIds.length - 1] },
        selectedNodeIds: createdIds,
        selectedLinkIds: [],
        undoStack: pushHistory(state),
      };
    });
    return createdIds;
  },
});
