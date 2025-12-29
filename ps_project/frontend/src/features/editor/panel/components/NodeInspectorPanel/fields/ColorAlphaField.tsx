import { useEffect, useRef, useState } from "react";
import { ColorPickerPopover } from "../../ColorPickerPopover";
import { rangeInputClasses } from "../constants";
import { clampAlpha } from "../utils/formatters";

export function ColorAlphaField({
  label,
  colorValue,
  alphaValue,
  onColorLiveChange,
  onColorCommit,
  onAlphaLiveChange,
  onAlphaCommit,
  onColorInteractionStart,
  onColorInteractionEnd,
  onAlphaInteractionStart,
  onAlphaInteractionEnd,
  onColorScrubStart,
  onColorScrubEnd,
}: {
  label: string;
  colorValue: string;
  alphaValue: number;
  onColorLiveChange?: (value: string) => void;
  onColorCommit: (value: string) => void;
  onAlphaLiveChange?: (value: number) => void;
  onAlphaCommit: (value: number) => void;
  onColorInteractionStart?: () => void;
  onColorInteractionEnd?: () => void;
  onAlphaInteractionStart?: () => void;
  onAlphaInteractionEnd?: () => void;
  onColorScrubStart?: () => void;
  onColorScrubEnd?: () => void;
}) {
  const clampedAlpha = clampAlpha(alphaValue);
  const [draftAlpha, setDraftAlpha] = useState(clampedAlpha);
  const [draftAlphaInput, setDraftAlphaInput] = useState(
    String(clampedAlpha)
  );
  const alphaInteractingRef = useRef(false);
  const alphaInteractionStartedRef = useRef(false);
  const alphaInitialRef = useRef(clampedAlpha);
  const alphaLatestRef = useRef(clampedAlpha);
  const alphaRafRef = useRef<number | null>(null);
  const alphaInteractionEndRef = useRef(onAlphaInteractionEnd);

  useEffect(() => {
    alphaInteractionEndRef.current = onAlphaInteractionEnd;
  }, [onAlphaInteractionEnd]);

  useEffect(() => {
    if (!alphaInteractingRef.current) {
      setDraftAlpha(clampedAlpha);
      setDraftAlphaInput(String(clampedAlpha));
      alphaInitialRef.current = clampedAlpha;
      alphaLatestRef.current = clampedAlpha;
    }
  }, [clampedAlpha]);

  useEffect(
    () => () => {
      if (alphaRafRef.current !== null) {
        cancelAnimationFrame(alphaRafRef.current);
        alphaRafRef.current = null;
      }
      if (alphaInteractionStartedRef.current) {
        alphaInteractionEndRef.current?.();
        alphaInteractionStartedRef.current = false;
      }
    },
    []
  );

  const beginAlphaInteraction = () => {
    if (alphaInteractingRef.current) return;
    alphaInteractingRef.current = true;
    alphaInteractionStartedRef.current = false;
    alphaInitialRef.current = clampedAlpha;
    alphaLatestRef.current = clampedAlpha;
  };

  const maybeStartAlphaInteraction = (nextValue: number) => {
    if (alphaInteractionStartedRef.current) return;
    if (nextValue === alphaInitialRef.current) return;
    alphaInteractionStartedRef.current = true;
    onAlphaInteractionStart?.();
  };

  const scheduleAlphaLiveChange = (nextValue: number) => {
    alphaLatestRef.current = nextValue;
    if (!onAlphaLiveChange) return;
    if (alphaRafRef.current !== null) return;
    alphaRafRef.current = requestAnimationFrame(() => {
      alphaRafRef.current = null;
      onAlphaLiveChange?.(alphaLatestRef.current);
    });
  };

  const flushAlphaLiveChange = (nextValue: number) => {
    if (alphaRafRef.current !== null) {
      cancelAnimationFrame(alphaRafRef.current);
      alphaRafRef.current = null;
    }
    alphaLatestRef.current = nextValue;
    onAlphaLiveChange?.(nextValue);
  };

  const commitAlpha = (raw: number | null) => {
    if (!alphaInteractingRef.current) return;
    if (raw === null) {
      setDraftAlpha(clampedAlpha);
      setDraftAlphaInput(String(clampedAlpha));
      flushAlphaLiveChange(clampedAlpha);
      alphaInteractingRef.current = false;
      if (alphaInteractionStartedRef.current) {
        onAlphaInteractionEnd?.();
        alphaInteractionStartedRef.current = false;
      }
      return;
    }
    const nextAlpha = clampAlpha(raw);
    setDraftAlpha(nextAlpha);
    setDraftAlphaInput(String(nextAlpha));
    flushAlphaLiveChange(nextAlpha);
    const changed = nextAlpha !== alphaInitialRef.current;
    alphaInteractingRef.current = false;
    if (alphaInteractionStartedRef.current) {
      onAlphaInteractionEnd?.();
      alphaInteractionStartedRef.current = false;
    }
    if (changed) {
      onAlphaCommit(nextAlpha);
    }
  };

  const parseAlphaInput = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </span>
        <ColorPickerPopover
          value={colorValue}
          onLiveChange={onColorLiveChange}
          onCommit={onColorCommit}
          onInteractionStart={onColorInteractionStart}
          onInteractionEnd={onColorInteractionEnd}
          onScrubStart={onColorScrubStart}
          onScrubEnd={onColorScrubEnd}
          ariaLabel={`${label} color`}
        />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted)]">Opacity</span>
          <input
            type="range"
            min={0}
            max={100}
            value={draftAlpha}
            onFocus={beginAlphaInteraction}
            onPointerDown={(event) => {
              beginAlphaInteraction();
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerUp={(event) => {
              const next = Number(event.currentTarget.value);
              commitAlpha(Number.isFinite(next) ? next : null);
            }}
            onPointerCancel={() => commitAlpha(draftAlpha)}
            onLostPointerCapture={() => commitAlpha(draftAlpha)}
            onBlur={() => commitAlpha(draftAlpha)}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) return;
              const normalized = clampAlpha(next);
              beginAlphaInteraction();
              maybeStartAlphaInteraction(normalized);
              setDraftAlpha(normalized);
              setDraftAlphaInput(String(normalized));
              scheduleAlphaLiveChange(normalized);
            }}
            aria-label={`${label} opacity`}
            className={rangeInputClasses}
          />
        </label>
        <input
          type="number"
          min={0}
          max={100}
          value={draftAlphaInput}
          onFocus={beginAlphaInteraction}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            const parsed = parseAlphaInput(draftAlphaInput);
            commitAlpha(parsed ?? draftAlpha);
          }}
          onBlur={() => {
            const parsed = parseAlphaInput(draftAlphaInput);
            commitAlpha(parsed ?? draftAlpha);
          }}
          onChange={(event) => {
            const nextInput = event.target.value;
            setDraftAlphaInput(nextInput);
            const parsed = parseAlphaInput(nextInput);
            if (parsed === null) return;
            const normalized = clampAlpha(parsed);
            beginAlphaInteraction();
            maybeStartAlphaInteraction(normalized);
            setDraftAlpha(normalized);
            scheduleAlphaLiveChange(normalized);
          }}
          aria-label={`${label} opacity value`}
          className="w-16 rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
        />
      </div>
    </div>
  );
}
