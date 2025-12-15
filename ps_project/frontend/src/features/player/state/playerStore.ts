import { loadAdventure } from "@/features/state/api/adventures";
import { ApiError, isApiError, resolveApiUrl } from "@/features/state/api/client";
import type { AdventureModel } from "@/domain/models";
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
  loadByViewSlug: (viewSlug: string) => Promise<void>;
  reset: () => void;
};

const isDev = process.env.NODE_ENV !== "production";

export const usePlayerStore = create<PlayerState>((set, get) => ({
  status: "idle",
  viewSlug: undefined,
  adventure: undefined,
  error: undefined,
  loadedAt: undefined,

  reset: () =>
    set({
      status: "idle",
      viewSlug: undefined,
      adventure: undefined,
      error: undefined,
      loadedAt: undefined,
    }),

  loadByViewSlug: async (viewSlug: string) => {
    const requestUrl = resolveApiUrl(`/api/adventure/${viewSlug}`);
    set({ status: "loading", viewSlug, error: undefined, adventure: undefined });
    try {
      const adventure = await loadAdventure(viewSlug, "play");

      // Avoid stale updates if slug changed during fetch
      if (get().viewSlug !== viewSlug) {
        return;
      }

      set({
        status: "ready",
        adventure,
        loadedAt: Date.now(),
        error: undefined,
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
}));

export const selectPlayerStatus = (state: PlayerState) => state.status;
export const selectPlayerAdventure = (state: PlayerState) => state.adventure;
export const selectPlayerError = (state: PlayerState) => state.error;
