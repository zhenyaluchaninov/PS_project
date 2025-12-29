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
type AdventureNode = NonNullable<EditorState["adventure"]>["nodes"][number];

const readStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((entry): entry is string => typeof entry === "string");
        }
      } catch {
        return [trimmed];
      }
    }
    return [trimmed];
  }
  return [];
};

const getNodeChapterType = (node: AdventureNode): string => {
  const rawProps = (node.rawProps ?? {}) as Record<string, unknown>;
  const fallbackProps = (node.props as Record<string, unknown> | null) ?? {};
  const rawValue =
    rawProps.settings_chapterType ??
    rawProps.settingsChapterType ??
    rawProps.chapterType ??
    rawProps.chapter_type ??
    fallbackProps.settings_chapterType ??
    fallbackProps.settingsChapterType ??
    fallbackProps.chapterType ??
    fallbackProps.chapter_type;
  const values = readStringArray(rawValue);
  return values[0] ?? "";
};

const applyNodeStringArraySelect = (
  node: AdventureNode,
  path: string,
  selectedValue: string,
  options: StringArraySelectOptions | undefined,
  errorTitle: string
) => {
  const updater = (props: Record<string, unknown>) =>
    setStringArraySelect(props, path, selectedValue, options);
  const rawInput =
    node.rawProps ?? (node.props as Record<string, unknown> | null) ?? {};
  const rawResult = updatePropsInput(rawInput, updater);
  if (!rawResult.ok) {
    toastError(errorTitle, rawResult.error);
    return { node, changed: false };
  }
  const propsInput = (node.props as Record<string, unknown> | null) ?? {};
  const propsResult = updatePropsInput(propsInput, updater);
  if (!propsResult.ok) {
    toastError(errorTitle, propsResult.error);
    return { node, changed: false };
  }
  if (!rawResult.changed && !propsResult.changed) {
    return { node, changed: false };
  }
  return {
    node: {
      ...node,
      rawProps: rawResult.props,
      props: propsResult.props,
      changed: true,
    },
    changed: true,
  };
};

const applyNodePropsUpdate = (
  state: EditorState,
  nodeId: number,
  updater: PropsUpdater,
  errorTitle: string,
  options?: PropPathOptions
) => {
  if (state.readOnly) return {};
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
  const isTransient = Boolean(options?.transient);
  const nextNodes = [...state.adventure.nodes];
  nextNodes[nodeIndex] = {
    ...node,
    rawProps: rawResult.props,
    props: propsResult.props,
    changed: true,
  };
  const nextState: Partial<EditorState> = {
    adventure: { ...state.adventure, nodes: nextNodes },
  };
  if (!isTransient) {
    nextState.dirty = true;
    nextState.undoStack = pushHistory(state);
  }
  return nextState;
};

const applyLinkPropsUpdate = (
  state: EditorState,
  linkId: number,
  updater: PropsUpdater,
  errorTitle: string,
  options?: PropPathOptions
) => {
  if (state.readOnly) return {};
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
  const isTransient = Boolean(options?.transient);
  const nextLinks = [...state.adventure.links];
  nextLinks[linkIndex] = {
    ...link,
    props: propsResult.props,
    changed: true,
  };
  const nextState: Partial<EditorState> = {
    adventure: { ...state.adventure, links: nextLinks },
  };
  if (!isTransient) {
    nextState.dirty = true;
    nextState.undoStack = pushHistory(state);
  }
  return nextState;
};

const applyAdventurePropsUpdate = (
  state: EditorState,
  updater: PropsUpdater,
  errorTitle: string,
  options?: PropPathOptions
) => {
  if (state.readOnly) return {};
  if (!state.adventure) return {};
  const propsInput =
    (state.adventure.props as Record<string, unknown> | null) ?? {};
  const propsResult = updatePropsInput(propsInput, updater);
  if (!propsResult.ok) {
    toastError(errorTitle, propsResult.error);
    return {};
  }
  if (!propsResult.changed) return {};
  const isTransient = Boolean(options?.transient);
  const nextState: Partial<EditorState> = {
    adventure: { ...state.adventure, props: propsResult.props },
  };
  if (!isTransient) {
    nextState.dirty = true;
  }
  return nextState;
};

export const propsSlice: EditorSlice = (set) => ({
  updateNodeProps: (nodeId, updates, options) => {
    if (!Object.keys(updates).length) return;
    set((state) =>
      applyNodePropsUpdate(
        state,
        nodeId,
        (props) => applyPropUpdates(props, updates, options),
        "Node props invalid",
        options
      )
    );
  },
  setNodePropPath: (nodeId, path, value, options) => {
    set((state) =>
      applyNodePropsUpdate(
        state,
        nodeId,
        (props) => setAny(props, path, value, options),
        "Node props invalid",
        options
      )
    );
  },
  setNodePropStringArraySelect: (nodeId, path, selectedValue, options) => {
    if (path === "settings_chapterType") {
      set((state) => {
        if (state.readOnly) return {};
        if (!state.adventure) return {};
        const promoteToRoot = selectedValue === "start-node";
        let changed = false;
        const nodes = state.adventure.nodes.map((node) => {
          const isTarget = node.nodeId === nodeId;
          const currentChapterType = getNodeChapterType(node);
          let nextNode = node;
          let nodeChanged = false;

          if (
            isTarget ||
            (promoteToRoot &&
              currentChapterType === "start-node" &&
              node.nodeId !== nodeId)
          ) {
            const nextChapterType = isTarget ? selectedValue : "";
            const result = applyNodeStringArraySelect(
              nextNode,
              path,
              nextChapterType,
              options,
              "Node props invalid"
            );
            if (result.changed) {
              nextNode = result.node;
              nodeChanged = true;
            }
          }

          let nextType = nextNode.type;
          if (promoteToRoot) {
            if (isTarget) {
              nextType = "root";
            } else if (nextType === "root") {
              nextType = "default";
            }
          } else if (isTarget && nextType === "root") {
            nextType = "default";
          }

          if (nextType !== nextNode.type) {
            nextNode = { ...nextNode, type: nextType, changed: true };
            nodeChanged = true;
          } else if (nodeChanged && !nextNode.changed) {
            nextNode = { ...nextNode, changed: true };
          }

          if (nodeChanged) {
            changed = true;
          }

          return nextNode;
        });
        if (!changed) return {};
        return {
          adventure: { ...state.adventure, nodes },
          dirty: true,
          undoStack: pushHistory(state),
        };
      });
      return;
    }
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
        "Link props invalid",
        options
      )
    );
  },
  setLinkPropPath: (linkId, path, value, options) => {
    set((state) =>
      applyLinkPropsUpdate(
        state,
        linkId,
        (props) => setAny(props, path, value, options),
        "Link props invalid",
        options
      )
    );
  },
  updateAdventureProps: (updates, options) => {
    if (!Object.keys(updates).length) return;
    set((state) =>
      applyAdventurePropsUpdate(
        state,
        (props) => applyPropUpdates(props, updates, options),
        "Adventure props invalid",
        options
      )
    );
  },
  setAdventurePropPath: (path, value, options) => {
    set((state) =>
      applyAdventurePropsUpdate(
        state,
        (props) => setAny(props, path, value, options),
        "Adventure props invalid",
        options
      )
    );
  },
});
