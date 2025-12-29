import { ChevronDown } from "lucide-react";

export type SelectFieldOption = {
  value: string;
  label: string;
  key?: string;
  disabled?: boolean;
};

export function SelectField({
  label,
  value,
  options,
  onChange,
  widthClassName = "w-48",
  containerClassName = "flex items-center justify-between gap-3",
  labelClassName = "text-sm font-medium text-[var(--text-secondary)]",
  selectClassName =
    "w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 pr-7 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]",
  ariaLabel,
  disabled,
}: {
  label: string;
  value: string;
  options: SelectFieldOption[];
  onChange: (value: string) => void;
  widthClassName?: string;
  containerClassName?: string;
  labelClassName?: string;
  selectClassName?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className={containerClassName}>
      <label className={labelClassName}>{label}</label>
      <div className={`relative ${widthClassName}`}>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={selectClassName}
          aria-label={ariaLabel}
          disabled={disabled}
        >
          {options.map((option) => (
            <option
              key={option.key ?? (option.value || option.label)}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
