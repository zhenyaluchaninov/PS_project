"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { NodeModel } from "@/domain/models";
import {
  selectEditorAdventure,
  selectEditorNodeInspectorTab,
  selectEditorSelectedLinkIds,
  selectEditorSelectedNodeIds,
  selectEditorSelection,
  useEditorStore,
} from "../state/editorStore";
import {
  AdventureInspectorPanel,
  LinkInspectorPanel,
  NodeInspectorPanel,
} from "./components";
import type { BulkDraft, BulkDraftEntry } from "./types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/features/ui-core/primitives/dialog";
import { Button } from "@/features/ui-core/primitives/button";

export function InspectorRouter() {
  const adventure = useEditorStore(selectEditorAdventure);
  const editSlug = useEditorStore((s) => s.editSlug);
  const selection = useEditorStore(selectEditorSelection);
  const activeTab = useEditorStore(selectEditorNodeInspectorTab);
  const setActiveTab = useEditorStore((s) => s.setNodeInspectorTab);
  const updateNodeTitle = useEditorStore((s) => s.updateNodeTitle);
  const updateNodeText = useEditorStore((s) => s.updateNodeText);
  const updateNodeImageUrl = useEditorStore((s) => s.updateNodeImageUrl);
  const updateNodeProps = useEditorStore((s) => s.updateNodeProps);
  const setNodePropPath = useEditorStore((s) => s.setNodePropPath);
  const setNodePropStringArraySelect = useEditorStore(
    (s) => s.setNodePropStringArraySelect
  );
  const selectedNodeIds = useEditorStore(selectEditorSelectedNodeIds);
  const selectedLinkIds = useEditorStore(selectEditorSelectedLinkIds);

  const [bulkDraft, setBulkDraft] = useState<BulkDraft>({});
  const [bulkApplyOpen, setBulkApplyOpen] = useState(false);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);
  const [bulkSelectionSnapshot, setBulkSelectionSnapshot] = useState<number[]>([]);

  const bulkActive = selectedNodeIds.length >= 2;
  const bulkDraftEntries = useMemo(
    () => Object.values(bulkDraft).sort((a, b) => a.path.localeCompare(b.path)),
    [bulkDraft]
  );
  const bulkHasDraft = bulkDraftEntries.length > 0;

  const nodeById = useMemo(() => {
    const map = new Map<number, NodeModel>();
    if (adventure) {
      adventure.nodes.forEach((node) => map.set(node.nodeId, node));
    }
    return map;
  }, [adventure]);

  useEffect(() => {
    const hasDraft = Object.keys(bulkDraft).length > 0;
    if (!bulkActive) {
      if (hasDraft) {
        setBulkDraft({});
        setBulkNotice("Bulk draft discarded because selection changed.");
        setBulkApplyOpen(false);
      }
      if (bulkSelectionSnapshot.length > 0) {
        setBulkSelectionSnapshot([]);
      }
      return;
    }

    if (!hasDraft) {
      if (
        selectedNodeIds.length !== bulkSelectionSnapshot.length ||
        selectedNodeIds.some((id, index) => id !== bulkSelectionSnapshot[index])
      ) {
        setBulkSelectionSnapshot(selectedNodeIds);
      }
      return;
    }

    const selectionChanged =
      selectedNodeIds.length !== bulkSelectionSnapshot.length ||
      selectedNodeIds.some((id, index) => id !== bulkSelectionSnapshot[index]);
    if (selectionChanged) {
      setBulkDraft({});
      setBulkSelectionSnapshot(selectedNodeIds);
      setBulkNotice("Bulk draft discarded because selection changed.");
      setBulkApplyOpen(false);
    }
  }, [bulkActive, bulkDraft, bulkSelectionSnapshot, selectedNodeIds]);

  const handleBulkStage = useCallback(
    (entry: BulkDraftEntry) => {
      setBulkDraft((prev) => ({ ...prev, [entry.path]: entry }));
      setBulkNotice(null);
      setBulkSelectionSnapshot((snapshot) =>
        snapshot.length === 0 ? selectedNodeIds : snapshot
      );
    },
    [selectedNodeIds]
  );

  const handleBulkClear = useCallback((paths: string | string[]) => {
    const list = Array.isArray(paths) ? paths : [paths];
    setBulkDraft((prev) => {
      const next = { ...prev };
      list.forEach((path) => delete next[path]);
      return next;
    });
  }, []);

  const handleBulkDiscard = useCallback(() => {
    setBulkDraft({});
    setBulkNotice(null);
  }, []);

  const handleBulkApply = useCallback(() => {
    if (!bulkHasDraft) {
      setBulkApplyOpen(false);
      return;
    }
    selectedNodeIds.forEach((nodeId) => {
      bulkDraftEntries.forEach((entry) => {
        if (entry.kind === "nodeTitle") {
          updateNodeTitle(nodeId, String(entry.value ?? ""));
          return;
        }
        if (entry.kind === "nodeText") {
          updateNodeText(nodeId, String(entry.value ?? ""));
          return;
        }
        if (entry.kind === "propStringArray") {
          const nextValue =
            entry.op === "unset" ? "" : String(entry.value ?? "");
          setNodePropStringArraySelect(
            nodeId,
            entry.path,
            nextValue,
            entry.op === "unset" ? { removeIfEmpty: true } : undefined
          );
          return;
        }
        const nextValue = entry.op === "unset" ? null : entry.value;
        setNodePropPath(
          nodeId,
          entry.path,
          nextValue,
          entry.op === "unset" ? { removeIfEmpty: true } : undefined
        );
      });
    });
    setBulkDraft({});
    setBulkApplyOpen(false);
  }, [
    bulkDraftEntries,
    bulkHasDraft,
    selectedNodeIds,
    setNodePropPath,
    setNodePropStringArraySelect,
    updateNodeText,
    updateNodeTitle,
  ]);

  if (!adventure) {
    return <div className="h-full" />;
  }

  const selectedNode =
    selection.type === "node" ? nodeById.get(selection.nodeId) ?? null : null;
  const selectedLink =
    selection.type === "link"
      ? adventure.links.find((link) => link.linkId === selection.linkId)
      : null;

  const primaryNodeId = bulkActive
    ? selection.type === "node" && selectedNodeIds.includes(selection.nodeId)
      ? selection.nodeId
      : selectedNodeIds[0]
    : selection.type === "node"
      ? selection.nodeId
      : null;
  const primaryNode = primaryNodeId ? nodeById.get(primaryNodeId) ?? null : null;
  const outgoingLinks = primaryNode
    ? adventure.links
        .filter((link) => link.source === primaryNode.nodeId)
        .map((link) => ({
          linkId: link.linkId,
          targetId: link.target,
          label:
            (link.label && link.label.trim()) ||
            nodeById.get(link.target)?.title ||
            `#${link.target}`,
        }))
    : [];

  const bulkTargets = selectedNodeIds
    .map((nodeId) => nodeById.get(nodeId))
    .filter((node): node is NodeModel => Boolean(node));

  const formatBulkValue = (value: unknown) => {
    if (value === null || value === undefined) return "(empty)";
    if (Array.isArray(value)) {
      if (value.length === 0) return "(empty)";
      const items = value.map((entry) => String(entry));
      const preview = items.slice(0, 4).join(", ");
      return items.length > 4
        ? `${preview} ... (+${items.length - 4})`
        : preview;
    }
    if (typeof value === "string") {
      const stripped = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      if (!stripped) return "(empty)";
      return stripped.length > 80 ? `${stripped.slice(0, 77)}...` : stripped;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    try {
      const serialized = JSON.stringify(value);
      if (!serialized) return "(empty)";
      return serialized.length > 80 ? `${serialized.slice(0, 77)}...` : serialized;
    } catch {
      return String(value);
    }
  };

  if (bulkActive && primaryNode) {
    return (
      <>
        <NodeInspectorPanel
          node={primaryNode}
          editSlug={editSlug}
          fontList={adventure.props?.fontList}
          outgoingLinks={outgoingLinks}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onTitleChange={(title) => updateNodeTitle(primaryNode.nodeId, title)}
          onTextChange={(text) => updateNodeText(primaryNode.nodeId, text)}
          onNodeImageUrlChange={(url) =>
            updateNodeImageUrl(primaryNode.nodeId, url)
          }
          onNodeTypeChange={(chapterType) =>
            setNodePropStringArraySelect(
              primaryNode.nodeId,
              "settings_chapterType",
              chapterType
            )
          }
          onNodePropChange={(path, value) =>
            setNodePropPath(primaryNode.nodeId, path, value)
          }
          onNodePropsChange={(updates) =>
            updateNodeProps(primaryNode.nodeId, updates)
          }
          bulk={{
            active: true,
            selectedNodeCount: selectedNodeIds.length,
            selectedLinkCount: selectedLinkIds.length,
            draft: bulkDraft,
            notice: bulkNotice,
            onStage: handleBulkStage,
            onClear: handleBulkClear,
            onDiscardAll: handleBulkDiscard,
            onRequestApply: () => setBulkApplyOpen(true),
          }}
        />
        <Dialog open={bulkApplyOpen} onOpenChange={setBulkApplyOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply bulk changes</DialogTitle>
              <DialogDescription>
                Review the staged updates before applying them to the current
                selection.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Nodes ({bulkTargets.length})
                </p>
                <div className="mt-2 max-h-36 space-y-1 overflow-y-auto text-xs text-[var(--text-secondary)]">
                  {bulkTargets.map((node) => (
                    <div
                      key={node.nodeId}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="font-mono text-[var(--muted)]">
                        #{node.nodeId}
                      </span>
                      <span className="truncate">
                        {node.title || `Node ${node.nodeId}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Staged fields ({bulkDraftEntries.length})
                </p>
                <div className="mt-2 max-h-40 space-y-2 overflow-y-auto text-xs text-[var(--text-secondary)]">
                  {bulkDraftEntries.map((entry) => (
                    <div key={entry.path} className="space-y-1">
                      <p className="font-mono text-[var(--text)]">
                        {entry.path}
                      </p>
                      <p className="text-[var(--muted)]">
                        {formatBulkValue(entry.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBulkApplyOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleBulkApply}
                disabled={!bulkHasDraft}
              >
                Apply changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (selection.type === "node" && selectedNode) {
    return (
      <NodeInspectorPanel
        node={selectedNode}
        editSlug={editSlug}
        fontList={adventure.props?.fontList}
        outgoingLinks={outgoingLinks}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onTitleChange={(title) => updateNodeTitle(selectedNode.nodeId, title)}
        onTextChange={(text) => updateNodeText(selectedNode.nodeId, text)}
        onNodeImageUrlChange={(url) =>
          updateNodeImageUrl(selectedNode.nodeId, url)
        }
        onNodeTypeChange={(chapterType) =>
          setNodePropStringArraySelect(
            selectedNode.nodeId,
            "settings_chapterType",
            chapterType
          )
        }
        onNodePropChange={(path, value) =>
          setNodePropPath(selectedNode.nodeId, path, value)
        }
        onNodePropsChange={(updates) =>
          updateNodeProps(selectedNode.nodeId, updates)
        }
      />
    );
  }

  if (selection.type === "link" && selectedLink) {
    return <LinkInspectorPanel link={selectedLink} />;
  }

  return <AdventureInspectorPanel adventure={adventure} />;
}
