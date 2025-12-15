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

type EditorState = {
  status: EditorStatus;
  error?: EditorError;
  editSlug?: string;
  adventure?: AdventureModel;
  editVersion?: number;
  dirty: boolean;
  loadByEditSlug: (editSlug: string) => Promise<void>;
  reset: () => void;
  markDirty: () => void;
  clearDirty: () => void;
};

const isDev = process.env.NODE_ENV !== "production";

export const useEditorStore = create<EditorState>((set, get) => ({
  status: "idle",
  error: undefined,
  editSlug: undefined,
  adventure: undefined,
  editVersion: undefined,
  dirty: false,

  reset: () =>
    set({
      status: "idle",
      error: undefined,
      editSlug: undefined,
      adventure: undefined,
      editVersion: undefined,
      dirty: false,
    }),

  markDirty: () => set({ dirty: true }),
  clearDirty: () => set({ dirty: false }),

  loadByEditSlug: async (editSlug: string) => {
    const requestUrl = resolveApiUrl(`/api/adventure/${editSlug}/edit`);
    set({
      status: "loading",
      error: undefined,
      editSlug,
      adventure: undefined,
      editVersion: undefined,
      dirty: false,
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
