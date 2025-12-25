"use client";

import { useMemo, type ReactNode } from "react";
import type { LinkModel, NodeModel } from "@/domain/models";
import { LabelValue } from "@/features/ui-core/LabelValue";
import { Button } from "@/features/ui-core/primitives/button";
import { useEditorStore } from "@/features/editor/state/editorStore";
import { cn } from "@/lib/utils";
import { InspectorShell } from "./InspectorShell";

type LinkInspectorPanelProps = {
  link: LinkModel;
};

export function LinkInspectorPanel({ link }: LinkInspectorPanelProps) {
  const updateLinkFields = useEditorStore((s) => s.updateLinkFields);
  const removeLinks = useEditorStore((s) => s.removeLinks);
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
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
            />
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={() => removeLinks([link.linkId])}
          className="w-full border-[var(--danger)] text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[var(--bg-hover)]"
        >
          Delete link
        </Button>
      </div>
    </InspectorShell>
  );
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
