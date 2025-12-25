import type { ReactNode } from "react";
import type { LinkModel } from "@/domain/models";
import { LabelValue } from "@/ui-core/LabelValue";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { InspectorShell } from "./InspectorShell";

type LinkInspectorPanelProps = {
  link: LinkModel;
};

export function LinkInspectorPanel({ link }: LinkInspectorPanelProps) {
  const isBidirectional = String(link.type ?? "")
    .toLowerCase()
    .includes("bidirectional");
  const arrow = isBidirectional ? "<->" : "->";

  return (
    <InspectorShell
      title="Link settings"
      meta={`#${link.linkId}`}
    >
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
        <InfoCard label="Type" value={link.type || "default"} />
        <InfoCard label="Label" value={link.label || "Untitled"} />
      </div>
      <PlaceholderPanel>Link editing coming in the next update.</PlaceholderPanel>
    </InspectorShell>
  );
}

function PlaceholderPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[120px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-6 text-xs text-[var(--muted)]",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
        <p className="text-[var(--muted)]">{children}</p>
      </div>
    </div>
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
