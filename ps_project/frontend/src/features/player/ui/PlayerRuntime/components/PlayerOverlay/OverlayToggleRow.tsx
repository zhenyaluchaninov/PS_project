import { cn } from "@/lib/utils";

export function OverlayToggleRow({
  label,
  description,
  value,
  onToggle,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "ps-overlay__toggle",
        disabled ? "cursor-not-allowed opacity-60" : ""
      )}
      role="switch"
      aria-checked={value}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={disabled ? undefined : onToggle}
    >
      <div className="ps-overlay__toggle-text">
        <span className="ps-overlay__toggle-label">{label}</span>
        {description ? <span className="ps-overlay__toggle-desc">{description}</span> : null}
      </div>
      <span
        className={cn(
          "ps-overlay__pill",
          value ? "ps-overlay__pill--on" : "ps-overlay__pill--off"
        )}
      >
        {value ? "On" : "Off"}
      </span>
    </button>
  );
}
