import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PlayerLayoutProps = {
  children: ReactNode;
  overlay?: ReactNode;
  className?: string;
};

export function PlayerLayout({ children, overlay, className }: PlayerLayoutProps) {
  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className={cn("relative z-10 mx-auto max-w-6xl px-4 py-6", className)}>
        {children}
      </div>
      {overlay ? (
        <div className="pointer-events-none absolute inset-0 z-20">{overlay}</div>
      ) : null}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.05),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.05),transparent_35%)]" />
    </div>
  );
}
