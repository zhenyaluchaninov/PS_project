import { toastError } from "@/features/ui-core/toast";
import type { StateCreator } from "zustand";
import {
  applyPropUpdates,
  setAny,
  setMultiSelect,
  setStringArraySelect,
  updatePropsInput,
  type PropPathOptions,
  type PropsChangeResult,
  type StringArraySelectOptions,
} from "../propsEditing";
import type { EditorState } from "../types";
import { pushHistory } from "./historySlice";

type EditorSlice = StateCreator<EditorState, [], [], Partial<EditorState>>;

type PropsUpdater = (props: Record<string, unknown>) => PropsChangeResult;

const applyNodePropsUpdate = (
  state: EditorState,
  nodeId: number,
  updater: PropsUpdater,
  errorTitle: string
) => {
  if (!state.adventure) return {};
  const nodeIndex = state.adventure.nodes.findIndex(
    (node) => node.nodeId === nodeId
  );
  if (nodeIndex === -1) return {};
  const node = state.adventure.nodes[nodeIndex];
  const rawInput =
    node.rawProps ?? (node.props as Record<string, unknown> | null) ?? {};
  const rawResult = updatePropsInput(rawInput, updater);
  if (!rawResult.ok) {
    toastError(errorTitle, rawResult.error);
    return {};
  }
  const propsInput = (node.props as Record<string, unknown> | null) ?? {};
  const propsResult = updatePropsInput(propsInput, updater);
  if (!propsResult.ok) {
    toastError(errorTitle, propsResult.error);
    return {};
  }
  if (!rawResult.changed && !propsResult.changed) return {};
  const nextNodes = [...state.adventure.nodes];
  nextNodes[nodeIndex] = {
    ...node,
    rawProps: rawResult.props,
    props: propsResult.props,
    changed: true,
  };
  return {
    adventure: { ...state.adventure, nodes: nextNodes },
    dirty: true,
    undoStack: pushHistory(state),
  };
};

const applyLinkPropsUpdate = (
  state: EditorState,
  linkId: number,
  updater: PropsUpdater,
  errorTitle: string
) => {
  if (!state.adventure) return {};
  const linkIndex = state.adventure.links.findIndex(
    (link) => link.linkId === linkId
  );
  if (linkIndex === -1) return {};
  const link = state.adventure.links[linkIndex];
  const propsInput = (link.props as Record<string, unknown> | null) ?? {};
  const propsResult = updatePropsInput(propsInput, updater);
  if (!propsResult.ok) {
    toastError(errorTitle, propsResult.error);
    return {};
  }
  if (!propsResult.changed) return {};
  const nextLinks = [...state.adventure.links];
  nextLinks[linkIndex] = {
    ...link,
    props: propsResult.props,
    changed: true,
  };
  return {
    adventure: { ...state.adventure, links: nextLinks },
    dirty: true,
    undoStack: pushHistory(state),
  };
};

const applyAdventurePropsUpdate = (
  state: EditorState,
  updater: PropsUpdater,
  errorTitle: string
) => {
  if (!state.adventure) return {};
  const propsInput =
    (state.adventure.props as Record<string, unknown> | null) ?? {};
  const propsResult = updatePropsInput(propsInput, updater);
  if (!propsResult.ok) {
    toastError(errorTitle, propsResult.error);
    return {};
  }
  if (!propsResult.changed) return {};
  return {
    adventure: { ...state.adventure, props: propsResult.props },
    dirty: true,
  };
};

export const propsSlice: EditorSlice = (set) => ({
  updateNodeProps: (nodeId, updates, options) => {
    if (!Object.keys(updates).length) return;
    set((state) =>
      applyNodePropsUpdate(
        state,
        nodeId,
        (props) => applyPropUpdates(props, updates, options),
        "Node props invalid"
      )
    );
  },
  setNodePropPath: (nodeId, path, value, options) => {
    set((state) =>
      applyNodePropsUpdate(
        state,
        nodeId,
        (props) => setAny(props, path, value, options),
        "Node props invalid"
      )
    );
  },
  setNodePropStringArraySelect: (nodeId, path, selectedValue, options) => {
    set((state) =>
      applyNodePropsUpdate(
        state,
        nodeId,
        (props) => setStringArraySelect(props, path, selectedValue, options),
        "Node props invalid"
      )
    );
  },
  setNodePropMultiSelect: (nodeId, path, values, options) => {
    set((state) =>
      applyNodePropsUpdate(
        state,
        nodeId,
        (props) => setMultiSelect(props, path, values, options),
        "Node props invalid"
      )
    );
  },
  updateLinkProps: (linkId, updates, options) => {
    if (!Object.keys(updates).length) return;
    set((state) =>
      applyLinkPropsUpdate(
        state,
        linkId,
        (props) => applyPropUpdates(props, updates, options),
        "Link props invalid"
      )
    );
  },
  setLinkPropPath: (linkId, path, value, options) => {
    set((state) =>
      applyLinkPropsUpdate(
        state,
        linkId,
        (props) => setAny(props, path, value, options),
        "Link props invalid"
      )
    );
  },
  updateAdventureProps: (updates, options) => {
    if (!Object.keys(updates).length) return;
    set((state) =>
      applyAdventurePropsUpdate(
        state,
        (props) => applyPropUpdates(props, updates, options),
        "Adventure props invalid"
      )
    );
  },
  setAdventurePropPath: (path, value, options) => {
    set((state) =>
      applyAdventurePropsUpdate(
        state,
        (props) => setAny(props, path, value, options),
        "Adventure props invalid"
      )
    );
  },
});
