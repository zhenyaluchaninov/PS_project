import type { StateCreator } from "zustand";
import type { EditorSelection, EditorState } from "../types";

type EditorSlice = StateCreator<EditorState, [], [], Partial<EditorState>>;

const normalizeSelectionIds = (ids: number[]): number[] =>
  [...new Set(ids)].sort((a, b) => a - b);

const arraysEqual = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
};

const selectionsEqual = (a: EditorSelection, b: EditorSelection): boolean => {
  if (a.type !== b.type) return false;
  if (a.type === "node" && b.type === "node") return a.nodeId === b.nodeId;
  if (a.type === "link" && b.type === "link") return a.linkId === b.linkId;
  return true;
};

export const selectionSlice: EditorSlice = (set) => ({
  selection: { type: "none" },
  selectionToolActive: false,
  selectedNodeIds: [],
  selectedLinkIds: [],
  setSelection: (selection) =>
    set((state) => (selectionsEqual(state.selection, selection) ? {} : { selection })),
  setSelectionToolActive: (selectionToolActive) => set({ selectionToolActive }),
  clearSelection: () =>
    set({
      selection: { type: "none" },
      selectedNodeIds: [],
      selectedLinkIds: [],
    }),
  setSelectionSnapshot: (nodeIds, linkIds) =>
    set((state) => {
      const normalizedNodes = normalizeSelectionIds(nodeIds);
      const normalizedLinks = normalizeSelectionIds(linkIds);
      if (
        arraysEqual(state.selectedNodeIds, normalizedNodes) &&
        arraysEqual(state.selectedLinkIds, normalizedLinks)
      ) {
        return {};
      }
      return {
        selectedNodeIds: normalizedNodes,
        selectedLinkIds: normalizedLinks,
      };
    }),
});
