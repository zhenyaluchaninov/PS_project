import type { AdventureModel, CategoryModel } from "@/domain/models";
import type { PropPathOptions, StringArraySelectOptions } from "./propsEditing";

export type EditorStatus = "idle" | "loading" | "ready" | "error";
export type EditorSaveStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error"
  | "locked";

export type EditorError = {
  message: string;
  status?: number;
  details?: unknown;
  url?: string;
};

export type EditorSelection =
  | { type: "none" }
  | { type: "node"; nodeId: number }
  | { type: "link"; linkId: number };

export type EditorToolPanel = "search" | "diagnostics" | null;

export type EditorNodeInspectorTab =
  | "content"
  | "style"
  | "buttons"
  | "logic"
  | "anim";

export type EditorNodePositionUpdate = {
  nodeId: number;
  position: { x: number; y: number };
};

export type ClipboardNode = {
  title: string;
  text: string;
  icon?: string | null;
  position: { x: number; y: number };
  image: AdventureModel["nodes"][number]["image"];
  type: string | null;
  props: AdventureModel["nodes"][number]["props"];
  rawProps: Record<string, unknown> | null;
};

export type EditorClipboard = {
  nodes: ClipboardNode[];
  bounds: { width: number; height: number };
};

export type EditorHistoryEntry = {
  nodes: AdventureModel["nodes"];
  links: AdventureModel["links"];
  selection: EditorSelection;
  selectedNodeIds: number[];
  selectedLinkIds: number[];
  dirty: boolean;
};

export type EditorState = {
  status: EditorStatus;
  error?: EditorError;
  editSlug?: string;
  adventure?: AdventureModel;
  editVersion?: number;
  dirty: boolean;
  liveUpdateCount: number;
  interactionLockCount: number;
  saveStatus: EditorSaveStatus;
  saveError?: string | null;
  readOnly: boolean;
  selection: EditorSelection;
  selectionToolActive: boolean;
  toolPanel: EditorToolPanel;
  nodeInspectorTab: EditorNodeInspectorTab;
  selectedNodeIds: number[];
  selectedLinkIds: number[];
  clipboard: EditorClipboard | null;
  undoStack: EditorHistoryEntry[];
  viewportCenter: { x: number; y: number } | null;
  focusNodeId: number | null;
  menuShortcutPickIndex: number | null;
  loadByEditSlug: (editSlug: string) => Promise<void>;
  reset: () => void;
  markDirty: () => void;
  clearDirty: () => void;
  beginLiveUpdate: () => void;
  endLiveUpdate: () => void;
  beginInteractionLock: () => void;
  endInteractionLock: () => void;
  setSaveStatus: (status: EditorSaveStatus, error?: string | null) => void;
  setSaveError: (error?: string | null) => void;
  setReadOnly: (readOnly: boolean) => void;
  setSelection: (selection: EditorSelection) => void;
  setSelectionToolActive: (active: boolean) => void;
  setToolPanel: (panel: EditorToolPanel) => void;
  setNodeInspectorTab: (tab: EditorNodeInspectorTab) => void;
  clearSelection: () => void;
  setSelectionSnapshot: (nodeIds: number[], linkIds: number[]) => void;
  setViewportCenter: (center: { x: number; y: number }) => void;
  setFocusNodeId: (nodeId: number) => void;
  clearFocusNode: () => void;
  startMenuShortcutPick: (index: number) => void;
  cancelMenuShortcutPick: () => void;
  applyMenuShortcutPick: (nodeId: number) => void;
  updateNodeTitle: (nodeId: number, title: string) => void;
  updateNodeText: (nodeId: number, text: string) => void;
  updateNodeImageUrl: (nodeId: number, url: string | null) => void;
  updateNodeProps: (
    nodeId: number,
    updates: Record<string, unknown>,
    options?: PropPathOptions
  ) => void;
  setNodePropPath: (
    nodeId: number,
    path: string,
    value: unknown,
    options?: PropPathOptions
  ) => void;
  setNodePropStringArraySelect: (
    nodeId: number,
    path: string,
    selectedValue: string,
    options?: StringArraySelectOptions
  ) => void;
  setNodePropMultiSelect: (
    nodeId: number,
    path: string,
    values: string[],
    options?: PropPathOptions
  ) => void;
  updateLinkProps: (
    linkId: number,
    updates: Record<string, unknown>,
    options?: PropPathOptions
  ) => void;
  updateLinkFields: (
    linkId: number,
    updates: {
      targetTitle?: string | null;
      sourceTitle?: string | null;
      type?: string | null;
    }
  ) => void;
  swapLinkDirection: (linkId: number) => void;
  setLinkPropPath: (
    linkId: number,
    path: string,
    value: unknown,
    options?: PropPathOptions
  ) => void;
  updateAdventureFields: (updates: {
    title?: string;
    description?: string;
    category?: CategoryModel | null;
  }) => void;
  updateAdventureCover: (updates: {
    coverUrl?: string | null;
    imageId?: number | null;
  }) => void;
  updateAdventureProps: (
    updates: Record<string, unknown>,
    options?: PropPathOptions
  ) => void;
  setAdventurePropPath: (
    path: string,
    value: unknown,
    options?: PropPathOptions
  ) => void;
  updateNodePositions: (updates: EditorNodePositionUpdate[]) => void;
  addLink: (sourceId: number, targetId: number) => number | null;
  addNode: (position: { x: number; y: number }) => number | null;
  addNodeWithLink: (
    sourceId: number,
    position: { x: number; y: number }
  ) => { nodeId: number; linkId: number } | null;
  duplicateNode: (nodeId: number) => number | null;
  copySelection: () => void;
  pasteClipboard: (target: { x: number; y: number }) => number[];
  undo: () => void;
  pushHistorySnapshot: () => void;
  removeSelection: (nodeIds: number[], linkIds: number[]) => void;
  removeNodes: (nodeIds: number[]) => void;
  removeLinks: (linkIds: number[]) => void;
};
