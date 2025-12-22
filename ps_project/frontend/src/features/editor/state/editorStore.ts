import type { AdventureModel } from "@/domain/models";
import { loadAdventureForEdit } from "@/features/state/api";
import { ApiError, isApiError, resolveApiUrl } from "@/features/state/api/client";
import { create } from "zustand";

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

export type EditorNodePositionUpdate = {
  nodeId: number;
  position: { x: number; y: number };
};

type EditorState = {
  status: EditorStatus;
  error?: EditorError;
  editSlug?: string;
  adventure?: AdventureModel;
  editVersion?: number;
  dirty: boolean;
  selection: EditorSelection;
  loadByEditSlug: (editSlug: string) => Promise<void>;
  reset: () => void;
  markDirty: () => void;
  clearDirty: () => void;
  setSelection: (selection: EditorSelection) => void;
  clearSelection: () => void;
  updateNodePositions: (updates: EditorNodePositionUpdate[]) => void;
  addLink: (sourceId: number, targetId: number) => number | null;
  addNodeWithLink: (
    sourceId: number,
    position: { x: number; y: number }
  ) => { nodeId: number; linkId: number } | null;
  removeNodes: (nodeIds: number[]) => void;
  removeLinks: (linkIds: number[]) => void;
};

const isDev = process.env.NODE_ENV !== "production";

export const useEditorStore = create<EditorState>((set, get) => ({
  status: "idle",
  error: undefined,
  editSlug: undefined,
  adventure: undefined,
  editVersion: undefined,
  dirty: false,
  selection: { type: "none" },

  reset: () =>
    set({
      status: "idle",
      error: undefined,
      editSlug: undefined,
      adventure: undefined,
      editVersion: undefined,
      dirty: false,
      selection: { type: "none" },
    }),

  markDirty: () => set({ dirty: true }),
  clearDirty: () => set({ dirty: false }),
  setSelection: (selection) => set({ selection }),
  clearSelection: () => set({ selection: { type: "none" } }),
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
      return {
        adventure: { ...state.adventure, nodes },
        dirty: true,
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
    const nextLinkId =
      adventure.links.reduce((maxId, link) => Math.max(maxId, link.linkId), -1) +
      1;
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
    set({
      adventure: {
        ...adventure,
        links: [...adventure.links, newLink],
      },
      dirty: true,
    });
    return nextLinkId;
  },
  addNodeWithLink: (sourceId, position) => {
    const adventure = get().adventure;
    if (!adventure) return null;
    const sourceExists = adventure.nodes.some((node) => node.nodeId === sourceId);
    if (!sourceExists) return null;
    const nextNodeId =
      adventure.nodes.reduce((maxId, node) => Math.max(maxId, node.nodeId), -1) +
      1;
    const nextLinkId =
      adventure.links.reduce((maxId, link) => Math.max(maxId, link.linkId), -1) +
      1;
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
    set({
      adventure: {
        ...adventure,
        nodes: [...adventure.nodes, newNode],
        links: [...adventure.links, newLink],
      },
      dirty: true,
    });
    return { nodeId: nextNodeId, linkId: nextLinkId };
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
      return {
        adventure: { ...state.adventure, nodes, links },
        dirty: true,
        selection,
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
      return {
        adventure: { ...state.adventure, links },
        dirty: true,
        selection,
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
