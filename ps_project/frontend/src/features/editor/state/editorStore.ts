import { create } from "zustand";
import { adventureOpsSlice } from "./slices/adventureOpsSlice";
import { clipboardSlice } from "./slices/clipboardSlice";
import { coreSlice } from "./slices/coreSlice";
import { historySlice } from "./slices/historySlice";
import { linkOpsSlice } from "./slices/linkOpsSlice";
import { nodeOpsSlice } from "./slices/nodeOpsSlice";
import { propsSlice } from "./slices/propsSlice";
import { selectionSlice } from "./slices/selectionSlice";
import type { EditorState } from "./types";

export type {
  EditorError,
  EditorNodeInspectorTab,
  EditorNodePositionUpdate,
  EditorSelection,
  EditorStatus,
  EditorToolPanel,
} from "./types";

export const useEditorStore = create<EditorState>()((...args) => ({
  ...coreSlice(...args),
  ...adventureOpsSlice(...args),
  ...selectionSlice(...args),
  ...nodeOpsSlice(...args),
  ...linkOpsSlice(...args),
  ...propsSlice(...args),
  ...clipboardSlice(...args),
  ...historySlice(...args),
}));

export const selectEditorStatus = (state: EditorState) => state.status;
export const selectEditorAdventure = (state: EditorState) => state.adventure;
export const selectEditorError = (state: EditorState) => state.error;
export const selectEditorDirty = (state: EditorState) => state.dirty;
export const selectEditorSaveStatus = (state: EditorState) => state.saveStatus;
export const selectEditorSaveError = (state: EditorState) => state.saveError;
export const selectEditorReadOnly = (state: EditorState) => state.readOnly;
export const selectEditorEditVersion = (state: EditorState) => state.editVersion;
export const selectEditorSelection = (state: EditorState) => state.selection;
export const selectEditorSelectionToolActive = (state: EditorState) =>
  state.selectionToolActive;
export const selectEditorToolPanel = (state: EditorState) => state.toolPanel;
export const selectEditorNodeInspectorTab = (state: EditorState) =>
  state.nodeInspectorTab;
export const selectEditorSelectedNodeIds = (state: EditorState) =>
  state.selectedNodeIds;
export const selectEditorSelectedLinkIds = (state: EditorState) =>
  state.selectedLinkIds;
export const selectEditorClipboard = (state: EditorState) => state.clipboard;
export const selectEditorUndoStack = (state: EditorState) => state.undoStack;
export const selectEditorViewportCenter = (state: EditorState) =>
  state.viewportCenter;
export const selectEditorFocusNodeId = (state: EditorState) => state.focusNodeId;
export const selectEditorMenuShortcutPickIndex = (state: EditorState) =>
  state.menuShortcutPickIndex;
