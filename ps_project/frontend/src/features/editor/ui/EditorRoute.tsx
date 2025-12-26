"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL, resolveApiUrl } from "@/features/state/api/client";
import {
  selectEditorAdventure,
  selectEditorDirty,
  selectEditorError,
  selectEditorFocusNodeId,
  selectEditorMenuShortcutPickIndex,
  selectEditorReadOnly,
  selectEditorSaveError,
  selectEditorSaveStatus,
  selectEditorSelectedLinkIds,
  selectEditorSelectedNodeIds,
  selectEditorSelection,
  selectEditorSelectionToolActive,
  selectEditorStatus,
  useEditorStore,
} from "../state/editorStore";
import { Toolbar } from "@/features/ui-core/Toolbar";
import EditorLayout from "@/features/ui-core/components/EditorLayout";
import { EditorHotkeys } from "./EditorHotkeys";
import { EditorInspector } from "./EditorInspector";
import { GraphCanvas } from "./graph/GraphCanvas";
import { Button } from "@/features/ui-core/primitives";
import { useEditorAutosave } from "../hooks/useEditorAutosave";
import { cn } from "@/lib/utils";

type EditorRouteProps = {
  editSlug: string;
};

export function EditorRoute({ editSlug }: EditorRouteProps) {
  const status = useEditorStore(selectEditorStatus);
  const adventure = useEditorStore(selectEditorAdventure);
  const error = useEditorStore(selectEditorError);
  const dirty = useEditorStore(selectEditorDirty);
  const saveStatus = useEditorStore(selectEditorSaveStatus);
  const saveError = useEditorStore(selectEditorSaveError);
  const readOnly = useEditorStore(selectEditorReadOnly);
  const [hasSeenChanges, setHasSeenChanges] = useState(false);
  const [lockBannerDismissed, setLockBannerDismissed] = useState(false);
  const selection = useEditorStore(selectEditorSelection);
  const selectedNodeIds = useEditorStore(selectEditorSelectedNodeIds);
  const selectedLinkIds = useEditorStore(selectEditorSelectedLinkIds);
  const selectionToolActive = useEditorStore(selectEditorSelectionToolActive);
  const focusNodeId = useEditorStore(selectEditorFocusNodeId);
  const menuShortcutPickIndex = useEditorStore(selectEditorMenuShortcutPickIndex);
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
  const applyMenuShortcutPick = useEditorStore((s) => s.applyMenuShortcutPick);
  const { draftPromptOpen, recoverDraft, discardDraft, retrySave } =
    useEditorAutosave(editSlug);

  useEffect(() => {
    void loadByEditSlug(editSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSlug]);

  useEffect(() => {
    clearSelection();
  }, [editSlug, clearSelection]);

  useEffect(() => {
    setHasSeenChanges(false);
  }, [editSlug]);

  useEffect(() => {
    if (dirty || saveStatus === "saved" || saveStatus === "dirty") {
      setHasSeenChanges(true);
    }
  }, [dirty, saveStatus]);

  useEffect(() => {
    if (saveStatus === "locked") {
      setLockBannerDismissed(false);
    }
  }, [saveStatus]);

  const lockBannerVisible = saveStatus === "locked" && !lockBannerDismissed;

  const handleReloadFromServer = () => {
    setLockBannerDismissed(true);
    void loadByEditSlug(editSlug);
  };

  const toolbar = useMemo(() => {
    const title = adventure?.title;
    const statusLabel =
      saveStatus === "locked"
        ? "Locked / read-only"
        : saveStatus === "error"
          ? "Error saving"
          : saveStatus === "saving"
            ? "Saving..."
            : saveStatus === "dirty"
              ? "Unsaved changes"
              : saveStatus === "saved"
                ? "Saved"
                : hasSeenChanges
                  ? "Saved"
                  : "No changes";
    const statusTone =
      saveStatus === "locked"
        ? "warning"
        : saveStatus === "error"
          ? "danger"
          : saveStatus === "saving"
            ? "accent"
            : saveStatus === "dirty"
              ? "warning"
              : statusLabel === "Saved"
                ? "success"
                : "muted";
    return (
      <Toolbar>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
          <span className="font-semibold uppercase tracking-[0.18em]">Editor</span>
          <span>
            /redigera/<span className="font-mono">{editSlug}</span>
          </span>
          {title ? <span className="text-[var(--text)]/80">{title}</span> : null}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span
            title={saveError ?? undefined}
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
              statusTone === "accent" &&
                "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]",
              statusTone === "success" &&
                "border-[var(--success)] bg-[var(--bg-tertiary)] text-[var(--success)]",
              statusTone === "warning" &&
                "border-[var(--warning)] bg-[var(--bg-tertiary)] text-[var(--warning)]",
              statusTone === "danger" &&
                "border-[var(--danger)] bg-[var(--bg-tertiary)] text-[var(--danger)]",
              statusTone === "muted" &&
                "border-[var(--border)] text-[var(--muted)]"
            )}
          >
            {statusLabel}
          </span>
          {saveStatus === "error" ? (
            <Button size="sm" variant="outline" onClick={retrySave}>
              Reconnect
            </Button>
          ) : null}
          {draftPromptOpen ? (
            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              <span>Draft available</span>
              <Button size="sm" variant="secondary" onClick={recoverDraft}>
                Recover
              </Button>
              <Button size="sm" variant="ghost" onClick={discardDraft}>
                Discard
              </Button>
            </div>
          ) : null}
        </div>
      </Toolbar>
    );
  }, [
    adventure?.title,
    discardDraft,
    draftPromptOpen,
    editSlug,
    hasSeenChanges,
    recoverDraft,
    retrySave,
    saveError,
    saveStatus,
  ]);

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
          banner={
            lockBannerVisible ? (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--text-secondary)]">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[var(--text)]">
                    Adventure locked
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    This adventure is locked for editing (opened elsewhere). You are in read-only
                    mode.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleReloadFromServer}>
                    Reload from server
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setLockBannerDismissed(true)}
                  >
                    Keep local draft
                  </Button>
                </div>
              </div>
            ) : null
          }
          graph={
            <GraphCanvas
              adventure={adventure}
              selection={selection}
              selectedNodeIds={selectedNodeIds}
              selectedLinkIds={selectedLinkIds}
              selectionToolActive={selectionToolActive}
              menuShortcutPickIndex={menuShortcutPickIndex}
              onMenuShortcutPick={applyMenuShortcutPick}
              onSelectionToolActiveChange={setSelectionToolActive}
              onSelectionChange={setSelection}
              onSelectionSnapshotChange={setSelectionSnapshot}
              onViewportCenterChange={setViewportCenter}
              focusNodeId={focusNodeId}
              onFocusNodeHandled={clearFocusNode}
              onNodePositionsChange={updateNodePositions}
              onCreateLink={addLink}
              onCreateNodeWithLink={addNodeWithLink}
              readOnly={readOnly}
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

