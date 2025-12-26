"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const sectionMemory = new Map<string, boolean>();

type CollapsibleSectionProps = {
  title: string;
  defaultOpen?: boolean;
  titleClassName?: string;
  sectionKey?: string;
  open?: boolean;
  onToggle?: (next: boolean) => void;
  children: ReactNode;
};

export function CollapsibleSection({
  title,
  defaultOpen = false,
  titleClassName,
  sectionKey,
  open,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  const storageKey = useMemo(
    () => (sectionKey ? `collapsible:${sectionKey}` : null),
    [sectionKey]
  );
  const [internalOpen, setInternalOpen] = useState(() => {
    if (storageKey && sectionMemory.has(storageKey)) {
      return sectionMemory.get(storageKey) ?? defaultOpen;
    }
    return defaultOpen;
  });
  const isOpen = open ?? internalOpen;
  const handleToggle = () => {
    const next = !isOpen;
    if (storageKey) {
      sectionMemory.set(storageKey, next);
    }
    if (onToggle) {
      onToggle(next);
    }
    if (open === undefined) {
      setInternalOpen(next);
    }
  };

  useEffect(() => {
    if (!storageKey || open === undefined) return;
    sectionMemory.set(storageKey, open);
  }, [open, storageKey]);

  useEffect(() => {
    if (!storageKey || open !== undefined) return;
    if (sectionMemory.has(storageKey)) {
      setInternalOpen(sectionMemory.get(storageKey) ?? defaultOpen);
    } else {
      setInternalOpen(defaultOpen);
    }
  }, [defaultOpen, open, storageKey]);

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-2 text-left",
          "hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)] focus-visible:ring-inset"
        )}
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[var(--muted)] transition-transform",
            isOpen ? "rotate-0" : "-rotate-90"
          )}
          aria-hidden="true"
        />
        <span
          className={
            titleClassName ??
            "text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]"
          }
        >
          {title}
        </span>
      </button>
      {isOpen ? (
        <div className="space-y-3 px-4 pb-3 pt-2">{children}</div>
      ) : null}
    </div>
  );
}
