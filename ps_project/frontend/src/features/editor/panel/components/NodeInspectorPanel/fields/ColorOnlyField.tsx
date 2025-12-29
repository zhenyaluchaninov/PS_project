import { ColorPickerPopover } from "../../ColorPickerPopover";

export function ColorOnlyField({
  label,
  value,
  onLiveChange,
  onCommit,
  onInteractionStart,
  onInteractionEnd,
  onScrubStart,
  onScrubEnd,
}: {
  label: string;
  value: string;
  onLiveChange?: (value: string) => void;
  onCommit: (value: string) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </span>
        <ColorPickerPopover
          value={value}
          onLiveChange={onLiveChange}
          onCommit={onCommit}
          onInteractionStart={onInteractionStart}
          onInteractionEnd={onInteractionEnd}
          onScrubStart={onScrubStart}
          onScrubEnd={onScrubEnd}
          ariaLabel={`${label} color`}
        />
      </div>
    </div>
  );
}
