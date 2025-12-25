"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { emojiOptions } from "../constants";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const normalizeNewlines = (value: string): string =>
  value.replace(/\r\n/g, "\n");

const stripHtml = (value: string): string =>
  value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");

const isRichTextEmpty = (value: string): boolean =>
  stripHtml(value).trim().length === 0;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getPlainText = (element: HTMLElement): string => {
  if ("innerText" in element) {
    return normalizeNewlines(element.innerText);
  }
  return normalizeNewlines(element.textContent ?? "");
};

const plainTextToHtml = (text: string): string =>
  escapeHtml(text).replace(/\n/g, "<br>");

const insertTextWithLineBreaks = (
  range: Range,
  text: string
): Node | null => {
  const fragment = document.createDocumentFragment();
  const lines = normalizeNewlines(text).split("\n");
  let lastNode: Node | null = null;

  lines.forEach((line, index) => {
    const textNode = document.createTextNode(line);
    fragment.appendChild(textNode);
    lastNode = textNode;
    if (index < lines.length - 1) {
      const br = document.createElement("br");
      fragment.appendChild(br);
      lastNode = br;
    }
  });

  range.deleteContents();
  range.insertNode(fragment);
  return lastNode;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write node content...",
}: RichTextEditorProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<string>("");
  const selectionRef = useRef<Range | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const isRangeInsideEditor = useCallback((range: Range | null): boolean => {
    if (!range || !contentRef.current) return false;
    return contentRef.current.contains(range.commonAncestorContainer);
  }, []);

  const syncFromDom = useCallback(() => {
    const html = contentRef.current?.innerHTML ?? "";
    if (html === lastHtmlRef.current) return;
    lastHtmlRef.current = html;
    onChange(html);
  }, [onChange]);

  const updateSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!isRangeInsideEditor(range)) return;
    selectionRef.current = range.cloneRange();
  }, [isRangeInsideEditor]);

  const ensureSelection = useCallback(() => {
    if (!contentRef.current) return;
    const selection = window.getSelection();
    if (selectionRef.current && isRangeInsideEditor(selectionRef.current)) {
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(contentRef.current);
    range.collapse(false);
    selectionRef.current = range;
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, [isRangeInsideEditor]);

  const restoreSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !selectionRef.current) return;
    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  }, []);

  const runCommand = useCallback(
    (command: string, commandValue?: string) => {
      if (!contentRef.current) return;
      contentRef.current.focus();
      ensureSelection();
      restoreSelection();
      document.execCommand(command, false, commandValue);
      syncFromDom();
    },
    [ensureSelection, restoreSelection, syncFromDom]
  );

  const clearFormatting = useCallback(() => {
    if (!contentRef.current) return;
    contentRef.current.focus();
    updateSelection();
    ensureSelection();
    restoreSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const activeRange = selection.getRangeAt(0);
    const range =
      isRangeInsideEditor(activeRange) && !activeRange.collapsed
        ? activeRange
        : selectionRef.current ?? activeRange;

    if (range.collapsed) {
      const text = getPlainText(contentRef.current);
      const html = plainTextToHtml(text);
      contentRef.current.innerHTML = html;
      syncFromDom();
      const caretRange = document.createRange();
      caretRange.selectNodeContents(contentRef.current);
      caretRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(caretRange);
      updateSelection();
      return;
    }

    const container = document.createElement("div");
    container.appendChild(range.cloneContents());
    const text = getPlainText(container);
    const lastNode = insertTextWithLineBreaks(range, text);
    if (lastNode) {
      const nextRange = document.createRange();
      nextRange.setStartAfter(lastNode);
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
    }
    updateSelection();
    syncFromDom();
  }, [
    ensureSelection,
    isRangeInsideEditor,
    restoreSelection,
    syncFromDom,
    updateSelection,
  ]);

  useEffect(() => {
    const nextValue = value ?? "";
    if (!contentRef.current) return;
    if (lastHtmlRef.current === nextValue) return;
    contentRef.current.innerHTML = nextValue;
    lastHtmlRef.current = nextValue;
  }, [value]);

  useEffect(() => {
    if (!emojiOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!emojiRef.current?.contains(event.target as Node)) {
        setEmojiOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [emojiOpen]);

  useEffect(() => {
    const handleSelectionChange = () => updateSelection();
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [updateSelection]);

  const insertEmoji = useCallback(
    (emoji: string) => {
      if (!contentRef.current) return;
      contentRef.current.focus();
      ensureSelection();
      restoreSelection();
      const inserted = document.execCommand("insertText", false, emoji);
      if (!inserted) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(emoji));
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          contentRef.current.appendChild(document.createTextNode(emoji));
        }
      }
      setEmojiOpen(false);
      syncFromDom();
    },
    [ensureSelection, restoreSelection, syncFromDom]
  );

  const isEmpty = isRichTextEmpty(value ?? "");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-2">
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand("bold");
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-1 text-xs font-semibold text-[var(--text)] hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
          aria-label="Bold"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand("italic");
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-1 text-xs italic text-[var(--text)] hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
          aria-label="Italic"
        >
          I
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand("underline");
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-1 text-xs underline text-[var(--text)] hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
          aria-label="Underline"
        >
          U
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand("insertUnorderedList");
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text)] hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
          aria-label="Bullet list"
        >
          Bullets
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand("insertOrderedList");
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text)] hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
          aria-label="Numbered list"
        >
          Numbers
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            clearFormatting();
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text)] hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
          aria-label="Clear formatting"
        >
          Clear
        </button>
        <div ref={emojiRef} className="relative">
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              updateSelection();
              setEmojiOpen((open) => !open);
            }}
            className="rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text)] hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
            aria-label="Insert emoji"
          >
            Emoji
          </button>
          {emojiOpen ? (
            <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-2 shadow-lg">
              <div className="grid grid-cols-6 gap-1">
                {emojiOptions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      insertEmoji(emoji);
                    }}
                    className="rounded-md px-1 py-1 text-base hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                    aria-label={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div
        className={cn(
          "relative rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]",
          "focus-within:border-[var(--accent)]"
        )}
      >
        {isEmpty ? (
          <span className="pointer-events-none absolute left-3 top-2 text-xs text-[var(--muted)]">
            {placeholder}
          </span>
        ) : null}
        <div
          ref={contentRef}
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder}
          suppressContentEditableWarning
          spellCheck
          onInput={syncFromDom}
          onKeyUp={updateSelection}
          onMouseUp={updateSelection}
          className={cn(
            "min-h-[140px] px-3 py-2 text-sm text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)] focus-visible:ring-inset",
            "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1",
            "[&_i]:italic [&_em]:italic [&_u]:underline"
          )}
        />
      </div>
    </div>
  );
}
