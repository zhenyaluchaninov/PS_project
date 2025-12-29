import { Button } from "@/features/ui-core/primitives/button";
import type { BulkEditConfig } from "../types";

export function BulkEditBanner({
  bulk,
  readOnly,
  hasStagedChanges,
  stagedCount,
}: {
  bulk: BulkEditConfig;
  readOnly: boolean;
  hasStagedChanges: boolean;
  stagedCount: number;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Apply to selection
          </p>
          <p className="text-xs text-[var(--muted)]">
            {hasStagedChanges
              ? `${stagedCount} staged ${
                  stagedCount === 1 ? "change" : "changes"
                }.`
              : "No staged changes yet."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={bulk.onDiscardAll}
            disabled={readOnly || !hasStagedChanges}
          >
            Discard staged changes
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={bulk.onRequestApply}
            disabled={readOnly || !hasStagedChanges}
          >
            Apply changes
          </Button>
        </div>
      </div>
      <div className="mt-2 space-y-1 text-xs text-[var(--muted)]">
        {bulk.selectedLinkCount > 0 ? (
          <p>
            Bulk editing applies to nodes only. {bulk.selectedLinkCount} link
            {bulk.selectedLinkCount === 1 ? "" : "s"} selected.
          </p>
        ) : null}
        {bulk.notice ? (
          <p className="text-[var(--warning)]">{bulk.notice}</p>
        ) : null}
      </div>
    </div>
  );
}
