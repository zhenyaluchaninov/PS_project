import { useEffect, useRef, useState } from "react";
import { rangeInputClasses } from "../constants";
import { clampNumber } from "../utils/formatters";

export function RangeField({
  label,
  value,
  min,
  max,
  step,
  onLiveChange,
  onCommit,
  onInteractionStart,
  onInteractionEnd,
  allowBeyondMax = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onLiveChange?: (value: number) => void;
  onCommit: (value: number) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  allowBeyondMax?: boolean;
}) {
  const normalizedValue = allowBeyondMax
    ? Math.max(min, value)
    : clampNumber(value, min, max);
  const [draftValue, setDraftValue] = useState(normalizedValue);
  const [draftInput, setDraftInput] = useState(String(normalizedValue));
  const isInteractingRef = useRef(false);
  const interactionStartedRef = useRef(false);
  const initialValueRef = useRef(normalizedValue);
  const rafRef = useRef<number | null>(null);
  const pendingLiveValueRef = useRef<number | null>(null);
  const interactionEndRef = useRef(onInteractionEnd);

  useEffect(() => {
    if (!isInteractingRef.current) {
      setDraftValue(normalizedValue);
      setDraftInput(String(normalizedValue));
      initialValueRef.current = normalizedValue;
    }
  }, [normalizedValue]);

  useEffect(() => {
    interactionEndRef.current = onInteractionEnd;
  }, [onInteractionEnd]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (interactionStartedRef.current) {
        interactionEndRef.current?.();
        interactionStartedRef.current = false;
      }
    },
    []
  );

  const normalizeValue = (raw: number) =>
    allowBeyondMax ? Math.max(min, raw) : clampNumber(raw, min, max);

  const parseDraftInput = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const beginInteraction = () => {
    if (isInteractingRef.current) return;
    isInteractingRef.current = true;
    interactionStartedRef.current = false;
    initialValueRef.current = normalizedValue;
  };

  const maybeStartInteraction = (nextValue: number) => {
    if (interactionStartedRef.current) return;
    if (nextValue === initialValueRef.current) return;
    interactionStartedRef.current = true;
    onInteractionStart?.();
  };

  const scheduleLiveChange = (nextValue: number) => {
    pendingLiveValueRef.current = nextValue;
    if (!onLiveChange) return;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const pending = pendingLiveValueRef.current;
      if (pending === null) return;
      onLiveChange?.(pending);
    });
  };

  const flushLiveChange = (nextValue: number) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingLiveValueRef.current = nextValue;
    onLiveChange?.(nextValue);
  };

  const commitValue = (raw: number | null) => {
    if (!isInteractingRef.current) return;
    if (raw === null) {
      setDraftValue(normalizedValue);
      setDraftInput(String(normalizedValue));
      flushLiveChange(normalizedValue);
      isInteractingRef.current = false;
      if (interactionStartedRef.current) {
        onInteractionEnd?.();
        interactionStartedRef.current = false;
      }
      return;
    }
    const nextValue = normalizeValue(raw);
    setDraftValue(nextValue);
    setDraftInput(String(nextValue));
    flushLiveChange(nextValue);
    const changed = nextValue !== initialValueRef.current;
    isInteractingRef.current = false;
    if (interactionStartedRef.current) {
      onInteractionEnd?.();
      interactionStartedRef.current = false;
    }
    if (changed) {
      onCommit(nextValue);
    }
  };

  const sliderValue = clampNumber(draftValue, min, max);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          onFocus={beginInteraction}
          onPointerDown={(event) => {
            beginInteraction();
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            const next = Number(event.currentTarget.value);
            commitValue(Number.isFinite(next) ? next : null);
          }}
          onPointerCancel={() => commitValue(draftValue)}
          onLostPointerCapture={() => commitValue(draftValue)}
          onBlur={() => commitValue(draftValue)}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (!Number.isFinite(next)) return;
            const normalized = normalizeValue(next);
            beginInteraction();
            maybeStartInteraction(normalized);
            setDraftValue(normalized);
            setDraftInput(String(normalized));
            scheduleLiveChange(normalized);
          }}
          aria-label={label}
          className={rangeInputClasses}
        />
        <input
          type="number"
          min={min}
          max={allowBeyondMax ? undefined : max}
          step={step}
          value={draftInput}
          onFocus={beginInteraction}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            const parsed = parseDraftInput(draftInput);
            commitValue(parsed ?? draftValue);
          }}
          onBlur={() => {
            const parsed = parseDraftInput(draftInput);
            commitValue(parsed ?? draftValue);
          }}
          onChange={(event) => {
            const nextInput = event.target.value;
            setDraftInput(nextInput);
            const parsed = parseDraftInput(nextInput);
            if (parsed === null) return;
            const normalized = normalizeValue(parsed);
            beginInteraction();
            maybeStartInteraction(normalized);
            setDraftValue(normalized);
            scheduleLiveChange(normalized);
          }}
          aria-label={`${label} value`}
          className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
        />
      </div>
    </div>
  );
}
