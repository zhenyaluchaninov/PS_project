"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MousePointer2, Search, X } from "lucide-react";
import type { AdventureModel } from "@/domain/models";
import {
  selectEditorSelectionToolActive,
  selectEditorToolPanel,
  useEditorStore,
} from "../state/editorStore";
import { cn } from "@/lib/utils";

type EditorToolStripProps = {
  adventure: AdventureModel;
};

export function EditorToolStrip({ adventure }: EditorToolStripProps) {
  const selectionToolActive = useEditorStore(selectEditorSelectionToolActive);
  const toolPanel = useEditorStore(selectEditorToolPanel);
  const setSelectionToolActive = useEditorStore((s) => s.setSelectionToolActive);
  const setToolPanel = useEditorStore((s) => s.setToolPanel);
  const setFocusNodeId = useEditorStore((s) => s.setFocusNodeId);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isSearchOpen = toolPanel === "search";

  useEffect(() => {
    if (!isSearchOpen) return;
    inputRef.current?.focus();
  }, [isSearchOpen]);

  const sortedNodes = useMemo(
    () => [...adventure.nodes].sort((a, b) => a.nodeId - b.nodeId),
    [adventure.nodes]
  );

  const filteredNodes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sortedNodes;
    const idQuery = normalized.startsWith("#") ? normalized.slice(1) : normalized;
    return sortedNodes.filter((node) => {
      const title = (node.title || `Node ${node.nodeId}`).toLowerCase();
      if (title.includes(normalized)) return true;
      if (idQuery && String(node.nodeId).includes(idQuery)) return true;
      return false;
    });
  }, [query, sortedNodes]);

  return (
    <div className="relative h-full w-12 border-r border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex h-full flex-col items-center px-2 py-3">
        <div className="flex flex-col items-center gap-2 p-2">
          <button
            type="button"
            onClick={() => setToolPanel(isSearchOpen ? null : "search")}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md border text-[var(--text)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]",
              isSearchOpen
                ? "border-[var(--accent)] bg-[var(--bg-tertiary)]"
                : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-light)]"
            )}
            aria-label="Search"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="relative flex flex-col items-center">
            <button
              type="button"
              onClick={() => setSelectionToolActive(!selectionToolActive)}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-md border text-[var(--text)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]",
                selectionToolActive
                  ? "border-[var(--accent)] bg-[var(--bg-tertiary)]"
                  : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-light)]"
              )}
              aria-label="Selection tool"
            >
              <MousePointer2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {isSearchOpen ? (
        <div className="absolute left-full top-3 ml-3 w-[260px]">
          <div className="flex h-[60vh] max-h-[480px] flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[0_16px_36px_-24px_var(--border)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Search nodes
              </span>
              <button
                type="button"
                onClick={() => setToolPanel(null)}
                className="rounded-md border border-[var(--border)] bg-[var(--bg)] p-1 text-[var(--muted)] transition hover:border-[var(--border-light)] hover:text-[var(--text)]"
                aria-label="Close search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-3">
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title or #id"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-muted)]"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-3">
              {filteredNodes.length ? (
                filteredNodes.map((node) => (
                  <button
                    key={node.nodeId}
                    type="button"
                    onClick={() => setFocusNodeId(node.nodeId)}
                    className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm text-[var(--text)] transition hover:bg-[var(--bg-hover)]"
                  >
                    <span className="truncate">
                      {node.title || `Node ${node.nodeId}`}
                    </span>
                    <span className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs font-mono text-[var(--muted)]">
                      #{node.nodeId}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-2 py-4 text-sm text-[var(--muted)]">
                  No matching nodes.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
