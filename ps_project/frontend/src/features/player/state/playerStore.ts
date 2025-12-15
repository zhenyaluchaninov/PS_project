import type { AdventureModel, LinkModel, NodeModel } from "@/domain/models";
import { loadAdventure } from "@/features/state/api/adventures";
import { ApiError, isApiError, resolveApiUrl } from "@/features/state/api/client";
import { create } from "zustand";

export type PlayerStatus = "idle" | "loading" | "ready" | "error";

export type PlayerError = {
  message: string;
  status?: number;
  details?: unknown;
  url?: string;
};

type PlayerState = {
  status: PlayerStatus;
  viewSlug?: string;
  adventure?: AdventureModel;
  error?: PlayerError;
  loadedAt?: number;
  currentNodeId?: number;
  history: Array<{ nodeId: number; chosenLinkId?: number }>;
  nodeIndex?: Record<number, NodeModel>;
  linksBySource?: Record<number, LinkModel[]>;
  linksById?: Record<number, LinkModel>;
  loadByViewSlug: (viewSlug: string) => Promise<void>;
  start: () => void;
  chooseLink: (linkId: number) => void;
  getCurrentNode: () => NodeModel | undefined;
  getNodeById: (id?: number | null) => NodeModel | undefined;
  getOutgoingLinks: (nodeId?: number | null) => LinkModel[];
  reset: () => void;
};

const isDev = process.env.NODE_ENV !== "production";

export const usePlayerStore = create<PlayerState>((set, get) => ({
  status: "idle",
  viewSlug: undefined,
  adventure: undefined,
  error: undefined,
  loadedAt: undefined,
  currentNodeId: undefined,
  history: [],
  nodeIndex: undefined,
  linksBySource: undefined,
  linksById: undefined,

  reset: () =>
    set({
      status: "idle",
      viewSlug: undefined,
      adventure: undefined,
      error: undefined,
      loadedAt: undefined,
      currentNodeId: undefined,
      history: [],
      nodeIndex: undefined,
      linksBySource: undefined,
      linksById: undefined,
    }),

  loadByViewSlug: async (viewSlug: string) => {
    const requestUrl = resolveApiUrl(`/api/adventure/${viewSlug}`);
    set({
      status: "loading",
      viewSlug,
      error: undefined,
      adventure: undefined,
      currentNodeId: undefined,
      history: [],
    });
    try {
      const adventure = await loadAdventure(viewSlug, "play");

      // Avoid stale updates if slug changed during fetch
      if (get().viewSlug !== viewSlug) {
        return;
      }

      const nodeIndex = Object.fromEntries(
        (adventure.nodes ?? []).map((node) => [node.nodeId, node])
      );
      const linksBySource: Record<number, LinkModel[]> = {};
      const linksById: Record<number, LinkModel> = {};
      for (const link of adventure.links ?? []) {
        const sourceId = link.fromNodeId;
        if (!linksBySource[sourceId]) {
          linksBySource[sourceId] = [];
        }
        linksBySource[sourceId].push(link);
        linksById[link.linkId] = link;
        linksById[link.id] = link;
      }

      set({
        status: "ready",
        adventure,
        loadedAt: Date.now(),
        error: undefined,
        currentNodeId: undefined,
        history: [],
        nodeIndex,
        linksBySource,
        linksById,
      });

      if (isDev) {
        console.log(`[player] loaded adventure "${adventure.title}" (${viewSlug})`);
      }
    } catch (err) {
      if (get().viewSlug !== viewSlug) {
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
            `[player] load failed for ${viewSlug}`,
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
          console.error(`[player] load failed for ${viewSlug}`, err);
        }
      }
    }
  },

  start: () => {
    const { adventure, nodeIndex, currentNodeId } = get();
    if (!adventure || !nodeIndex) return;
    if (currentNodeId != null) {
      return;
    }
    const rootNode =
      adventure.nodes.find(
        (node) => node.type?.toLowerCase() === "root"
      ) ?? adventure.nodes[0];
    if (!rootNode) {
      set({
        status: "error",
        error: { message: "Adventure has no nodes", status: 500 },
      });
      return;
    }
    set({
      currentNodeId: rootNode.nodeId,
      history: [{ nodeId: rootNode.nodeId }],
    });
    if (isDev) {
      console.log(`[player] start at node ${rootNode.nodeId}`);
    }
  },

  chooseLink: (linkId: number) => {
    const { linksById, history } = get();
    const link = linksById?.[linkId];
    if (!link) return;
    const nextNodeId = link.toNodeId;
    set({
      currentNodeId: nextNodeId,
      history: [...history, { nodeId: nextNodeId, chosenLinkId: linkId }],
    });
    if (isDev) {
      console.log(`[player] chose link ${linkId} -> node ${nextNodeId}`, {
        from: link.fromNodeId,
        to: link.toNodeId,
      });
    }
  },

  getCurrentNode: () => {
    const { currentNodeId, nodeIndex } = get();
    if (currentNodeId == null || !nodeIndex) return undefined;
    return nodeIndex[currentNodeId];
  },

  getNodeById: (id?: number | null) => {
    const { nodeIndex } = get();
    if (id == null || !nodeIndex) return undefined;
    return nodeIndex[id];
  },

  getOutgoingLinks: (nodeId?: number | null) => {
    const { linksBySource, currentNodeId } = get();
    const sourceId = nodeId ?? currentNodeId;
    if (sourceId == null || !linksBySource) return [];
    return linksBySource[sourceId] ?? [];
  },
}));

export const selectPlayerStatus = (state: PlayerState) => state.status;
export const selectPlayerAdventure = (state: PlayerState) => state.adventure;
export const selectPlayerError = (state: PlayerState) => state.error;
export const selectPlayerCurrentNodeId = (state: PlayerState) =>
  state.currentNodeId;
export const selectPlayerCurrentNode = (state: PlayerState) =>
  state.getCurrentNode();
export const selectPlayerOutgoingLinks = (state: PlayerState) =>
  state.getOutgoingLinks();
