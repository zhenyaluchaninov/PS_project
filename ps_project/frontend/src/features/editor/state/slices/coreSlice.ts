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
  | "liveUpdateCount"
  | "interactionLockCount"
  | "saveStatus"
  | "saveError"
  | "readOnly"
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
  | "menuShortcutPickIndex"
>;

const createResetState = (): ResetState => ({
  status: "idle",
  error: undefined,
  editSlug: undefined,
  adventure: undefined,
  editVersion: undefined,
  dirty: false,
  liveUpdateCount: 0,
  interactionLockCount: 0,
  saveStatus: "idle",
  saveError: null,
  readOnly: false,
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
  menuShortcutPickIndex: null,
});

export const coreSlice: EditorSlice = (set, get) => ({
  ...createResetState(),
  reset: () => set(createResetState()),
  markDirty: () => set({ dirty: true }),
  clearDirty: () => set({ dirty: false }),
  beginLiveUpdate: () =>
    set((state) => ({ liveUpdateCount: state.liveUpdateCount + 1 })),
  endLiveUpdate: () =>
    set((state) => ({
      liveUpdateCount: Math.max(0, state.liveUpdateCount - 1),
    })),
  beginInteractionLock: () =>
    set((state) => ({ interactionLockCount: state.interactionLockCount + 1 })),
  endInteractionLock: () =>
    set((state) => ({
      interactionLockCount: Math.max(0, state.interactionLockCount - 1),
    })),
  setSaveStatus: (saveStatus, error) =>
    set({
      saveStatus,
      saveError: error ?? null,
      readOnly: saveStatus === "locked" ? true : get().readOnly,
    }),
  setSaveError: (saveError) => set({ saveError: saveError ?? null }),
  setReadOnly: (readOnly) => set({ readOnly }),
  setToolPanel: (toolPanel) => set({ toolPanel }),
  setNodeInspectorTab: (nodeInspectorTab) => set({ nodeInspectorTab }),
  setViewportCenter: (viewportCenter) => set({ viewportCenter }),
  setFocusNodeId: (focusNodeId) => set({ focusNodeId }),
  clearFocusNode: () => set({ focusNodeId: null }),
  startMenuShortcutPick: (index) => {
    if (!Number.isFinite(index)) return;
    set({ menuShortcutPickIndex: index });
  },
  cancelMenuShortcutPick: () => set({ menuShortcutPickIndex: null }),
  applyMenuShortcutPick: (nodeId) => {
    const pickIndex = get().menuShortcutPickIndex;
    const adventure = get().adventure;
    if (!adventure || pickIndex == null) {
      set({ menuShortcutPickIndex: null });
      return;
    }
    const pickedNode = adventure.nodes.find((node) => node.nodeId === nodeId);
    const props = (adventure.props as Record<string, unknown> | null) ?? {};
    const raw = props.menu_shortcuts ?? props.menuShortcuts;
    const list = Array.isArray(raw) ? raw : [];
    const nextShortcuts = Array.from({ length: 9 }, (_, index) => {
      const entry = list[index];
      const base =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      if (index !== pickIndex) {
        return base;
      }
      const currentText =
        typeof base.text === "string" ? base.text : "";
      const nextText =
        currentText.trim().length === 0 && pickedNode?.title
          ? pickedNode.title
          : currentText;
      return { ...base, nodeId: String(nodeId), text: nextText };
    });
    if (process.env.NODE_ENV !== "production") {
      console.debug("[editor] menu shortcut picked", {
        pickIndex,
        nodeId,
        nodeTitle: pickedNode?.title ?? null,
      });
    }
    get().updateAdventureProps({ menu_shortcuts: nextShortcuts });
    set({ menuShortcutPickIndex: null });
  },

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
