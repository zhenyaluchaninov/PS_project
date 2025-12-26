"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { LinkModel, NodeModel } from "@/domain/models";
import { LabelValue } from "@/features/ui-core/LabelValue";
import { Button } from "@/features/ui-core/primitives/button";
import { selectEditorReadOnly, useEditorStore } from "@/features/editor/state/editorStore";
import { cn } from "@/lib/utils";
import { CollapsibleSection } from "./CollapsibleSection";
import { InspectorShell } from "./InspectorShell";

type LinkInspectorPanelProps = {
  link: LinkModel;
};

export function LinkInspectorPanel({ link }: LinkInspectorPanelProps) {
  const updateLinkFields = useEditorStore((s) => s.updateLinkFields);
  const updateLinkProps = useEditorStore((s) => s.updateLinkProps);
  const swapLinkDirection = useEditorStore((s) => s.swapLinkDirection);
  const removeLinks = useEditorStore((s) => s.removeLinks);
  const readOnly = useEditorStore(selectEditorReadOnly);
  const nodes = useEditorStore((s) => s.adventure?.nodes ?? []);
  const nodeTitleMap = useMemo(() => {
    const map = new Map<number, NodeModel>();
    nodes.forEach((node) => map.set(node.nodeId, node));
    return map;
  }, [nodes]);
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
  const [positiveInput, setPositiveInput] = useState("");
  const [negativeInput, setNegativeInput] = useState("");
  const handleAddCondition = (
    key: "positiveNodeList" | "negativeNodeList",
    value: string
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!/^\d+$/.test(trimmed)) return;
    const current = key === "positiveNodeList" ? positiveNodes : negativeNodes;
    if (current.includes(trimmed)) return;
    const next = [...current, trimmed];
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
    const title = Number.isFinite(numericId)
      ? nodeTitleMap.get(numericId)?.title?.trim() ?? ""
      : "";
    if (title) return `#${nodeId} - ${title}`;
    return `#${nodeId}`;
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
        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
          <CollapsibleSection
            title="Conditions"
            sectionKey="editor.link.conditions"
          >
            <ConditionEditor
              label="Show button when ALL visited"
              helper="Positive node list"
              inputValue={positiveInput}
              onInputChange={setPositiveInput}
              onAdd={() => {
                handleAddCondition("positiveNodeList", positiveInput);
                setPositiveInput("");
              }}
              disabled={readOnly}
              nodes={positiveNodes}
              onRemove={(nodeId) =>
                handleRemoveCondition("positiveNodeList", nodeId)
              }
              resolveLabel={resolveNodeLabel}
            />
            <ConditionEditor
              label="Hide button when ALL visited"
              helper="Negative node list"
              inputValue={negativeInput}
              onInputChange={setNegativeInput}
              onAdd={() => {
                handleAddCondition("negativeNodeList", negativeInput);
                setNegativeInput("");
              }}
              disabled={readOnly}
              nodes={negativeNodes}
              onRemove={(nodeId) =>
                handleRemoveCondition("negativeNodeList", nodeId)
              }
              resolveLabel={resolveNodeLabel}
            />
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
  inputValue,
  onInputChange,
  onAdd,
  nodes,
  onRemove,
  resolveLabel,
  disabled = false,
}: {
  label: string;
  helper: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  nodes: string[];
  onRemove: (nodeId: string) => void;
  resolveLabel: (nodeId: string) => string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
        <p className="text-xs text-[var(--muted)]">{helper}</p>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="Node id"
          disabled={disabled}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          disabled={disabled}
        >
          Add
        </Button>
      </div>
      {nodes.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">No nodes added.</p>
      ) : (
        <div className="space-y-2">
          {nodes.map((nodeId) => (
            <div
              key={nodeId}
              className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-2"
            >
              <span className="text-xs text-[var(--text-secondary)]">
                {resolveLabel(nodeId)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(nodeId)}
                disabled={disabled}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
