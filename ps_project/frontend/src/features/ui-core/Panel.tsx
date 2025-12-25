import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PanelProps = {
  children: ReactNode;
  className?: string;
  title?: string;
  muted?: boolean;
};

export function Panel({ children, className, title, muted }: PanelProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--border)]",
        muted ? "bg-[var(--surface-2)]/70" : "bg-[var(--surface)]/90",
        "shadow-[0_20px_80px_-60px_rgba(0,0,0,0.6)]",
        className
      )}
    >
      {title ? (
        <div className="border-b border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--text)]">
          {title}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}
