import type { ReactNode } from "react";
import type { AdventureModel } from "@/domain/models";
import { LabelValue } from "@/features/ui-core/LabelValue";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { InspectorShell } from "./InspectorShell";

type AdventureInspectorPanelProps = {
  adventure: AdventureModel;
};

export function AdventureInspectorPanel({
  adventure,
}: AdventureInspectorPanelProps) {
  return (
    <InspectorShell
      title={adventure.title || "Adventure"}
      subtitle="Adventure overview"
      meta={`#${adventure.id}`}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Nodes" value={adventure.nodes.length} />
        <StatCard label="Links" value={adventure.links.length} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard label="Edit slug" value={adventure.slug || "n/a"} />
        <InfoCard label="View slug" value={adventure.viewSlug || "n/a"} />
      </div>
      <PlaceholderPanel>Adventure settings coming in the next update.</PlaceholderPanel>
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

function StatCard({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text)]">
        {value}
      </p>
    </div>
  );
}
