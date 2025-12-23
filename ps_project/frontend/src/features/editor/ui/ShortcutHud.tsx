"use client";

import {
  selectEditorClipboard,
  selectEditorSelectedLinkIds,
  selectEditorSelectedNodeIds,
  selectEditorSelection,
  selectEditorSelectionToolActive,
  selectEditorUndoStack,
  useEditorStore,
} from "../state/editorStore";
type ShortcutHint = {
  keys: string;
  label: string;
};

export function ShortcutHud() {
  const selection = useEditorStore(selectEditorSelection);
  const selectedNodeIds = useEditorStore(selectEditorSelectedNodeIds);
  const selectedLinkIds = useEditorStore(selectEditorSelectedLinkIds);
  const clipboard = useEditorStore(selectEditorClipboard);
  const undoStack = useEditorStore(selectEditorUndoStack);
  const selectionToolActive = useEditorStore(selectEditorSelectionToolActive);

  const totalSelected = selectedNodeIds.length + selectedLinkIds.length;
  const hasSelection = totalSelected > 0;
  const hasSingleNode = selection.type === "node" && selectedNodeIds.length === 1;
  const hasNodeSelection = selectedNodeIds.length > 0;
  const hasClipboard = Boolean(clipboard?.nodes.length);
  const canUndo = undoStack.length > 0;

  const hints: ShortcutHint[] = [];

  if (!selectionToolActive) {
    hints.push({ keys: "V", label: "Select tool" });
  }
  if (hasSelection) {
    hints.push({ keys: "Del/Backspace", label: "Delete" });
  }
  if (hasNodeSelection) {
    hints.push({ keys: "Ctrl/Cmd+C", label: "Copy" });
  }
  if (hasSingleNode) {
    hints.push({ keys: "Ctrl/Cmd+D", label: "Duplicate" });
  }
  if (hasClipboard) {
    hints.push({ keys: "Ctrl/Cmd+V", label: "Paste" });
  }
  if (canUndo) {
    hints.push({ keys: "Ctrl/Cmd+Z", label: "Undo" });
  }

  if (hints.length === 0) return null;

  return (
    <div className="pointer-events-none">
      <div className="flex w-fit flex-wrap items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text)] shadow-[0_12px_28px_-22px_var(--border)]">
        {hints.map((hint) => (
          <span key={hint.label} className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)]">{hint.label}</span>
            <span className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[10px] font-semibold text-[var(--text)]">
              {hint.keys}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
