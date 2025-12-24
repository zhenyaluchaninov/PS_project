import type { AdventureModel } from "@/domain/models";
import { loadAdventureForEdit } from "@/features/state/api";
import { isApiError, resolveApiUrl } from "@/features/state/api/client";
import { toastError } from "@/features/ui-core/toast";
import { create } from "zustand";
import {
  applyPropUpdates,
  setAny,
  setMultiSelect,
  setStringArraySelect,
  updatePropsInput,
  type PropPathOptions,
  type PropsChangeResult,
  type StringArraySelectOptions,
} from "./propsEditing";

export type EditorStatus = "idle" | "loading" | "ready" | "error";

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

export type EditorToolPanel = "search" | null;

export type EditorNodeInspectorTab = "content" | "style" | "buttons" | "logic";

export type EditorNodePositionUpdate = {
  nodeId: number;
  position: { x: number; y: number };
};

type ClipboardNode = {
  title: string;
  text: string;
  icon?: string | null;
  position: { x: number; y: number };
  image: AdventureModel["nodes"][number]["image"];
  type: string | null;
  props: AdventureModel["nodes"][number]["props"];
  rawProps: Record<string, unknown> | null;
};

type EditorClipboard = {
  nodes: ClipboardNode[];
  bounds: { width: number; height: number };
};

type EditorHistoryEntry = {
  nodes: AdventureModel["nodes"];
  links: AdventureModel["links"];
  selection: EditorSelection;
  selectedNodeIds: number[];
  selectedLinkIds: number[];
  dirty: boolean;
};

type EditorState = {
  status: EditorStatus;
  error?: EditorError;
  editSlug?: string;
  adventure?: AdventureModel;
  editVersion?: number;
  dirty: boolean;
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
  loadByEditSlug: (editSlug: string) => Promise<void>;
  reset: () => void;
  markDirty: () => void;
  clearDirty: () => void;
  setSelection: (selection: EditorSelection) => void;
  setSelectionToolActive: (active: boolean) => void;
  setToolPanel: (panel: EditorToolPanel) => void;
  setNodeInspectorTab: (tab: EditorNodeInspectorTab) => void;
  clearSelection: () => void;
  setSelectionSnapshot: (nodeIds: number[], linkIds: number[]) => void;
  setViewportCenter: (center: { x: number; y: number }) => void;
  setFocusNodeId: (nodeId: number) => void;
  clearFocusNode: () => void;
  updateNodeTitle: (nodeId: number, title: string) => void;
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
  setLinkPropPath: (
    linkId: number,
    path: string,
    value: unknown,
    options?: PropPathOptions
  ) => void;
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
  addNodeWithLink: (
    sourceId: number,
    position: { x: number; y: number }
  ) => { nodeId: number; linkId: number } | null;
  duplicateNode: (nodeId: number) => number | null;
  copySelection: () => void;
  pasteClipboard: (target: { x: number; y: number }) => number[];
  undo: () => void;
  removeSelection: (nodeIds: number[], linkIds: number[]) => void;
  removeNodes: (nodeIds: number[]) => void;
  removeLinks: (linkIds: number[]) => void;
};

const isDev = process.env.NODE_ENV !== "production";
const MAX_UNDO_STACK = 60;

function getNextNodeId(adventure: AdventureModel): number {
  return adventure.nodes.reduce((maxId, node) => Math.max(maxId, node.nodeId), -1) + 1;
}

function getNextLinkId(adventure: AdventureModel): number {
  return adventure.links.reduce((maxId, link) => Math.max(maxId, link.linkId), -1) + 1;
}

function cloneRawProps(value: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!value) return null;
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function normalizeSelectionIds(ids: number[]): number[] {
  return [...new Set(ids)].sort((a, b) => a - b);
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function selectionsEqual(a: EditorSelection, b: EditorSelection): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "node" && b.type === "node") return a.nodeId === b.nodeId;
  if (a.type === "link" && b.type === "link") return a.linkId === b.linkId;
  return true;
}

type PropsUpdater = (props: Record<string, unknown>) => PropsChangeResult;

