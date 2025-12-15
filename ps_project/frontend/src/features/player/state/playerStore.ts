import type { AdventureModel, LinkModel, NodeModel } from "@/domain/models";
import { loadAdventure } from "@/features/state/api/adventures";
import {
  ApiError,
  isApiError,
  resolveApiUrl,
} from "@/features/state/api/client";
import { create } from "zustand";
import { toastError } from "@/features/ui-core/toast";

export type PlayerMode = "play" | "preview";
export type PlayerStatus = "idle" | "loading" | "ready" | "error";

export type PlayerError = {
  message: string;
  status?: number;
  details?: unknown;
  url?: string;
};

type PlayerState = {
  status: PlayerStatus;
  slug?: string;
  mode: PlayerMode;
  adventure?: AdventureModel;
  error?: PlayerError;
  loadedAt?: number;
  currentNodeId?: number;
  history: Array<{ nodeId: number; chosenLinkId?: number }>;
  rootNodeId?: number;
  visited: Set<number>;
  nodeIndex?: Record<number, NodeModel>;
  linksBySource?: Record<number, LinkModel[]>;
  linksById?: Record<number, LinkModel>;
  loadBySlug: (slug: string, mode?: PlayerMode) => Promise<void>;
  start: () => void;
  chooseLink: (linkId: number) => boolean;
  goBack: () => void;
  goHome: () => void;
  getCurrentNode: () => NodeModel | undefined;
  getNodeById: (id?: number | null) => NodeModel | undefined;
  getOutgoingLinks: (nodeId?: number | null) => LinkModel[];
  getVisitedCount: () => number;
  getProgressPercent: () => number;
  reset: () => void;
};

const isDev = process.env.NODE_ENV !== "production";
// IMPORTANT: Returning a new [] from a selector-backed getter can trigger an
// infinite rerender loop via `useSyncExternalStore` (React expects snapshots to
// be referentially stable when state hasn't changed).
const EMPTY_LINKS: LinkModel[] = [];

