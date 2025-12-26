import type { StateCreator } from "zustand";
import type { EditorHistoryEntry, EditorState } from "../types";

const MAX_UNDO_STACK = 60;

type EditorSlice = StateCreator<EditorState, [], [], Partial<EditorState>>;

export const createHistoryEntry = (state: EditorState): EditorHistoryEntry => ({
  nodes: state.adventure?.nodes ?? [],
  links: state.adventure?.links ?? [],
  selection: state.selection,
  selectedNodeIds: state.selectedNodeIds,
  selectedLinkIds: state.selectedLinkIds,
  dirty: state.dirty,
});

export const pushHistory = (state: EditorState): EditorHistoryEntry[] => {
  if (!state.adventure) return state.undoStack;
  const entry = createHistoryEntry(state);
  return [...state.undoStack, entry].slice(-MAX_UNDO_STACK);
};

export const historySlice: EditorSlice = (set) => ({
  undoStack: [],
  undo: () => {
    set((state) => {
      if (state.readOnly) return {};
      if (!state.adventure || state.undoStack.length === 0) return {};
      const undoStack = state.undoStack.slice(0, -1);
      const entry = state.undoStack[state.undoStack.length - 1];
      return {
        adventure: {
          ...state.adventure,
          nodes: entry.nodes,
          links: entry.links,
        },
        selection: entry.selection,
        selectedNodeIds: entry.selectedNodeIds,
        selectedLinkIds: entry.selectedLinkIds,
        dirty: entry.dirty,
        undoStack,
      };
    });
  },
});