const applyNodePropsUpdate = (
  state: EditorState,
  nodeId: number,
  updater: PropsUpdater,
  errorTitle: string
) => {
  if (!state.adventure) return {};
  const nodeIndex = state.adventure.nodes.findIndex(
    (node) => node.nodeId === nodeId
  );
  if (nodeIndex === -1) return {};
  const node = state.adventure.nodes[nodeIndex];
  const rawInput =
    node.rawProps ?? (node.props as Record<string, unknown> | null) ?? {};
  const rawResult = updatePropsInput(rawInput, updater);
  if (!rawResult.ok) {
    toastError(errorTitle, rawResult.error);
    return {};
  }
  const propsInput = (node.props as Record<string, unknown> | null) ?? {};
  const propsResult = updatePropsInput(propsInput, updater);
  if (!propsResult.ok) {
    toastError(errorTitle, propsResult.error);
    return {};
  }
  if (!rawResult.changed && !propsResult.changed) return {};
  const historyEntry: EditorHistoryEntry = {
    nodes: state.adventure.nodes,
    links: state.adventure.links,
    selection: state.selection,
    selectedNodeIds: state.selectedNodeIds,
    selectedLinkIds: state.selectedLinkIds,
    dirty: state.dirty,
  };
  const nextNodes = [...state.adventure.nodes];
  nextNodes[nodeIndex] = {
    ...node,
    rawProps: rawResult.props,
    props: propsResult.props,
    changed: true,
  };
  return {
    adventure: { ...state.adventure, nodes: nextNodes },
    dirty: true,
    undoStack: [...state.undoStack, historyEntry].slice(-MAX_UNDO_STACK),
  };
};

const applyLinkPropsUpdate = (
  state: EditorState,
  linkId: number,
  updater: PropsUpdater,
  errorTitle: string
) => {
  if (!state.adventure) return {};
  const linkIndex = state.adventure.links.findIndex(
    (link) => link.linkId === linkId
  );
  if (linkIndex === -1) return {};
  const link = state.adventure.links[linkIndex];
  const propsInput = (link.props as Record<string, unknown> | null) ?? {};
  const propsResult = updatePropsInput(propsInput, updater);
  if (!propsResult.ok) {
    toastError(errorTitle, propsResult.error);
    return {};
  }
  if (!propsResult.changed) return {};
  const historyEntry: EditorHistoryEntry = {
    nodes: state.adventure.nodes,
    links: state.adventure.links,
    selection: state.selection,
    selectedNodeIds: state.selectedNodeIds,
    selectedLinkIds: state.selectedLinkIds,
    dirty: state.dirty,
  };
  const nextLinks = [...state.adventure.links];
  nextLinks[linkIndex] = {
    ...link,
    props: propsResult.props,
    changed: true,
  };
  return {
    adventure: { ...state.adventure, links: nextLinks },
    dirty: true,
    undoStack: [...state.undoStack, historyEntry].slice(-MAX_UNDO_STACK),
  };
};

const applyAdventurePropsUpdate = (
  state: EditorState,
  updater: PropsUpdater,
  errorTitle: string
) => {
  if (!state.adventure) return {};
  const propsInput =
    (state.adventure.props as Record<string, unknown> | null) ?? {};
  const propsResult = updatePropsInput(propsInput, updater);
  if (!propsResult.ok) {
    toastError(errorTitle, propsResult.error);
    return {};
  }
  if (!propsResult.changed) return {};
  return {
    adventure: { ...state.adventure, props: propsResult.props },
    dirty: true,
  };
};

