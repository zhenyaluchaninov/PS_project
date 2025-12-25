import { loadAdventureForEdit } from "@/features/state/api";
import { isApiError, resolveApiUrl } from "@/features/state/api/client";
import type { StateCreator } from "zustand";
import type { EditorState } from "../types";

const isDev = process.env.NODE_ENV !== "production";

type EditorSlice = StateCreator<EditorState, [], [], Partial<EditorState>>;

type ResetState = Pick<
  EditorState,
  | "status"
  | "error"
  | "editSlug"
  | "adventure"
  | "editVersion"
  | "dirty"
  | "selection"
  | "selectionToolActive"
  | "toolPanel"
  | "nodeInspectorTab"
  | "selectedNodeIds"
  | "selectedLinkIds"
  | "clipboard"
  | "undoStack"
  | "viewportCenter"
  | "focusNodeId"
>;

const createResetState = (): ResetState => ({
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
});

export const coreSlice: EditorSlice = (set, get) => ({
  ...createResetState(),
  reset: () => set(createResetState()),
  markDirty: () => set({ dirty: true }),
  clearDirty: () => set({ dirty: false }),
  setToolPanel: (toolPanel) => set({ toolPanel }),
  setNodeInspectorTab: (nodeInspectorTab) => set({ nodeInspectorTab }),
  setViewportCenter: (viewportCenter) => set({ viewportCenter }),
  setFocusNodeId: (focusNodeId) => set({ focusNodeId }),
  clearFocusNode: () => set({ focusNodeId: null }),

  loadByEditSlug: async (editSlug: string) => {
    const requestUrl = resolveApiUrl(`/api/adventure/${editSlug}/edit`);
    set({
      ...createResetState(),
      status: "loading",
      editSlug,
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
});
