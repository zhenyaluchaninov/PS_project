import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BulkFieldProps = {
  active: boolean;
  disabledReason?: string;
  onClear?: () => void;
  children: ReactNode;
  className?: string;
};

export function BulkField({
  active,
  disabledReason,
  onClear,
  children,
  className,
}: BulkFieldProps) {
  const isDisabled = Boolean(disabledReason);
  const showFrame = active || isDisabled;

  return (
    <div
      className={cn(
        "relative rounded-md",
        showFrame ? "border px-2 py-2" : "",
        active ? "border-[var(--accent)] bg-[var(--accent-muted)]" : "",
        !active && isDisabled
          ? "border-[var(--border)] bg-[var(--bg-secondary)]"
          : "",
        className
      )}
    >
      {active && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className={cn(
            "absolute right-2 top-2 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
            "text-[var(--accent)] hover:text-[var(--accent-hover)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
          )}
        >
          Remove
        </button>
      ) : null}
      <div
        className={cn(
          active && onClear ? "pr-16" : "",
          isDisabled ? "pointer-events-none opacity-60" : ""
        )}
      >
        {children}
      </div>
      {isDisabled ? (
        <p className="mt-2 text-[10px] text-[var(--muted)]">{disabledReason}</p>
      ) : null}
    </div>
  );
}
