"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { LinkModel, NodeModel } from "@/domain/models";
import { LabelValue } from "@/features/ui-core/LabelValue";
import { Button } from "@/features/ui-core/primitives/button";
import { selectEditorReadOnly, useEditorStore } from "@/features/editor/state/editorStore";
import { cn } from "@/lib/utils";
import { CollapsibleSection } from "./CollapsibleSection";
import { InspectorShell } from "./InspectorShell";
import { ChevronDown, X } from "lucide-react";

type LinkInspectorPanelProps = {
  link: LinkModel;
};

export function LinkInspectorPanel({ link }: LinkInspectorPanelProps) {
  const updateLinkFields = useEditorStore((s) => s.updateLinkFields);
  const updateLinkProps = useEditorStore((s) => s.updateLinkProps);
  const setLinkPropPath = useEditorStore((s) => s.setLinkPropPath);
  const swapLinkDirection = useEditorStore((s) => s.swapLinkDirection);
  const removeLinks = useEditorStore((s) => s.removeLinks);
  const readOnly = useEditorStore(selectEditorReadOnly);
  const nodes = useEditorStore((s) => s.adventure?.nodes ?? []);
  const sortedNodes = useMemo(
    () => [...nodes].sort((a, b) => a.nodeId - b.nodeId),
    [nodes]
  );
  const nodeTitleMap = useMemo(() => {
    const map = new Map<number, NodeModel>();
    nodes.forEach((node) => map.set(node.nodeId, node));
    return map;
  }, [nodes]);
  const nodeLabelSeparator = "\u2014";
  const formatNodeLabel = (nodeId: number, title: string) =>
    `#${nodeId} ${nodeLabelSeparator} ${title || "Untitled"}`;
  const resolveNodeTitle = (nodeId: number) => {
    const title = nodeTitleMap.get(nodeId)?.title?.trim() ?? "";
    return title || `#${nodeId}`;
  };
  const isBidirectional =
    String(link.type ?? "").toLowerCase() === "bidirectional";
  const targetTitle = link.targetTitle ?? "";
  const sourceTitle = link.sourceTitle ?? "";
  const targetPlaceholder = resolveNodeTitle(link.target);
  const sourcePlaceholder = resolveNodeTitle(link.source);
  const arrow = isBidirectional ? "<->" : "->";
  const positiveNodes = readConditionList(link.props, [
    "positiveNodeList",
    "positive_node_list",
    "positiveNodes",
    "positive_nodes",
  ]);
  const negativeNodes = readConditionList(link.props, [
    "negativeNodeList",
    "negative_node_list",
    "negativeNodes",
    "negative_nodes",
  ]);
  const hasConditions = positiveNodes.length > 0 || negativeNodes.length > 0;
  const conditionBehaviorOverride = useMemo(() => {
    if (!link.props) return "";
    const raw =
      link.props.conditionBehavior ?? link.props.condition_behavior ?? "";
    if (typeof raw !== "string") return "";
    const token = raw.trim().toLowerCase();
    if (token === "hide") return "hide";
    if (token === "dim" || token === "transparency") return "dim";
    return "";
  }, [link.props]);
  const handleAddCondition = (
    key: "positiveNodeList" | "negativeNodeList",
    nodeId: string
  ) => {
    if (!nodeId) return;
    const current = key === "positiveNodeList" ? positiveNodes : negativeNodes;
    if (current.includes(nodeId)) return;
    const next = [...current, nodeId];
    updateLinkProps(link.linkId, { [key]: next });
  };
  const handleRemoveCondition = (
    key: "positiveNodeList" | "negativeNodeList",
    nodeId: string
  ) => {
    const current = key === "positiveNodeList" ? positiveNodes : negativeNodes;
    const next = current.filter((entry) => entry !== nodeId);
    updateLinkProps(link.linkId, { [key]: next });
  };
  const resolveNodeLabel = (nodeId: string) => {
    const numericId = Number(nodeId);
    if (!Number.isFinite(numericId)) {
      return `#${nodeId} ${nodeLabelSeparator} Missing node`;
    }
    const title = nodeTitleMap.get(numericId)?.title?.trim() ?? "";
    if (!title && !nodeTitleMap.has(numericId)) {
      return `#${numericId} ${nodeLabelSeparator} Missing node`;
    }
    return formatNodeLabel(numericId, title);
  };
  const isMissingNode = (nodeId: string) => {
    const numericId = Number(nodeId);
    if (!Number.isFinite(numericId)) return true;
    return !nodeTitleMap.has(numericId);
  };

  return (
    <InspectorShell title="Link settings" meta={`#${link.linkId}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard
          label="Connection"
          value={
            <span className="inline-flex items-center gap-2 font-mono">
              <span>#{link.source}</span>
              <span className="text-[var(--muted)]">{arrow}</span>
              <span>#{link.target}</span>
            </span>
          }
          className="sm:col-span-2"
        />
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
            Forward label
          </label>
          <input
            type="text"
            value={targetTitle}
            placeholder={targetPlaceholder}
            onChange={(event) =>
              updateLinkFields(link.linkId, { targetTitle: event.target.value })
            }
            disabled={readOnly}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
            Link type
          </label>
          <select
            value={isBidirectional ? "bidirectional" : "default"}
            onChange={(event) =>
              updateLinkFields(link.linkId, { type: event.target.value })
            }
            disabled={readOnly}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
          >
            <option value="default">Default</option>
            <option value="bidirectional">Bidirectional</option>
          </select>
        </div>
        {isBidirectional ? (
          <div className="space-y-2">
            <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
              Reverse label
            </label>
            <input
              type="text"
              value={sourceTitle}
              placeholder={sourcePlaceholder}
              onChange={(event) =>
                updateLinkFields(link.linkId, {
                  sourceTitle: event.target.value,
                })
              }
              disabled={readOnly}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
            />
          </div>
        ) : null}
        {!isBidirectional ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => swapLinkDirection(link.linkId)}
            disabled={readOnly}
            className="w-full"
          >
            Change direction
          </Button>
        ) : null}
        <div className="overflow-visible rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
          <CollapsibleSection
            title="Conditions"
            sectionKey="editor.link.conditions"
          >
            <ConditionEditor
              label="Show if all visited"
              helper="Select nodes that must have been visited."
              onAdd={(nodeId) => handleAddCondition("positiveNodeList", nodeId)}
              disabled={readOnly}
              selectedNodes={positiveNodes}
              options={sortedNodes}
              onRemove={(nodeId) =>
                handleRemoveCondition("positiveNodeList", nodeId)
              }
              resolveLabel={resolveNodeLabel}
              isMissingNode={isMissingNode}
            />
            <ConditionEditor
              label="Hide if all visited"
              helper="Select nodes that hide this link."
              onAdd={(nodeId) => handleAddCondition("negativeNodeList", nodeId)}
              disabled={readOnly}
              selectedNodes={negativeNodes}
              options={sortedNodes}
              onRemove={(nodeId) =>
                handleRemoveCondition("negativeNodeList", nodeId)
              }
              resolveLabel={resolveNodeLabel}
              isMissingNode={isMissingNode}
            />
            {hasConditions ? (
              <div className="space-y-2 border-t border-[var(--border)] pt-3">
                <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                  Condition behavior
                </label>
                <select
                  value={conditionBehaviorOverride}
                  onChange={(event) =>
                    setLinkPropPath(
                      link.linkId,
                      "conditionBehavior",
                      event.target.value,
                      { removeIfEmpty: true }
                    )
                  }
                  disabled={readOnly}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                >
                  <option value="">Use node default</option>
                  <option value="hide">Hide button</option>
                  <option value="dim">Dim button</option>
                </select>
                <p className="text-xs text-[var(--muted)]">
                  Overrides the node's default conditioned appearance for this link only
                </p>
              </div>
            ) : null}
          </CollapsibleSection>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => removeLinks([link.linkId])}
          disabled={readOnly}
          className="w-full border-[var(--danger)] text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[var(--bg-hover)]"
        >
          Delete link
        </Button>
      </div>
    </InspectorShell>
  );
}

function readConditionList(
  props: Record<string, unknown> | null,
  keys: string[]
): string[] {
  if (!props) return [];
  const value = keys.reduce<unknown>(
    (acc, key) => (acc !== undefined ? acc : props[key]),
    undefined
  );
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
          return parsed
            .map((entry) => String(entry))
            .filter((entry) => entry.length > 0);
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
}

function InfoCard({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2",
        className
      )}
    >
      <LabelValue label={label} value={value} className="gap-1" />
    </div>
  );
}

function ConditionEditor({
  label,
  helper,
  onAdd,
  selectedNodes,
  options,
  onRemove,
  resolveLabel,
  isMissingNode,
  disabled = false,
}: {
  label: string;
  helper: string;
  onAdd: (nodeId: string) => void;
  selectedNodes: string[];
  options: NodeModel[];
  onRemove: (nodeId: string) => void;
  resolveLabel: (nodeId: string) => string;
  isMissingNode: (nodeId: string) => boolean;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selectedSet = useMemo(
    () => new Set(selectedNodes.map((nodeId) => String(nodeId))),
    [selectedNodes]
  );
  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return options.filter((node) => {
      const id = String(node.nodeId);
      if (selectedSet.has(id)) return false;
      if (!normalized) return true;
      const title = node.title?.trim().toLowerCase() ?? "";
      if (title.includes(normalized)) return true;
      if (id.includes(normalized.replace(/^#/, ""))) return true;
      return false;
    });
  }, [options, query, selectedSet]);
  const showDropdown = open && !disabled;
  const handleSelect = (nodeId: number) => {
    onAdd(String(nodeId));
    setQuery("");
    setOpen(false);
  };
  const handleBlur = () => {
    window.setTimeout(() => setOpen(false), 80);
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
        <p className="text-xs text-[var(--muted)]">{helper}</p>
      </div>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder="Search nodes..."
          disabled={disabled}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 pr-9 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
        />
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden="true"
        />
        {showDropdown ? (
          <div className="absolute z-20 mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] shadow-[0_16px_36px_-24px_var(--border)]">
            <div className="max-h-52 overflow-y-auto py-1">
              {filteredOptions.length ? (
                filteredOptions.map((node) => (
                  <button
                    key={node.nodeId}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(node.nodeId)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-[var(--text)] transition hover:bg-[var(--bg-hover)]"
                  >
                    <span className="truncate">
                      {resolveLabel(String(node.nodeId))}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-[var(--muted)]">
                  No matching nodes.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
      {selectedNodes.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">No nodes selected.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {selectedNodes.map((nodeId) => {
            const missing = isMissingNode(nodeId);
            return (
              <div
                key={nodeId}
                className={cn(
                  "flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text-secondary)]",
                  missing && "border-[var(--warning)] text-[var(--warning)]"
                )}
              >
                <span className={cn("truncate", missing && "line-through")}>
                  {resolveLabel(nodeId)}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(nodeId)}
                  disabled={disabled}
                  className={cn(
                    "rounded-full border border-transparent p-0.5 text-[var(--muted)] transition hover:border-[var(--border)] hover:text-[var(--text)]",
                    disabled && "pointer-events-none opacity-50"
                  )}
                  aria-label={`Remove node ${nodeId}`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
