import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionTitleProps = {
  title: string;
  subtitle?: ReactNode;
  className?: string;
};

export function SectionTitle({ title, subtitle, className }: SectionTitleProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
        {title}
      </p>
      {subtitle ? (
        <div className="text-sm text-[var(--text)]/80">{subtitle}</div>
      ) : null}
    </div>
  );
}