export const usePlayerStore = create<PlayerState>((set, get) => ({
  status: "idle",
  slug: undefined,
  mode: "play",
  adventure: undefined,
  error: undefined,
  loadedAt: undefined,
  currentNodeId: undefined,
  history: [],
  rootNodeId: undefined,
  visited: new Set(),
  nodeIndex: undefined,
  linksBySource: undefined,
  linksById: undefined,

  reset: () =>
    set({
      status: "idle",
      slug: undefined,
      mode: "play",
      adventure: undefined,
      error: undefined,
      loadedAt: undefined,
      currentNodeId: undefined,
      history: [],
      rootNodeId: undefined,
      visited: new Set(),
      nodeIndex: undefined,
      linksBySource: undefined,
      linksById: undefined,
    }),

  loadBySlug: async (slug: string, mode: PlayerMode = "play") => {
    const apiMode = mode === "preview" ? "edit" : "play";
    const requestUrl =
      apiMode === "play"
        ? resolveApiUrl(`/api/adventure/${slug}`)
        : resolveApiUrl(`/api/adventure/${slug}/edit`);

    set({
      status: "loading",
      slug,
      mode,
      error: undefined,
      adventure: undefined,
      currentNodeId: undefined,
      history: [],
      rootNodeId: undefined,
      visited: new Set(),
    });
    try {
      const adventure = await loadAdventure(slug, apiMode);

      // Avoid stale updates if slug changed during fetch
      if (get().slug !== slug) {
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
        rootNodeId: undefined,
        visited: new Set(),
        nodeIndex,
        linksBySource,
        linksById,
      });

      if (isDev) {
        console.log(`[player] loaded adventure "${adventure.title}" (${slug}) mode=${mode}`);
      }
    } catch (err) {
      if (get().slug !== slug) {
        return;
      }
      if (isApiError(err)) {
        // Fallback: if play mode returns 404, try edit endpoint with same slug
        if (mode === "play" && err.status === 404) {
          try {
            const adventure = await loadAdventure(slug, "edit");
            if (get().slug !== slug) {
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
              rootNodeId: undefined,
              visited: new Set(),
              nodeIndex,
              linksBySource,
              linksById,
              mode: "preview",
            });
            if (isDev) {
              console.warn(`[player] fallback loaded via edit endpoint for slug ${slug}`);
            }
            return;
          } catch (fallbackErr) {
            if (!isApiError(fallbackErr)) {
              set({
                status: "error",
                error: {
                  message: "Unexpected error",
                  details: fallbackErr,
                  url: requestUrl,
                },
              });
              return;
            }
            set({
              status: "error",
              error: {
                message: fallbackErr.message,
                status: fallbackErr.status,
                details: fallbackErr.details,
                url: fallbackErr.url ?? requestUrl,
              },
            });
            return;
          }
        }

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
          console.error(`[player] load failed for ${slug}`, err.status, err.message);
        }
      } else {
        set({
          status: "error",
          error: { message: "Unexpected error", details: err, url: requestUrl },
        });
        if (isDev) {
          console.error(`[player] load failed for ${slug}`, err);
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
    const visited = new Set<number>([rootNode.nodeId]);
    set({
      currentNodeId: rootNode.nodeId,
      history: [{ nodeId: rootNode.nodeId }],
      rootNodeId: rootNode.nodeId,
      visited,
    });
    if (isDev) {
      console.log(`[player] start at node ${rootNode.nodeId}`);
    }
  },

  chooseLink: (linkId: number) => {
    const { linksById, history, visited, nodeIndex } = get();
    const link = linksById?.[linkId];
    if (!link || link.toNodeId == null) {
      toastError("Broken link", "This choice has no destination.");
      return false;
    }
    const nextNodeId = link.toNodeId;
    if (!nodeIndex?.[nextNodeId]) {
      toastError("Broken link", "The target node is missing.");
      return false;
    }

    const updatedVisited = new Set<number>(visited);
    updatedVisited.add(nextNodeId);
    set({
      currentNodeId: nextNodeId,
      history: [...history, { nodeId: nextNodeId, chosenLinkId: linkId }],
      visited: updatedVisited,
    });
    if (isDev) {
      console.log(`[player] chose link ${linkId} -> node ${nextNodeId}`, {
        from: link.fromNodeId,
        to: link.toNodeId,
      });
    }
    return true;
  },

  goBack: () => {
    const { history } = get();
    if (history.length <= 1) return;
    const newHistory = history.slice(0, -1);
    const previous = newHistory[newHistory.length - 1];
    set({
      history: newHistory,
      currentNodeId: previous.nodeId,
    });
    if (isDev) {
      console.log(`[player] back to node ${previous.nodeId}`);
    }
  },

  goHome: () => {
    const { rootNodeId } = get();
    if (rootNodeId == null) return;
    set({
      currentNodeId: rootNodeId,
      history: [{ nodeId: rootNodeId }],
      visited: new Set<number>([rootNodeId]),
    });
    if (isDev) {
      console.log("[player] home/reset to start");
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
    if (sourceId == null || !linksBySource) return EMPTY_LINKS;
    return linksBySource[sourceId] ?? EMPTY_LINKS;
  },

  getVisitedCount: () => {
    const { visited } = get();
    return visited.size;
  },

  getProgressPercent: () => {
    const { visited, adventure } = get();
    const total = adventure?.nodes.length ?? 0;
    if (total === 0) return 0;
    return Math.min(100, Math.round((visited.size / total) * 100));
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
export const selectPlayerMode = (state: PlayerState) => state.mode;
export const selectPlayerRootNodeId = (state: PlayerState) => state.rootNodeId;
export const selectPlayerVisitedCount = (state: PlayerState) =>
  state.getVisitedCount();
export const selectPlayerProgress = (state: PlayerState) =>
  state.getProgressPercent();
export const selectPlayerHistoryLength = (state: PlayerState) =>
  state.history.length;
