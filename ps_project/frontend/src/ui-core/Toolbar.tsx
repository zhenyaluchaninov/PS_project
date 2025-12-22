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
        "flex flex-wrap items-center gap-3",
        className
      )}
    >
      {children}
    </div>
  );
}
