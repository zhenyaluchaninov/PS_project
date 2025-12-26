import type { StateCreator } from "zustand";
import type { NodeModel } from "@/domain/models";
import { getNextLinkId } from "../helpers";
import type { EditorState } from "../types";
import { pushHistory } from "./historySlice";

type EditorSlice = StateCreator<EditorState, [], [], Partial<EditorState>>;

const normalizeLinkType = (value: string | null | undefined): "default" | "bidirectional" => {
  const normalized = String(value ?? "").toLowerCase();
  return normalized === "bidirectional" ? "bidirectional" : "default";
};

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const readStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).filter((entry) => entry.length > 0);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((entry) => String(entry)).filter((entry) => entry.length > 0);
        }
      } catch {
        return [trimmed];
      }
    }
    return [trimmed];
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return [String(value)];
  }
  return [];
};

const getOrderedLinkIds = (node: NodeModel) => {
  const rawProps = node.rawProps ?? {};
  const fallbackProps = (node.props as Record<string, unknown> | null) ?? {};
  const hasKey =
    Object.prototype.hasOwnProperty.call(rawProps, "ordered_link_ids") ||
    Object.prototype.hasOwnProperty.call(fallbackProps, "ordered_link_ids");
  const rawValue =
    (rawProps as Record<string, unknown>).ordered_link_ids ??
    (fallbackProps as Record<string, unknown>).ordered_link_ids;
  return { list: readStringArray(rawValue), hasKey };
};

const withOrderedLinkIds = (node: NodeModel, nextList: string[]) => {
  const rawProps = node.rawProps ?? {};
  const props = (node.props as Record<string, unknown> | null) ?? {};
  return {
    ...node,
    rawProps: { ...rawProps, ordered_link_ids: nextList },
    props: { ...props, ordered_link_ids: nextList },
    changed: true,
  };
};

export const linkOpsSlice: EditorSlice = (set, get) => ({
  addLink: (sourceId, targetId) => {
    if (get().readOnly) return null;
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
    if (get().readOnly) return;
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
  swapLinkDirection: (linkId) => {
    if (get().readOnly) return;
    set((state) => {
      if (!state.adventure) return {};
      const linkIndex = state.adventure.links.findIndex(
        (link) => link.linkId === linkId
      );
      if (linkIndex === -1) return {};
      const link = state.adventure.links[linkIndex];
      const nodeIdSet = new Set(state.adventure.nodes.map((node) => node.nodeId));
      if (!nodeIdSet.has(link.source) || !nodeIdSet.has(link.target)) {
        return {};
      }
      const nextSource = link.target;
      const nextTarget = link.source;
      const nextSourceTitle = link.targetTitle ?? "";
      const nextTargetTitle = link.sourceTitle ?? "";
      const nextLabel =
        nextTargetTitle.trim().length > 0 ? nextTargetTitle : null;
      const nextLinks = [...state.adventure.links];
      nextLinks[linkIndex] = {
        ...link,
        source: nextSource,
        target: nextTarget,
        fromNodeId: nextSource,
        toNodeId: nextTarget,
        sourceTitle: nextSourceTitle,
        targetTitle: nextTargetTitle,
        label: nextLabel,
        changed: true,
      };

      let nodesChanged = false;
      const nextNodes = [...state.adventure.nodes];
      const linkIdToken = String(link.linkId);
      const updateNodeOrder = (
        nodeId: number,
        updater: (list: string[]) => string[]
      ) => {
        const nodeIndex = nextNodes.findIndex((node) => node.nodeId === nodeId);
        if (nodeIndex === -1) return;
        const node = nextNodes[nodeIndex];
        const { list, hasKey } = getOrderedLinkIds(node);
        const nextList = updater(list);
        if (arraysEqual(list, nextList)) return;
        if (!hasKey && nextList.length === 0) return;
        nextNodes[nodeIndex] = withOrderedLinkIds(node, nextList);
        nodesChanged = true;
      };

      updateNodeOrder(link.source, (list) =>
        list.filter((entry) => entry !== linkIdToken)
      );
      updateNodeOrder(link.target, (list) => {
        const without = list.filter((entry) => entry !== linkIdToken);
        return [...without, linkIdToken];
      });

      return {
        adventure: {
          ...state.adventure,
          links: nextLinks,
          nodes: nodesChanged ? nextNodes : state.adventure.nodes,
        },
        dirty: true,
        undoStack: pushHistory(state),
      };
    });
  },
  removeLinks: (linkIds) => {
    if (get().readOnly) return;
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
