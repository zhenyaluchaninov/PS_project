import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ToolbarProps = {
  children: ReactNode;
  className?: string;
};

export function Toolbar({ children, className }: ToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/80 px-4 py-3",
        className
      )}
    >
      {children}
    </div>
  );
}
