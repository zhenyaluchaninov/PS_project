"use client";

import {
  memo,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { HexColorPicker } from "react-colorful";
import { cn } from "@/lib/utils";

const scrubIdleMs = 180;

const isHex = (value: string) => /^[0-9a-fA-F]{6}$/.test(value);
const isShortHex = (value: string) => /^[0-9a-fA-F]{3}$/.test(value);

const normalizeHex = (value: string, fallback: string) => {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const raw = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (isHex(raw)) return `#${raw.toLowerCase()}`;
  if (isShortHex(raw)) {
    const expanded = raw
      .split("")
      .map((token) => `${token}${token}`)
      .join("");
    return `#${expanded.toLowerCase()}`;
  }
  return fallback;
};

const parseHexInput = (input: string, fallback: string) => {
  const trimmed = input.trim();
  if (!trimmed) return { value: fallback, valid: false };
  const raw = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (isHex(raw)) {
    return { value: `#${raw.toLowerCase()}`, valid: true };
  }
  if (isShortHex(raw)) {
    const expanded = raw
      .split("")
      .map((token) => `${token}${token}`)
      .join("");
    return { value: `#${expanded.toLowerCase()}`, valid: true };
  }
  return { value: fallback, valid: false };
};

export type ColorPickerPopoverProps = {
  value: string;
  onLiveChange?: (value: string) => void;
  onCommit: (value: string) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
};

export const ColorPickerPopover = memo(function ColorPickerPopover({
  value,
  onLiveChange,
  onCommit,
  onInteractionStart,
  onInteractionEnd,
  onScrubStart,
  onScrubEnd,
  disabled,
  ariaLabel,
  className,
}: ColorPickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftColor, setDraftColor] = useState(() =>
    normalizeHex(value, "#000000")
  );
  const [draftInput, setDraftInput] = useState(() =>
    normalizeHex(value, "#000000")
  );
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isInteractingRef = useRef(false);
  const interactionStartedRef = useRef(false);
  const initialValueRef = useRef(draftColor);
  const latestValueRef = useRef(draftColor);
  const rafRef = useRef<number | null>(null);
  const pendingValueRef = useRef<string | null>(null);
  const scrubTimeoutRef = useRef<number | null>(null);
  const scrubActiveRef = useRef(false);
  const scrubStartRef = useRef(onScrubStart);
  const scrubEndRef = useRef(onScrubEnd);
  const interactionEndRef = useRef(onInteractionEnd);
  const interactionStartRef = useRef(onInteractionStart);
  const closePopoverRef = useRef<() => void>(() => {});

  useEffect(() => {
    scrubStartRef.current = onScrubStart;
  }, [onScrubStart]);

  useEffect(() => {
    scrubEndRef.current = onScrubEnd;
  }, [onScrubEnd]);

  useEffect(() => {
    interactionEndRef.current = onInteractionEnd;
  }, [onInteractionEnd]);

  useEffect(() => {
    interactionStartRef.current = onInteractionStart;
  }, [onInteractionStart]);

  useEffect(() => {
    latestValueRef.current = draftColor;
  }, [draftColor]);

  useEffect(() => {
    if (isInteractingRef.current) return;
    const normalized = normalizeHex(value, latestValueRef.current);
    setDraftColor(normalized);
    setDraftInput(normalized);
    latestValueRef.current = normalized;
    initialValueRef.current = normalized;
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        popoverRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      closePopoverRef.current();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closePopoverRef.current();
    };
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        popoverRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      closePopoverRef.current();
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [isOpen]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (scrubTimeoutRef.current !== null) {
        clearTimeout(scrubTimeoutRef.current);
        scrubTimeoutRef.current = null;
      }
      if (scrubActiveRef.current) {
        scrubActiveRef.current = false;
        scrubEndRef.current?.();
      }
      if (interactionStartedRef.current) {
        interactionEndRef.current?.();
        interactionStartedRef.current = false;
      }
      isInteractingRef.current = false;
    },
    []
  );

  const scheduleLiveChange = (nextValue: string) => {
    pendingValueRef.current = nextValue;
    if (!onLiveChange) return;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const pending = pendingValueRef.current;
      if (!pending) return;
      onLiveChange?.(pending);
    });
  };

  const flushLiveChange = (nextValue: string) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingValueRef.current = nextValue;
    onLiveChange?.(nextValue);
  };

  const noteScrubActivity = () => {
    if (!scrubStartRef.current && !scrubEndRef.current) return;
    if (!scrubActiveRef.current) {
      scrubActiveRef.current = true;
      scrubStartRef.current?.();
    }
    if (scrubTimeoutRef.current !== null) {
      clearTimeout(scrubTimeoutRef.current);
    }
    scrubTimeoutRef.current = window.setTimeout(() => {
      scrubTimeoutRef.current = null;
      if (!scrubActiveRef.current) return;
      scrubActiveRef.current = false;
      scrubEndRef.current?.();
    }, scrubIdleMs);
  };

  const endScrub = () => {
    if (scrubTimeoutRef.current !== null) {
      clearTimeout(scrubTimeoutRef.current);
      scrubTimeoutRef.current = null;
    }
    if (!scrubActiveRef.current) return;
    scrubActiveRef.current = false;
    scrubEndRef.current?.();
  };

  const beginInteraction = () => {
    if (isInteractingRef.current) return;
    isInteractingRef.current = true;
    interactionStartedRef.current = false;
    const normalized = normalizeHex(value, latestValueRef.current);
    initialValueRef.current = normalized;
    latestValueRef.current = normalized;
    setDraftColor(normalized);
    setDraftInput(normalized);
  };

  const maybeStartInteraction = (nextValue: string) => {
    if (interactionStartedRef.current) return;
    if (nextValue === initialValueRef.current) return;
    interactionStartedRef.current = true;
    interactionStartRef.current?.();
  };

  const commitValue = (nextValue: string) => {
    if (!isInteractingRef.current) return;
    flushLiveChange(nextValue);
    const changed = nextValue !== initialValueRef.current;
    isInteractingRef.current = false;
    endScrub();
    if (interactionStartedRef.current) {
      interactionEndRef.current?.();
      interactionStartedRef.current = false;
    }
    if (changed) {
      onCommit(nextValue);
    }
  };

  const closePopover = () => {
    if (!isOpen) return;
    const nextValue = latestValueRef.current;
    commitValue(nextValue);
    setIsOpen(false);
  };

  closePopoverRef.current = closePopover;

  const openPopover = () => {
    if (disabled) return;
    if (isOpen) return;
    beginInteraction();
    setIsOpen(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const handlePickerChange = (nextValue: string) => {
    const normalized = normalizeHex(nextValue, latestValueRef.current);
    setDraftColor(normalized);
    setDraftInput(normalized);
    latestValueRef.current = normalized;
    maybeStartInteraction(normalized);
    scheduleLiveChange(normalized);
    noteScrubActivity();
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextInput = event.target.value;
    setDraftInput(nextInput);
    const parsed = parseHexInput(nextInput, latestValueRef.current);
    if (!parsed.valid) return;
    setDraftColor(parsed.value);
    latestValueRef.current = parsed.value;
    maybeStartInteraction(parsed.value);
    scheduleLiveChange(parsed.value);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closePopover();
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    const parsed = parseHexInput(draftInput, latestValueRef.current);
    if (!parsed.valid) {
      setDraftInput(latestValueRef.current);
      closePopover();
      return;
    }
    setDraftColor(parsed.value);
    latestValueRef.current = parsed.value;
    commitValue(parsed.value);
    setIsOpen(false);
  };

  const handleInputBlur = () => {
    const parsed = parseHexInput(draftInput, latestValueRef.current);
    if (!parsed.valid) {
      setDraftInput(latestValueRef.current);
      return;
    }
    setDraftInput(parsed.value);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        ref={buttonRef}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (isOpen) {
            closePopover();
          } else {
            openPopover();
          }
        }}
        className={cn(
          "h-8 w-12 rounded-md border border-[var(--border)]",
          "bg-[var(--bg)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.2)]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]",
          disabled && "opacity-60 cursor-not-allowed"
        )}
        style={{ backgroundColor: draftColor }}
      />
      {isOpen ? (
        <div
          ref={popoverRef}
          className={cn(
            "absolute right-0 z-50 mt-2 w-[240px]",
            "rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3",
            "shadow-[0_14px_40px_-20px_rgba(0,0,0,0.7)]"
          )}
        >
          <div
            onPointerDown={noteScrubActivity}
            className="ps-color-picker"
          >
            <HexColorPicker color={draftColor} onChange={handlePickerChange} />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Hex
            </span>
            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              aria-label="Hex color value"
              autoComplete="off"
              spellCheck={false}
              maxLength={7}
              value={draftInput}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onBlur={handleInputBlur}
              className={cn(
                "ml-auto w-28 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs",
                "text-[var(--text)] focus:border-[var(--accent)] focus:outline-none",
                "focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
              )}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
});
