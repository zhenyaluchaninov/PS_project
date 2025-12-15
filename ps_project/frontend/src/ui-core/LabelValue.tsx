import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LabelValueProps = {
  label: string;
  value: ReactNode;
  className?: string;
  inline?: boolean;
};

export function LabelValue({
  label,
  value,
  className,
  inline,
}: LabelValueProps) {
  return (
    <div
      className={cn(
        "flex",
        inline ? "items-center gap-2" : "flex-col gap-1",
        className
      )}
    >
      <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
        {label}
      </span>
      <span className="text-sm font-semibold text-[var(--text)]">{value}</span>
    </div>
  );
}
