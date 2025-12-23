"use client";

import { useEffect } from "react";
import {
  selectEditorAdventure,
  selectEditorClipboard,
  selectEditorSelectedLinkIds,
  selectEditorSelectedNodeIds,
  selectEditorSelection,
  selectEditorUndoStack,
  selectEditorViewportCenter,
  useEditorStore,
} from "../state/editorStore";

const pasteOffset = { x: 80, y: 80 };

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

export function EditorHotkeys() {
  const selection = useEditorStore(selectEditorSelection);
  const selectedNodeIds = useEditorStore(selectEditorSelectedNodeIds);
  const selectedLinkIds = useEditorStore(selectEditorSelectedLinkIds);
  const adventure = useEditorStore(selectEditorAdventure);
  const clipboard = useEditorStore(selectEditorClipboard);
  const undoStack = useEditorStore(selectEditorUndoStack);
  const viewportCenter = useEditorStore(selectEditorViewportCenter);
  const removeSelection = useEditorStore((s) => s.removeSelection);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);
  const copySelection = useEditorStore((s) => s.copySelection);
  const pasteClipboard = useEditorStore((s) => s.pasteClipboard);
  const undo = useEditorStore((s) => s.undo);
  const setSelectionToolActive = useEditorStore((s) => s.setSelectionToolActive);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

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
    clipboard?.nodes.length,
    duplicateNode,
    copySelection,
    pasteClipboard,
    removeSelection,
    selectedLinkIds,
    selectedNodeIds,
    selection,
    setSelectionToolActive,
    undo,
    undoStack.length,
    viewportCenter,
  ]);

  return null;
}
