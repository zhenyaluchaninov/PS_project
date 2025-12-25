"use client";

import { useEffect, useMemo } from "react";
import { API_BASE_URL, resolveApiUrl } from "@/features/state/api/client";
import {
  selectEditorAdventure,
  selectEditorDirty,
  selectEditorEditVersion,
  selectEditorError,
  selectEditorFocusNodeId,
  selectEditorSelectedLinkIds,
  selectEditorSelectedNodeIds,
  selectEditorSelection,
  selectEditorSelectionToolActive,
  selectEditorStatus,
  useEditorStore,
} from "../state/editorStore";
import { Toolbar } from "@/ui-core/Toolbar";
import EditorLayout from "@/features/ui-core/components/EditorLayout";
import { EditorHotkeys } from "./EditorHotkeys";
import { EditorInspector } from "./EditorInspector";
import { GraphCanvas } from "./graph/GraphCanvas";

type EditorRouteProps = {
  editSlug: string;
};

export function EditorRoute({ editSlug }: EditorRouteProps) {
  const status = useEditorStore(selectEditorStatus);
  const adventure = useEditorStore(selectEditorAdventure);
  const error = useEditorStore(selectEditorError);
  const dirty = useEditorStore(selectEditorDirty);
  const editVersion = useEditorStore(selectEditorEditVersion);
  const selection = useEditorStore(selectEditorSelection);
  const selectedNodeIds = useEditorStore(selectEditorSelectedNodeIds);
  const selectedLinkIds = useEditorStore(selectEditorSelectedLinkIds);
  const selectionToolActive = useEditorStore(selectEditorSelectionToolActive);
  const focusNodeId = useEditorStore(selectEditorFocusNodeId);
  const loadByEditSlug = useEditorStore((s) => s.loadByEditSlug);
  const setSelection = useEditorStore((s) => s.setSelection);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const setSelectionSnapshot = useEditorStore((s) => s.setSelectionSnapshot);
  const setViewportCenter = useEditorStore((s) => s.setViewportCenter);
  const clearFocusNode = useEditorStore((s) => s.clearFocusNode);
  const setSelectionToolActive = useEditorStore((s) => s.setSelectionToolActive);
  const updateNodePositions = useEditorStore((s) => s.updateNodePositions);
  const addLink = useEditorStore((s) => s.addLink);
  const addNodeWithLink = useEditorStore((s) => s.addNodeWithLink);

  useEffect(() => {
    void loadByEditSlug(editSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSlug]);

  useEffect(() => {
    clearSelection();
  }, [editSlug, clearSelection]);

  const toolbar = useMemo(() => {
    const title = adventure?.title;
    return (
      <Toolbar>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
          <span className="font-semibold uppercase tracking-[0.18em]">Editor</span>
          <span>
            /redigera/<span className="font-mono">{editSlug}</span>
          </span>
          {title ? <span className="text-[var(--text)]/80">{title}</span> : null}
          <span
            className={dirty
              ? "inline-flex items-center rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]"
              : "inline-flex items-center rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]"}
          >
            {dirty ? "Unsaved changes" : "No changes"}
          </span>
        </div>
      </Toolbar>
    );
  }, [adventure?.title, dirty, editSlug]);

  if (status === "loading" || status === "idle") {
    return (
      <EditorLayout
        toolbar={toolbar}
        graph={
          <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
            Loading editor data...
          </div>
        }
        sidePanel={
          <div className="flex h-full flex-col gap-3 px-5 py-4 text-sm text-[var(--muted)]">
            <p className="text-xs uppercase tracking-[0.24em]">Inspector</p>
            <p>Loading...</p>
          </div>
        }
      />
    );
  }

  if (status === "error" && error) {
    const apiBase = API_BASE_URL || "relative via Next rewrite (/api)";
    const attemptedUrl =
      error.url ?? resolveApiUrl(`/api/adventure/${editSlug}/edit`);
    const detail =
      typeof error.details === "string"
        ? error.details
        : error.details
          ? JSON.stringify(error.details, null, 2)
          : null;
    const isNotFound = error.status === 404;
    const isUnauthorized = error.status === 401 || error.status === 403;

    return (
      <EditorLayout
        toolbar={toolbar}
        graph={
          <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-xl space-y-3 text-[var(--text)]">
              <p className="text-sm font-semibold">
                {isNotFound
                  ? "Adventure not found"
                  : isUnauthorized
                    ? "Unauthorized / login required"
                    : "Could not load adventure"}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {error.status ? `${error.status}: ` : ""}
                {error.message}
              </p>
            </div>
          </div>
        }
        sidePanel={
          <div className="flex h-full flex-col">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                Inspector
              </p>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm text-[var(--muted)]">
              <p>
                {isUnauthorized
                  ? "Log in required to load edit mode."
                  : isNotFound
                    ? "Nothing to inspect."
                    : "Error state."}
              </p>
              <div className="rounded-lg bg-black/30 p-3 text-xs leading-relaxed text-red-50">
                <p>
                  API base: <span className="font-semibold">{apiBase}</span>
                </p>
                <p>
                  Request URL:{" "}
                  <span className="font-semibold">{attemptedUrl}</span>
                </p>
                {error.status ? (
                  <p>
                    Status: <span className="font-semibold">{error.status}</span>
                  </p>
                ) : null}
                {detail ? (
                  <pre className="mt-2 whitespace-pre-wrap break-words">
                    {detail}
                  </pre>
                ) : null}
              </div>
            </div>
          </div>
        }
      />
    );
  }

  if (status === "ready" && adventure) {
    return (
      <>
        <EditorLayout
          toolbar={toolbar}
          graph={
            <GraphCanvas
              adventure={adventure}
              editSlug={editSlug}
              editVersion={editVersion ?? null}
              selection={selection}
              selectedNodeIds={selectedNodeIds}
              selectedLinkIds={selectedLinkIds}
              selectionToolActive={selectionToolActive}
              onSelectionToolActiveChange={setSelectionToolActive}
              onSelectionChange={setSelection}
              onSelectionSnapshotChange={setSelectionSnapshot}
              onViewportCenterChange={setViewportCenter}
              focusNodeId={focusNodeId}
              onFocusNodeHandled={clearFocusNode}
              onNodePositionsChange={updateNodePositions}
              onCreateLink={addLink}
              onCreateNodeWithLink={addNodeWithLink}
            />
          }
          sidePanel={
            <EditorInspector />
          }
        />
        <EditorHotkeys />
      </>
    );
  }

  return null;
}

