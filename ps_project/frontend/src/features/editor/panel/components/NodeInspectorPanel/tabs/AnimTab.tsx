import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { BulkField } from "../../BulkField";
import { CollapsibleSection } from "../../CollapsibleSection";
import { SelectField } from "../fields";
import { animationModeOptions, animationModeValues } from "../constants";

const MIXED_VALUE = "__mixed__";

export type AnimMixedState = {
  mode: boolean;
  delay: boolean;
  navigationDelay: boolean;
  backgroundFade: boolean;
};

type NumericDraftState = {
  draft: string;
  handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleBlur: () => void;
  handleFocus: () => void;
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

const clampNumericDraft = (raw: string) => {
  const next = Number(raw);
  if (!Number.isFinite(next)) return null;
  return String(Math.max(0, next));
};

const useNumericDraft = ({
  value,
  isMixed,
  onCommit,
}: {
  value: number;
  isMixed: boolean;
  onCommit: (next: string) => void;
}): NumericDraftState => {
  const [draft, setDraft] = useState(isMixed ? "" : String(value));
  const [committed, setCommitted] = useState(isMixed ? "" : String(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const nextCommitted = isMixed ? "" : String(value);
    setCommitted(nextCommitted);
    if (!isEditing) {
      setDraft(nextCommitted);
    }
  }, [value, isMixed, isEditing]);

  const commitIfValid = (raw: string) => {
    const clamped = clampNumericDraft(raw);
    if (clamped === null) return;
    onCommit(clamped);
    setCommitted(clamped);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    setDraft(raw);
    if (!raw.trim()) return;
    commitIfValid(raw);
  };

  const finalizeDraft = () => {
    setIsEditing(false);
    if (!draft.trim()) {
      setDraft(committed);
      return;
    }
    const clamped = clampNumericDraft(draft);
    if (clamped === null) {
      setDraft(committed);
      return;
    }
    if (clamped !== committed) {
      onCommit(clamped);
      setCommitted(clamped);
    }
    setDraft(clamped);
  };

  const handleBlur = () => {
    finalizeDraft();
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    finalizeDraft();
  };

  return {
    draft,
    handleChange,
    handleBlur,
    handleFocus,
    handleKeyDown,
  };
};

export function AnimTab({
  readOnly,
  bulkActive,
  isBulkFieldStaged,
  clearBulkPaths,
  animationMode,
  animationDelay,
  navigationDelay,
  backgroundFade,
  animMixed,
  onAnimationModeChange,
  handleNodePropChange,
}: {
  readOnly: boolean;
  bulkActive: boolean;
  isBulkFieldStaged: (paths: string | string[]) => boolean;
  clearBulkPaths: (paths: string | string[]) => void;
  animationMode: string;
  animationDelay: number;
  navigationDelay: number;
  backgroundFade: number;
  animMixed?: AnimMixedState;
  onAnimationModeChange: (value: string) => void;
  handleNodePropChange: (path: string, value: unknown) => void;
}) {
  const isModeMixed =
    bulkActive &&
    !isBulkFieldStaged("player_container.animation") &&
    Boolean(animMixed?.mode);
  const isDelayMixed =
    bulkActive &&
    !isBulkFieldStaged("animation_delay") &&
    Boolean(animMixed?.delay);
  const isNavigationDelayMixed =
    bulkActive &&
    !isBulkFieldStaged("playerNavigation_delay") &&
    Boolean(animMixed?.navigationDelay);
  const isBackgroundFadeMixed =
    bulkActive &&
    !isBulkFieldStaged("animation_backgroundfade") &&
    Boolean(animMixed?.backgroundFade);
  const delayDraft = useNumericDraft({
    value: animationDelay,
    isMixed: isDelayMixed,
    onCommit: (next) => handleNodePropChange("animation_delay", next),
  });
  const navigationDelayDraft = useNumericDraft({
    value: navigationDelay,
    isMixed: isNavigationDelayMixed,
    onCommit: (next) => handleNodePropChange("playerNavigation_delay", next),
  });
  const backgroundFadeDraft = useNumericDraft({
    value: backgroundFade,
    isMixed: isBackgroundFadeMixed,
    onCommit: (next) => handleNodePropChange("animation_backgroundfade", next),
  });
  const needsLegacyOption =
    !isModeMixed &&
    animationMode.trim() !== "" &&
    !animationModeValues.has(animationMode);
  const animationOptions = [
    ...(isModeMixed
      ? [{ value: MIXED_VALUE, label: "Mixed", key: "mixed", disabled: true }]
      : []),
    ...animationModeOptions,
    ...(needsLegacyOption
      ? [
          {
            value: animationMode,
            label: `Current: ${animationMode}`,
            key: `current-${animationMode}`,
          },
        ]
      : []),
  ];

  return (
    <fieldset disabled={readOnly} className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
        <CollapsibleSection title="Text" sectionKey="editor.node.anim.text">
          <div className="space-y-3">
            <BulkField
              active={isBulkFieldStaged("player_container.animation")}
              onClear={() => clearBulkPaths("player_container.animation")}
            >
              <SelectField
                label="Text fade mode"
                value={isModeMixed ? MIXED_VALUE : animationMode}
                onChange={(next) =>
                  onAnimationModeChange(next === MIXED_VALUE ? "" : next)
                }
                options={animationOptions}
                widthClassName="w-56"
              />
            </BulkField>
            <BulkField
              active={isBulkFieldStaged("animation_delay")}
              onClear={() => clearBulkPaths("animation_delay")}
            >
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Initial delay (s)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={delayDraft.draft}
                  placeholder={isDelayMixed ? "Mixed" : undefined}
                  onChange={delayDraft.handleChange}
                  onFocus={delayDraft.handleFocus}
                  onBlur={delayDraft.handleBlur}
                  onKeyDown={delayDraft.handleKeyDown}
                  className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                />
              </div>
            </BulkField>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Navigation"
          sectionKey="editor.node.anim.navigation"
        >
          <BulkField
            active={isBulkFieldStaged("playerNavigation_delay")}
            onClear={() => clearBulkPaths("playerNavigation_delay")}
          >
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-[var(--text-secondary)]">
                Navigation delay (s)
              </label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={navigationDelayDraft.draft}
                placeholder={isNavigationDelayMixed ? "Mixed" : undefined}
                onChange={navigationDelayDraft.handleChange}
                onFocus={navigationDelayDraft.handleFocus}
                onBlur={navigationDelayDraft.handleBlur}
                onKeyDown={navigationDelayDraft.handleKeyDown}
                className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
              />
            </div>
          </BulkField>
        </CollapsibleSection>

        <CollapsibleSection
          title="Background"
          sectionKey="editor.node.anim.background"
        >
          <BulkField
            active={isBulkFieldStaged("animation_backgroundfade")}
            onClear={() => clearBulkPaths("animation_backgroundfade")}
          >
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-[var(--text-secondary)]">
                Background fade (s)
              </label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={backgroundFadeDraft.draft}
                placeholder={isBackgroundFadeMixed ? "Mixed" : undefined}
                onChange={backgroundFadeDraft.handleChange}
                onFocus={backgroundFadeDraft.handleFocus}
                onBlur={backgroundFadeDraft.handleBlur}
                onKeyDown={backgroundFadeDraft.handleKeyDown}
                className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
              />
            </div>
          </BulkField>
        </CollapsibleSection>
      </div>
    </fieldset>
  );
}
