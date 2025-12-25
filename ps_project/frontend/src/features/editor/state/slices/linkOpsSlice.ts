import type { StateCreator } from "zustand";
import { getNextLinkId } from "../helpers";
import type { EditorState } from "../types";
import { pushHistory } from "./historySlice";

type EditorSlice = StateCreator<EditorState, [], [], Partial<EditorState>>;

const normalizeLinkType = (value: string | null | undefined): "default" | "bidirectional" => {
  const normalized = String(value ?? "").toLowerCase();
  return normalized === "bidirectional" ? "bidirectional" : "default";
};

export const linkOpsSlice: EditorSlice = (set, get) => ({
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
      return {
        adventure: {
          ...state.adventure,
          links: [...state.adventure.links, newLink],
        },
        dirty: true,
        undoStack: pushHistory(state),
      };
    });
    return nextLinkId;
  },
  updateLinkFields: (linkId, updates) => {
    set((state) => {
      if (!state.adventure) return {};
      const linkIndex = state.adventure.links.findIndex(
        (link) => link.linkId === linkId
      );
      if (linkIndex === -1) return {};
      const link = state.adventure.links[linkIndex];
      const currentTargetTitle = link.targetTitle ?? "";
      const currentSourceTitle = link.sourceTitle ?? "";
      const currentType = normalizeLinkType(link.type);

      const nextTargetTitle =
        updates.targetTitle !== undefined
          ? String(updates.targetTitle ?? "")
          : currentTargetTitle;
      const nextSourceTitle =
        updates.sourceTitle !== undefined
          ? String(updates.sourceTitle ?? "")
          : currentSourceTitle;
      const nextType =
        updates.type !== undefined ? normalizeLinkType(updates.type) : currentType;

      let nextLabel = link.label ?? null;
      if (updates.targetTitle !== undefined) {
        const trimmed = nextTargetTitle.trim();
        nextLabel = trimmed.length > 0 ? nextTargetTitle : null;
      }

      if (
        nextTargetTitle === currentTargetTitle &&
        nextSourceTitle === currentSourceTitle &&
        nextType === currentType &&
        nextLabel === (link.label ?? null)
      ) {
        return {};
      }

      const nextLinks = [...state.adventure.links];
      nextLinks[linkIndex] = {
        ...link,
        targetTitle: nextTargetTitle,
        sourceTitle: nextSourceTitle,
        type: nextType,
        label: nextLabel,
        changed: true,
      };
      return {
        adventure: { ...state.adventure, links: nextLinks },
        dirty: true,
        undoStack: pushHistory(state),
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
      return {
        adventure: { ...state.adventure, links },
        dirty: true,
        selection,
        selectedLinkIds,
        undoStack: pushHistory(state),
      };
    });
  },
});
