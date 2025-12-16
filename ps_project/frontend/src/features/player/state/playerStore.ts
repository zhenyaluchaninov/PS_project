import type { AdventureModel, LinkModel, NodeModel } from "@/domain/models";
import { loadAdventure } from "@/features/state/api/adventures";
import {
  ApiError,
  isApiError,
  resolveApiUrl,
} from "@/features/state/api/client";
import { create } from "zustand";
import { toastError } from "@/features/ui-core/toast";
import {
  buildGraphIndexes,
  decideOnClick,
  decideOnEnterNode,
  getOutgoingLinksForNode,
  resolveNodeKind,
  type NodeKind,
} from "../engine/playerEngine";

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
  getCurrentNodeKind: () => NodeKind;
  getNodeKindById: (id?: number | null) => NodeKind;
  getNodeById: (id?: number | null) => NodeModel | undefined;
  getOutgoingLinks: (nodeId?: number | null) => LinkModel[];
  getVisitedCount: () => number;
  getProgressPercent: () => number;
  reset: () => void;
};

const isDev = process.env.NODE_ENV !== "production";

export const usePlayerStore = create<PlayerState>((set, get) => {
  const navigateToNode = (
    nextNodeId: number,
    options?: {
      chosenLinkId?: number;
      resetHistory?: boolean;
      resetVisited?: boolean;
    }
  ): boolean => {
    const { nodeIndex, linksBySource, linksById } = get();
    if (!nodeIndex || !linksBySource || !linksById) return false;

    const workingVisited = options?.resetVisited
      ? new Set<number>()
      : new Set(get().visited);
    const workingHistory = options?.resetHistory ? [] : [...get().history];

    let targetNodeId = nextNodeId;
    let chosenLinkId = options?.chosenLinkId;
    let safetyCounter = 0;
    const seenNodes = new Set<number>();

    while (safetyCounter < 20) {
      safetyCounter += 1;
      if (seenNodes.has(targetNodeId)) {
        toastError("Navigation error", "Detected a navigation loop for this node.");
        return false;
      }
      seenNodes.add(targetNodeId);

      const decision = decideOnEnterNode(targetNodeId, {
        nodes: nodeIndex,
        linksBySource,
        linksById,
        visited: workingVisited,
      });

      if (decision.type === "error") {
        toastError(decision.error.title, decision.error.description);
        return false;
      }

      if (decision.type === "auto") {
        targetNodeId = decision.targetNodeId;
        chosenLinkId = decision.viaLinkId;
        continue;
      }

      workingVisited.add(decision.nodeId);
      workingHistory.push({ nodeId: decision.nodeId, chosenLinkId });
      set({
        currentNodeId: decision.nodeId,
        history: workingHistory,
        visited: workingVisited,
      });
      return true;
    }

    toastError("Navigation error", "Could not resolve next node.");
    return false;
  };

  return {
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

        const { nodeIndex, linksBySource, linksById } = buildGraphIndexes(adventure);

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
              const { nodeIndex, linksBySource, linksById } = buildGraphIndexes(adventure);

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
      adventure.nodes.find((node) => resolveNodeKind(node) === "start") ??
      adventure.nodes[0];
    if (!rootNode) {
      set({
        status: "error",
        error: { message: "Adventure has no nodes", status: 500 },
      });
      return;
    }
    set({ rootNodeId: rootNode.nodeId });
    const started = navigateToNode(rootNode.nodeId, {
      resetHistory: true,
      resetVisited: true,
    });
    if (isDev && started) {
      console.log(`[player] start at node ${rootNode.nodeId}`);
    }
  },

  chooseLink: (linkId: number) => {
    const { nodeIndex, linksBySource, linksById, visited } = get();
    if (!nodeIndex || !linksBySource || !linksById) return false;

    const decision = decideOnClick(linkId, {
      nodes: nodeIndex,
      linksBySource,
      linksById,
      visited,
    });

    if (decision.type === "error") {
      toastError(decision.error.title, decision.error.description);
      return false;
    }

    const success = navigateToNode(decision.nodeId, {
      chosenLinkId: decision.linkId,
    });
    if (isDev && success) {
      console.log(
        `[player] chose link ${decision.linkId} -> node ${decision.nodeId}`
      );
    }
    return success;
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
    const success = navigateToNode(rootNodeId, {
      resetHistory: true,
      resetVisited: true,
    });
    if (isDev && success) {
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
    return getOutgoingLinksForNode(sourceId, linksBySource);
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

  getCurrentNodeKind: () => resolveNodeKind(get().getCurrentNode()),
  getNodeKindById: (id?: number | null) => resolveNodeKind(get().getNodeById(id)),
  };
});

export const selectPlayerStatus = (state: PlayerState) => state.status;
export const selectPlayerAdventure = (state: PlayerState) => state.adventure;
export const selectPlayerError = (state: PlayerState) => state.error;
export const selectPlayerCurrentNodeId = (state: PlayerState) =>
  state.currentNodeId;
export const selectPlayerCurrentNode = (state: PlayerState) =>
  state.getCurrentNode();
export const selectPlayerCurrentNodeKind = (state: PlayerState) =>
  state.getCurrentNodeKind();
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
