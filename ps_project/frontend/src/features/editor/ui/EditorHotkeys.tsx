"use client";

import { useEffect } from "react";
import type { AdventureModel } from "@/domain/models";
import {
  selectEditorAdventure,
  selectEditorClipboard,
  selectEditorMenuShortcutPickIndex,
  selectEditorReadOnly,
  selectEditorSelectedLinkIds,
  selectEditorSelectedNodeIds,
  selectEditorSelection,
  selectEditorUndoStack,
  selectEditorViewportCenter,
  useEditorStore,
} from "../state/editorStore";
import { toastInfo } from "@/features/ui-core/toast";

const pasteOffset = { x: 80, y: 80 };
const linkedNodeOffset = { x: 240, y: 120 };
const orderedLinkKeys = ["ordered_link_ids", "button_order", "button-order"];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function readStringArray(value: unknown): string[] {
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
          return parsed.filter(
            (entry): entry is string => typeof entry === "string"
          );
        }
      } catch {
        return [trimmed];
      }
    }
    return [trimmed];
  }
  return [];
}

function getOrderedLinkTokens(node: AdventureModel["nodes"][number]) {
  const rawProps =
    (node.rawProps ?? (node.props as Record<string, unknown> | null) ?? {}) as Record<
      string,
      unknown
    >;
  for (const key of orderedLinkKeys) {
    if (key in rawProps) {
      return readStringArray(rawProps[key]);
    }
  }
  return [];
}

export function EditorHotkeys() {
  const selection = useEditorStore(selectEditorSelection);
  const selectedNodeIds = useEditorStore(selectEditorSelectedNodeIds);
  const selectedLinkIds = useEditorStore(selectEditorSelectedLinkIds);
  const menuShortcutPickIndex = useEditorStore(selectEditorMenuShortcutPickIndex);
  const readOnly = useEditorStore(selectEditorReadOnly);
  const adventure = useEditorStore(selectEditorAdventure);
  const clipboard = useEditorStore(selectEditorClipboard);
  const undoStack = useEditorStore(selectEditorUndoStack);
  const viewportCenter = useEditorStore(selectEditorViewportCenter);
  const removeSelection = useEditorStore((s) => s.removeSelection);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);
  const addNodeWithLink = useEditorStore((s) => s.addNodeWithLink);
  const setNodePropPath = useEditorStore((s) => s.setNodePropPath);
  const setSelectionSnapshot = useEditorStore((s) => s.setSelectionSnapshot);
  const setSelection = useEditorStore((s) => s.setSelection);
  const copySelection = useEditorStore((s) => s.copySelection);
  const pasteClipboard = useEditorStore((s) => s.pasteClipboard);
  const undo = useEditorStore((s) => s.undo);
  const setSelectionToolActive = useEditorStore((s) => s.setSelectionToolActive);
  const cancelMenuShortcutPick = useEditorStore((s) => s.cancelMenuShortcutPick);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menuShortcutPickIndex != null) {
        event.preventDefault();
        cancelMenuShortcutPick();
        return;
      }
      if (isEditableTarget(event.target)) return;
      if (readOnly) {
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedNodeIds.length || selectedLinkIds.length) {
          event.preventDefault();
          removeSelection(selectedNodeIds, selectedLinkIds);
        }
        return;
      }

      const key = event.key.toLowerCase();
      if (!event.metaKey && !event.ctrlKey && !event.altKey && key === "v") {
        event.preventDefault();
        setSelectionToolActive(true);
        return;
      }
      if (!event.metaKey && !event.ctrlKey && !event.altKey && key === "n") {
        event.preventDefault();
        if (selection.type !== "node" || selectedNodeIds.length !== 1) {
          toastInfo("Select a single node to create a linked node.");
          return;
        }
        const sourceNode = adventure?.nodes.find(
          (node) => node.nodeId === selection.nodeId
        );
        if (!sourceNode) return;
        const position = {
          x: sourceNode.position.x + linkedNodeOffset.x,
          y: sourceNode.position.y + linkedNodeOffset.y,
        };
        const created = addNodeWithLink(selection.nodeId, position);
        if (!created) return;
        const existingOrder = getOrderedLinkTokens(sourceNode);
        const linkToken = String(created.linkId);
        const nextOrder = existingOrder.includes(linkToken)
          ? existingOrder
          : [...existingOrder, linkToken];
        if (nextOrder !== existingOrder) {
          setNodePropPath(selection.nodeId, "ordered_link_ids", nextOrder);
        }
        setSelectionSnapshot([created.nodeId], []);
        setSelection({ type: "node", nodeId: created.nodeId });
        return;
      }

      const isShortcut = event.metaKey || event.ctrlKey;
      if (!isShortcut) return;

      if (key === "d") {
        if (selection.type === "node" && selectedNodeIds.length === 1) {
          event.preventDefault();
          duplicateNode(selection.nodeId);
        }
        return;
      }

      if (key === "c") {
        if (selectedNodeIds.length) {
          event.preventDefault();
          copySelection();
        }
        return;
      }

      if (key === "v") {
        if (clipboard?.nodes.length) {
          event.preventDefault();
          const primaryNode =
            selection.type === "node" && selectedNodeIds.length === 1
              ? adventure?.nodes.find((node) => node.nodeId === selection.nodeId) ??
                null
              : null;
          const target =
            primaryNode != null
              ? {
                  x: primaryNode.position.x + pasteOffset.x,
                  y: primaryNode.position.y + pasteOffset.y,
                }
              : viewportCenter ?? { x: 0, y: 0 };
          pasteClipboard(target);
        }
        return;
      }

      if (key === "z") {
        if (!event.shiftKey && undoStack.length) {
          event.preventDefault();
          undo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    adventure?.nodes,
    addNodeWithLink,
    clipboard?.nodes.length,
    duplicateNode,
    copySelection,
    pasteClipboard,
    removeSelection,
    selectedLinkIds,
    selectedNodeIds,
    selection,
    setNodePropPath,
    setSelection,
    setSelectionSnapshot,
    setSelectionToolActive,
    undo,
    undoStack.length,
    viewportCenter,
    menuShortcutPickIndex,
    cancelMenuShortcutPick,
    readOnly,
  ]);

  return null;
}