export const useEditorStore = create<EditorState>((set, get) => ({
  status: "idle",
  error: undefined,
  editSlug: undefined,
  adventure: undefined,
  editVersion: undefined,
  dirty: false,
  selection: { type: "none" },
  selectionToolActive: false,
  toolPanel: null,
  nodeInspectorTab: "content",
  selectedNodeIds: [],
  selectedLinkIds: [],
  clipboard: null,
  undoStack: [],
  viewportCenter: null,
  focusNodeId: null,

  reset: () =>
    set({
      status: "idle",
      error: undefined,
      editSlug: undefined,
      adventure: undefined,
      editVersion: undefined,
      dirty: false,
      selection: { type: "none" },
      selectionToolActive: false,
      toolPanel: null,
      nodeInspectorTab: "content",
      selectedNodeIds: [],
      selectedLinkIds: [],
      clipboard: null,
      undoStack: [],
      viewportCenter: null,
      focusNodeId: null,
    }),

  markDirty: () => set({ dirty: true }),
  clearDirty: () => set({ dirty: false }),
  setSelection: (selection) =>
    set((state) => (selectionsEqual(state.selection, selection) ? {} : { selection })),
  setSelectionToolActive: (selectionToolActive) => set({ selectionToolActive }),
  setToolPanel: (toolPanel) => set({ toolPanel }),
  setNodeInspectorTab: (nodeInspectorTab) => set({ nodeInspectorTab }),
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
  setViewportCenter: (center) => set({ viewportCenter: center }),
  setFocusNodeId: (nodeId) => set({ focusNodeId: nodeId }),
  clearFocusNode: () => set({ focusNodeId: null }),
  updateNodeTitle: (nodeId, title) => {
    set((state) => {
      if (!state.adventure) return {};
      const nodeIndex = state.adventure.nodes.findIndex(
        (node) => node.nodeId === nodeId
      );
      if (nodeIndex === -1) return {};
      const node = state.adventure.nodes[nodeIndex];
      if (node.title === title) return {};
      const historyEntry: EditorHistoryEntry = {
        nodes: state.adventure.nodes,
        links: state.adventure.links,
        selection: state.selection,
        selectedNodeIds: state.selectedNodeIds,
        selectedLinkIds: state.selectedLinkIds,
        dirty: state.dirty,
      };
      const nextNodes = [...state.adventure.nodes];
      nextNodes[nodeIndex] = { ...node, title, changed: true };
      return {
        adventure: { ...state.adventure, nodes: nextNodes },
        dirty: true,
        undoStack: [...state.undoStack, historyEntry].slice(-MAX_UNDO_STACK),
      };
    });
  },
  updateNodeProps: (nodeId, updates, options) => {
    if (!Object.keys(updates).length) return;
    set((state) =>
      applyNodePropsUpdate(
        state,
        nodeId,
        (props) => applyPropUpdates(props, updates, options),
        "Node props invalid"
      )
    );
  },
  setNodePropPath: (nodeId, path, value, options) => {
    set((state) =>
      applyNodePropsUpdate(
        state,
        nodeId,
        (props) => setAny(props, path, value, options),
        "Node props invalid"
      )
    );
  },
  setNodePropStringArraySelect: (nodeId, path, selectedValue, options) => {
    set((state) =>
      applyNodePropsUpdate(
        state,
        nodeId,
        (props) => setStringArraySelect(props, path, selectedValue, options),
        "Node props invalid"
      )
    );
  },
  setNodePropMultiSelect: (nodeId, path, values, options) => {
    set((state) =>
      applyNodePropsUpdate(
        state,
        nodeId,
        (props) => setMultiSelect(props, path, values, options),
        "Node props invalid"
      )
    );
  },
  updateLinkProps: (linkId, updates, options) => {
    if (!Object.keys(updates).length) return;
    set((state) =>
      applyLinkPropsUpdate(
        state,
        linkId,
        (props) => applyPropUpdates(props, updates, options),
        "Link props invalid"
      )
    );
  },
  setLinkPropPath: (linkId, path, value, options) => {
    set((state) =>
      applyLinkPropsUpdate(
        state,
        linkId,
        (props) => setAny(props, path, value, options),
        "Link props invalid"
      )
    );
  },
  updateAdventureProps: (updates, options) => {
    if (!Object.keys(updates).length) return;
    set((state) =>
      applyAdventurePropsUpdate(
        state,
        (props) => applyPropUpdates(props, updates, options),
        "Adventure props invalid"
      )
    );
  },
  setAdventurePropPath: (path, value, options) => {
    set((state) =>
      applyAdventurePropsUpdate(
        state,
        (props) => setAny(props, path, value, options),
        "Adventure props invalid"
      )
    );
  },
  updateNodePositions: (updates) => {
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
      const historyEntry: EditorHistoryEntry = {
        nodes: state.adventure.nodes,
        links: state.adventure.links,
        selection: state.selection,
        selectedNodeIds: state.selectedNodeIds,
        selectedLinkIds: state.selectedLinkIds,
        dirty: state.dirty,
      };
      return {
        adventure: { ...state.adventure, nodes },
        dirty: true,
        undoStack: [...state.undoStack, historyEntry].slice(-MAX_UNDO_STACK),
      };
    });
  },
  addLink: (sourceId, targetId) => {
    const adventure = get().adventure;
    if (!adventure) return null;
    if (sourceId === targetId) return null;
    const nodeIds = new Set(adventure.nodes.map((node) => node.nodeId));
    if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) return null;
    const hasLink = adventure.links.some(
      (link) =>
        (link.source === sourceId && link.target === targetId) ||
        (link.source === targetId && link.target === sourceId)
    );
    if (hasLink) return null;
    const nextLinkId = getNextLinkId(adventure);
    const newLink = {
      id: 0,
      linkId: nextLinkId,
      source: sourceId,
      sourceTitle: "",
      target: targetId,
      targetTitle: "",
      fromNodeId: sourceId,
      toNodeId: targetId,
      label: null,
      type: "default",
      changed: true,
      props: null,
    };
    set((state) => {
      if (!state.adventure) return {};
      const historyEntry: EditorHistoryEntry = {
        nodes: state.adventure.nodes,
        links: state.adventure.links,
        selection: state.selection,
        selectedNodeIds: state.selectedNodeIds,
        selectedLinkIds: state.selectedLinkIds,
        dirty: state.dirty,
      };
      return {
        adventure: {
          ...state.adventure,
          links: [...state.adventure.links, newLink],
        },
        dirty: true,
        undoStack: [...state.undoStack, historyEntry].slice(-MAX_UNDO_STACK),
      };
    });
    return nextLinkId;
  },
  addNodeWithLink: (sourceId, position) => {
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
      const historyEntry: EditorHistoryEntry = {
        nodes: state.adventure.nodes,
        links: state.adventure.links,
        selection: state.selection,
        selectedNodeIds: state.selectedNodeIds,
        selectedLinkIds: state.selectedLinkIds,
        dirty: state.dirty,
      };
      return {
        adventure: {
          ...state.adventure,
          nodes: [...state.adventure.nodes, newNode],
          links: [...state.adventure.links, newLink],
        },
        dirty: true,
        undoStack: [...state.undoStack, historyEntry].slice(-MAX_UNDO_STACK),
      };
    });
    return { nodeId: nextNodeId, linkId: nextLinkId };
  },
  duplicateNode: (nodeId) => {
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
      const historyEntry: EditorHistoryEntry = {
        nodes: state.adventure.nodes,
        links: state.adventure.links,
        selection: state.selection,
        selectedNodeIds: state.selectedNodeIds,
        selectedLinkIds: state.selectedLinkIds,
        dirty: state.dirty,
      };
      return {
        adventure: {
          ...state.adventure,
          nodes: [...state.adventure.nodes, newNode],
        },
        dirty: true,
        selection: { type: "node", nodeId: nextNodeId },
        selectedNodeIds: [nextNodeId],
        selectedLinkIds: [],
        undoStack: [...state.undoStack, historyEntry].slice(-MAX_UNDO_STACK),
      };
    });
    return nextNodeId;
  },
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
      const historyEntry: EditorHistoryEntry = {
        nodes: state.adventure.nodes,
        links: state.adventure.links,
        selection: state.selection,
        selectedNodeIds: state.selectedNodeIds,
        selectedLinkIds: state.selectedLinkIds,
        dirty: state.dirty,
      };
      return {
        adventure: {
          ...state.adventure,
          nodes: [...state.adventure.nodes, ...newNodes],
        },
        dirty: true,
        selection: { type: "node", nodeId: createdIds[createdIds.length - 1] },
        selectedNodeIds: createdIds,
        selectedLinkIds: [],
        undoStack: [...state.undoStack, historyEntry].slice(-MAX_UNDO_STACK),
      };
    });
    return createdIds;
  },
  undo: () => {
    set((state) => {
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
  removeSelection: (nodeIds, linkIds) => {
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
      const historyEntry: EditorHistoryEntry = {
        nodes: state.adventure.nodes,
        links: state.adventure.links,
        selection: state.selection,
        selectedNodeIds: state.selectedNodeIds,
        selectedLinkIds: state.selectedLinkIds,
        dirty: state.dirty,
      };
      return {
        adventure: { ...state.adventure, nodes, links },
        dirty: true,
        selection,
        selectedNodeIds,
        selectedLinkIds,
        undoStack: [...state.undoStack, historyEntry].slice(-MAX_UNDO_STACK),
      };
    });
  },
  removeNodes: (nodeIds) => {
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
        const remove =
          nodeIdSet.has(link.source) || nodeIdSet.has(link.target);
        if (remove) {
          removedLinkIds.add(link.linkId);
        }
        return !remove;
      });
      let selection = state.selection;
      if (selection.type === "node" && nodeIdSet.has(selection.nodeId)) {
        selection = { type: "none" };
      } else if (
        selection.type === "link" &&
        removedLinkIds.has(selection.linkId)
      ) {
        selection = { type: "none" };
      }
      const selectedNodeIds = state.selectedNodeIds.filter(
        (id) => !nodeIdSet.has(id)
      );
      const selectedLinkIds = state.selectedLinkIds.filter(
        (id) => !removedLinkIds.has(id)
      );
      const historyEntry: EditorHistoryEntry = {
        nodes: state.adventure.nodes,
        links: state.adventure.links,
        selection: state.selection,
        selectedNodeIds: state.selectedNodeIds,
        selectedLinkIds: state.selectedLinkIds,
        dirty: state.dirty,
      };
      return {
        adventure: { ...state.adventure, nodes, links },
        dirty: true,
        selection,
        selectedNodeIds,
        selectedLinkIds,
        undoStack: [...state.undoStack, historyEntry].slice(-MAX_UNDO_STACK),
      };
    });
  },
  removeLinks: (linkIds) => {
    if (!linkIds.length) return;
    set((state) => {
      if (!state.adventure) return {};
      const linkIdSet = new Set(linkIds);
      const links = state.adventure.links.filter(
        (link) => !linkIdSet.has(link.linkId)
      );
      if (links.length === state.adventure.links.length) {
        return {};
      }
      let selection = state.selection;
      if (selection.type === "link" && linkIdSet.has(selection.linkId)) {
        selection = { type: "none" };
      }
      const selectedLinkIds = state.selectedLinkIds.filter(
        (id) => !linkIdSet.has(id)
      );
      const historyEntry: EditorHistoryEntry = {
        nodes: state.adventure.nodes,
        links: state.adventure.links,
        selection: state.selection,
        selectedNodeIds: state.selectedNodeIds,
        selectedLinkIds: state.selectedLinkIds,
        dirty: state.dirty,
      };
      return {
        adventure: { ...state.adventure, links },
        dirty: true,
        selection,
        selectedLinkIds,
        undoStack: [...state.undoStack, historyEntry].slice(-MAX_UNDO_STACK),
      };
    });
  },

  loadByEditSlug: async (editSlug: string) => {
    const requestUrl = resolveApiUrl(`/api/adventure/${editSlug}/edit`);
    set({
      status: "loading",
      error: undefined,
      editSlug,
      adventure: undefined,
      editVersion: undefined,
      dirty: false,
      selection: { type: "none" },
      selectionToolActive: false,
      toolPanel: null,
      nodeInspectorTab: "content",
      selectedNodeIds: [],
      selectedLinkIds: [],
      clipboard: null,
      undoStack: [],
      viewportCenter: null,
      focusNodeId: null,
    });

    try {
      const { adventure, editVersion } = await loadAdventureForEdit(editSlug);

      if (get().editSlug !== editSlug) {
        return;
      }

      set({
        status: "ready",
        adventure,
        editVersion,
        error: undefined,
        dirty: false,
        undoStack: [],
      });

      if (isDev) {
        console.log(
          `[editor] loaded adventure "${adventure.title}" (${editSlug}) version ${editVersion}`
        );
      }
    } catch (err) {
      if (get().editSlug !== editSlug) {
        return;
      }
      if (isApiError(err)) {
        set({
          status: "error",
          error: {
            message: err.message,
            status: err.status,
            details: err.details,
            url: err.url ?? requestUrl,
          },
        });
        if (isDev) {
          console.error(
            `[editor] load failed for ${editSlug}`,
            err.status,
            err.message
          );
        }
      } else {
        set({
          status: "error",
          error: { message: "Unexpected error", details: err, url: requestUrl },
        });
        if (isDev) {
          console.error(`[editor] load failed for ${editSlug}`, err);
        }
      }
    }
  },
}));

export const selectEditorStatus = (state: EditorState) => state.status;
export const selectEditorAdventure = (state: EditorState) => state.adventure;
export const selectEditorError = (state: EditorState) => state.error;
export const selectEditorDirty = (state: EditorState) => state.dirty;
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
