import { cn } from "@/lib/utils";

export function ToggleRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-[var(--text-secondary)]">
        {label}
      </span>
      <span className="relative inline-flex h-5 w-10 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(event) => onToggle(event.target.checked)}
          aria-label={label}
        />
        <span
          className={cn(
            "absolute inset-0 rounded-full border border-[var(--border)] bg-[var(--bg-tertiary)] transition",
            "peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent)]",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent-muted)]"
          )}
        />
        <span
          className={cn(
            "absolute left-0.5 h-4 w-4 rounded-full bg-[var(--bg)] shadow-sm transition",
            "peer-checked:translate-x-5"
          )}
        />
      </span>
    </label>
  );
}
