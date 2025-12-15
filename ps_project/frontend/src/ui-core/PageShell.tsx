import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  maxWidth?: "lg" | "xl" | "2xl";
};

const widths: Record<NonNullable<PageShellProps["maxWidth"]>, string> = {
  lg: "max-w-4xl",
  xl: "max-w-5xl",
  "2xl": "max-w-6xl",
};

export function PageShell({
  children,
  className,
  maxWidth = "xl",
}: PageShellProps) {
  return (
    <main
      className={cn(
        "min-h-screen bg-[var(--bg)] px-6 py-10 text-[var(--text)]",
        className
      )}
    >
      <div className={cn("mx-auto w-full", widths[maxWidth])}>{children}</div>
    </main>
  );
}
