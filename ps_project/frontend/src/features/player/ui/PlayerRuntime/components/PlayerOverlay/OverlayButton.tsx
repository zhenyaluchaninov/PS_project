import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function OverlayButton({
  icon,
  label,
  subtleLabel,
  onClick,
  disabled,
  active,
  ariaExpanded,
  ariaPressed,
  iconOnly,
}: {
  icon: ReactNode;
  label: string;
  subtleLabel?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  ariaExpanded?: boolean;
  ariaPressed?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn("ps-overlay__btn", iconOnly ? "ps-overlay__btn--icon" : "")}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      data-active={active ? "true" : undefined}
      aria-expanded={ariaExpanded}
      aria-pressed={ariaPressed}
      aria-label={iconOnly ? label : undefined}
    >
      <span className="ps-overlay__btn-icon" aria-hidden>
        {icon}
      </span>
      {iconOnly ? null : (
        <span className="ps-overlay__btn-text">
          <span className="ps-overlay__btn-label">{label}</span>
          {subtleLabel ? <span className="ps-overlay__btn-meta">{subtleLabel}</span> : null}
        </span>
      )}
    </button>
  );
}
