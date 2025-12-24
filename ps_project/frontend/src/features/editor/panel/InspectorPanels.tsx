"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { AdventureModel, LinkModel, NodeModel } from "@/domain/models";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/features/ui-core/primitives/tabs";
import { LabelValue } from "@/ui-core/LabelValue";
import { cn } from "@/lib/utils";
import type { EditorNodeInspectorTab } from "../state/editorStore";
import { ChevronDown, Clock } from "lucide-react";

const chapterTypeOptions = [
  { value: "", label: "Default" },
  { value: "start-node", label: "Start" },
  { value: "chapter-node", label: "Chapter" },
  { value: "chapter-node-plain", label: "Chapter (plain)" },
  { value: "videoplayer-node", label: "Video player" },
  { value: "random-node", label: "Random" },
  { value: "ref-node", label: "Reference" },
  { value: "ref-node-tab", label: "Reference (new tab)" },
  { value: "podplayer-node", label: "Audio player" },
];

const tabOptions: Array<{ value: EditorNodeInspectorTab; label: string }> = [
  { value: "content", label: "Content" },
  { value: "style", label: "Style" },
  { value: "buttons", label: "Buttons" },
  { value: "logic", label: "Logic" },
];

const placeholderText = {
  style: "Style controls coming in the next update.",
  buttons: "Button controls coming in the next update.",
  logic: "Logic tools coming in the next update.",
};

const emojiOptions = [
  "\u{1F600}",
  "\u{1F601}",
  "\u{1F602}",
  "\u{1F923}",
  "\u{1F60A}",
  "\u{1F60D}",
  "\u{1F60E}",
  "\u{1F914}",
  "\u{1F44D}",
  "\u{1F44F}",
  "\u{1F525}",
  "\u2728",
  "\u{1F389}",
  "\u2705",
  "\u2764\uFE0F",
  "\u{1F9E9}",
  "\u{1F5FA}\uFE0F",
  "\u26A1",
  "\u{1F4CC}",
  "\u{1F517}",
];

const navigationStyleOptions = [
  { value: "default", label: "Default" },
  { value: "swipe", label: "Swipe" },
  { value: "swipeWithButton", label: "Swipe with button" },
  { value: "leftright", label: "Left/right" },
  { value: "right", label: "Right" },
  { value: "noButtons", label: "No buttons" },
];

const navigationStyleValues = new Set(
  navigationStyleOptions.map((option) => option.value)
);

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

const readStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((entry): entry is string => typeof entry === "string");
        }
      } catch {
        return [trimmed];
      }
    }
    return [trimmed];
  }
  return [];
};

const SCENE_COLOR_DEFAULTS = {
  color_background: "#ffffff",
  color_foreground: "#000000",
  alpha_foreground: 0,
  color_text: "#ffffff",
  alpha_text: 100,
  color_textbackground: "#000000",
  alpha_textbackground: 40,
  color_buttontext: "#ffffff",
  alpha_buttontext: 100,
  color_buttonbackground: "#000000",
  alpha_buttonbackground: 40,
};

const isHexColor = (value: string): boolean =>
  /^#[0-9a-fA-F]{6}$/.test(value);

const clampAlpha = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(value)));

const readNodePropValue = (node: NodeModel, key: string): unknown => {
  const rawProps = node.rawProps ?? {};
  const fallbackProps = (node.props as Record<string, unknown> | null) ?? {};
  return rawProps[key] ?? fallbackProps[key];
};

const getColorProp = (
  node: NodeModel,
  key: keyof typeof SCENE_COLOR_DEFAULTS,
  fallback: string
): string => {
  const value = readNodePropValue(node, key);
  if (typeof value === "string" && isHexColor(value)) {
    return value;
  }
  return fallback;
};

const getAlphaProp = (
  node: NodeModel,
  key: keyof typeof SCENE_COLOR_DEFAULTS,
  fallback: number
): number => {
  const value = readNodePropValue(node, key);
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? parseFloat(value)
        : Number.NaN;
  return Number.isFinite(parsed) ? clampAlpha(parsed) : fallback;
};

const getNavigationStyle = (node: NodeModel): string => {
  const value = readNodePropValue(node, "background.navigation_style");
  const tokens = readStringArray(value);
  const candidate = tokens[0]?.trim() ?? "";
  if (!candidate || candidate === "default") return "default";
  return navigationStyleValues.has(candidate) ? candidate : "default";
};

const getNavigationSettings = (node: NodeModel): string[] =>
  readStringArray(readNodePropValue(node, "playerNavigation.settings"));

const getNodeChapterType = (node: NodeModel): string => {
  const primaryProps = (node.props as Record<string, unknown> | null) ?? {};
  const fallbackProps = node.rawProps ?? {};
  const rawValue =
    primaryProps.settings_chapterType ??
    primaryProps.settingsChapterType ??
    primaryProps.chapterType ??
    primaryProps.chapter_type ??
    fallbackProps.settings_chapterType ??
    fallbackProps.settingsChapterType ??
    fallbackProps.chapterType ??
    fallbackProps.chapter_type;
  const values = readStringArray(rawValue);
  return values[0] ?? "";
};

type InspectorShellProps = {
  title: string;
  subtitle?: ReactNode | null;
  meta?: string | null;
  children: ReactNode;
};

function InspectorShell({ title, subtitle, meta, children }: InspectorShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-[var(--border)] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold text-[var(--text)]">
              {title}
            </p>
            {subtitle ? (
              <div className="text-xs text-[var(--muted)]">{subtitle}</div>
            ) : null}
          </div>
          {meta ? (
            <span className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[10px] font-mono text-[var(--muted)]">
              {meta}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex-1 space-y-4 px-4 py-4 text-sm text-[var(--text)]">
        {children}
      </div>
    </div>
  );
}

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function RichTextEditor({
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

type NodeInspectorPanelProps = {
  node: NodeModel;
  activeTab: EditorNodeInspectorTab;
  onTabChange: (tab: EditorNodeInspectorTab) => void;
  onTitleChange: (title: string) => void;
  onTextChange: (text: string) => void;
  onNodeTypeChange: (chapterType: string) => void;
  onNodePropChange: (path: string, value: unknown) => void;
};

export function NodeInspectorPanel({
  node,
  activeTab,
  onTabChange,
  onTitleChange,
  onTextChange,
  onNodeTypeChange,
  onNodePropChange,
}: NodeInspectorPanelProps) {
  const chapterType = getNodeChapterType(node);
  const isRefNode = chapterType.startsWith("ref-node");
  const navigationStyle = getNavigationStyle(node);
  const navigationSettings = getNavigationSettings(node);
  const hasNavigationSetting = (token: string) =>
    navigationSettings.some(
      (entry) => entry.toLowerCase() === token.toLowerCase()
    );
  const updateNavigationSetting = (token: string, enabled: boolean) => {
    const normalizedToken = token.toLowerCase();
    const next = navigationSettings.filter(
      (entry) => entry.toLowerCase() !== normalizedToken
    );
    if (enabled) {
      next.push(token);
    }
    onNodePropChange("playerNavigation.settings", next);
  };
  const sceneColors = {
    background: getColorProp(
      node,
      "color_background",
      SCENE_COLOR_DEFAULTS.color_background
    ),
    foreground: getColorProp(
      node,
      "color_foreground",
      SCENE_COLOR_DEFAULTS.color_foreground
    ),
    foregroundAlpha: getAlphaProp(
      node,
      "alpha_foreground",
      SCENE_COLOR_DEFAULTS.alpha_foreground
    ),
    text: getColorProp(node, "color_text", SCENE_COLOR_DEFAULTS.color_text),
    textAlpha: getAlphaProp(
      node,
      "alpha_text",
      SCENE_COLOR_DEFAULTS.alpha_text
    ),
    textBackground: getColorProp(
      node,
      "color_textbackground",
      SCENE_COLOR_DEFAULTS.color_textbackground
    ),
    textBackgroundAlpha: getAlphaProp(
      node,
      "alpha_textbackground",
      SCENE_COLOR_DEFAULTS.alpha_textbackground
    ),
    buttonText: getColorProp(
      node,
      "color_buttontext",
      SCENE_COLOR_DEFAULTS.color_buttontext
    ),
    buttonTextAlpha: getAlphaProp(
      node,
      "alpha_buttontext",
      SCENE_COLOR_DEFAULTS.alpha_buttontext
    ),
    buttonBackground: getColorProp(
      node,
      "color_buttonbackground",
      SCENE_COLOR_DEFAULTS.color_buttonbackground
    ),
    buttonBackgroundAlpha: getAlphaProp(
      node,
      "alpha_buttonbackground",
      SCENE_COLOR_DEFAULTS.alpha_buttonbackground
    ),
  };

  return (
    <InspectorShell
      title="Node settings"
      meta={`#${node.nodeId}`}
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as EditorNodeInspectorTab)}
      >
        <TabsList className="w-full">
          {tabOptions.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="content">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                Node name
              </label>
              <input
                value={node.title ?? ""}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="Untitled node"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
              />
            </div>

            <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
              <CollapsibleSection title="Node type" defaultOpen>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    Type
                  </label>
                  <div className="relative w-48">
                    <select
                      value={chapterType}
                      onChange={(event) => onNodeTypeChange(event.target.value)}
                      className="w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 pr-7 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                    >
                      {chapterTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
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
              </CollapsibleSection>

              <CollapsibleSection title="Text" defaultOpen>
                <div className="space-y-3">
                  {isRefNode ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                          Reference URL
                        </label>
                        <input
                          value={node.text ?? ""}
                          onChange={(event) => onTextChange(event.target.value)}
                          placeholder="https://example.com"
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                        />
                        <p className="text-xs text-[var(--muted)]">
                          Reference nodes open the first URL found in `node.text`.
                        </p>
                      </div>
                    </>
                  ) : (
                    <RichTextEditor
                      value={node.text ?? ""}
                      onChange={onTextChange}
                      placeholder="Write the node content..."
                    />
                  )}
                </div>
              </CollapsibleSection>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="style">
          <div className="space-y-4">
              <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
                <CollapsibleSection title="Scene colors" defaultOpen>
                  <div className="space-y-4">
                  <ColorOnlyField
                    label="Background"
                    value={sceneColors.background}
                    onChange={(value) =>
                      onNodePropChange("color_background", value)
                    }
                  />
                  <ColorAlphaField
                    label="Foreground overlay"
                    colorValue={sceneColors.foreground}
                    alphaValue={sceneColors.foregroundAlpha}
                    onColorChange={(value) =>
                      onNodePropChange("color_foreground", value)
                    }
                    onAlphaChange={(value) =>
                      onNodePropChange("alpha_foreground", String(value))
                    }
                  />
                  <ColorAlphaField
                    label="Text"
                    colorValue={sceneColors.text}
                    alphaValue={sceneColors.textAlpha}
                    onColorChange={(value) =>
                      onNodePropChange("color_text", value)
                    }
                    onAlphaChange={(value) =>
                      onNodePropChange("alpha_text", String(value))
                    }
                  />
                  <ColorAlphaField
                    label="Text background"
                    colorValue={sceneColors.textBackground}
                    alphaValue={sceneColors.textBackgroundAlpha}
                    onColorChange={(value) =>
                      onNodePropChange("color_textbackground", value)
                    }
                    onAlphaChange={(value) =>
                      onNodePropChange("alpha_textbackground", String(value))
                    }
                  />
                  <ColorAlphaField
                    label="Button text"
                    colorValue={sceneColors.buttonText}
                    alphaValue={sceneColors.buttonTextAlpha}
                    onColorChange={(value) =>
                      onNodePropChange("color_buttontext", value)
                    }
                    onAlphaChange={(value) =>
                      onNodePropChange("alpha_buttontext", String(value))
                    }
                  />
                  <ColorAlphaField
                    label="Button background"
                    colorValue={sceneColors.buttonBackground}
                    alphaValue={sceneColors.buttonBackgroundAlpha}
                    onColorChange={(value) =>
                      onNodePropChange("color_buttonbackground", value)
                    }
                    onAlphaChange={(value) =>
                      onNodePropChange("alpha_buttonbackground", String(value))
                    }
                  />
                  </div>
                </CollapsibleSection>
              </div>

              <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
                <CollapsibleSection title="Navigation" defaultOpen>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium text-[var(--text-secondary)]">
                        Navigation style
                      </label>
                      <div className="relative w-48">
                        <select
                          value={navigationStyle}
                          onChange={(event) =>
                            onNodePropChange("background.navigation_style", [
                              event.target.value,
                            ])
                          }
                          className="w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 pr-7 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                        >
                          {navigationStyleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
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

                    <ToggleRow
                      label="Show current node button"
                      checked={hasNavigationSetting("show-current-node")}
                      onToggle={(next) =>
                        updateNavigationSetting("show-current-node", next)
                      }
                    />
                    <ToggleRow
                      label="Navigation opaque"
                      checked={hasNavigationSetting("navigation-opaque")}
                      onToggle={(next) =>
                        updateNavigationSetting("navigation-opaque", next)
                      }
                    />
                  </div>
                </CollapsibleSection>
              </div>
            </div>
          </TabsContent>
        <TabsContent value="buttons">
          <PlaceholderPanel>{placeholderText.buttons}</PlaceholderPanel>
        </TabsContent>
        <TabsContent value="logic">
          <PlaceholderPanel>{placeholderText.logic}</PlaceholderPanel>
        </TabsContent>
      </Tabs>
    </InspectorShell>
  );
}

type LinkInspectorPanelProps = {
  link: LinkModel;
};

export function LinkInspectorPanel({ link }: LinkInspectorPanelProps) {
  const isBidirectional = String(link.type ?? "")
    .toLowerCase()
    .includes("bidirectional");
  const arrow = isBidirectional ? "<->" : "->";

  return (
    <InspectorShell
      title="Link settings"
      meta={`#${link.linkId}`}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard
          label="Connection"
          value={
            <span className="inline-flex items-center gap-2 font-mono">
              <span>#{link.source}</span>
              <span className="text-[var(--muted)]">{arrow}</span>
              <span>#{link.target}</span>
            </span>
          }
          className="sm:col-span-2"
        />
        <InfoCard label="Type" value={link.type || "default"} />
        <InfoCard label="Label" value={link.label || "Untitled"} />
      </div>
      <PlaceholderPanel>Link editing coming in the next update.</PlaceholderPanel>
    </InspectorShell>
  );
}

type AdventureInspectorPanelProps = {
  adventure: AdventureModel;
};

export function AdventureInspectorPanel({
  adventure,
}: AdventureInspectorPanelProps) {
  return (
    <InspectorShell
      title={adventure.title || "Adventure"}
      subtitle="Adventure overview"
      meta={`#${adventure.id}`}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Nodes" value={adventure.nodes.length} />
        <StatCard label="Links" value={adventure.links.length} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard label="Edit slug" value={adventure.slug || "n/a"} />
        <InfoCard label="View slug" value={adventure.viewSlug || "n/a"} />
      </div>
      <PlaceholderPanel>Adventure settings coming in the next update.</PlaceholderPanel>
    </InspectorShell>
  );
}

function PlaceholderPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[120px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-6 text-xs text-[var(--muted)]",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
        <p className="text-[var(--muted)]">{children}</p>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  titleClassName,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  titleClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-2 text-left",
          "hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)] focus-visible:ring-inset"
        )}
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[var(--muted)] transition-transform",
            open ? "rotate-0" : "-rotate-90"
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
      {open ? <div className="space-y-3 px-4 pb-3">{children}</div> : null}
    </div>
  );
}

const colorInputClasses =
  "h-8 w-12 cursor-pointer rounded-md bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]";

const rangeInputClasses = cn(
  "h-1 w-full cursor-pointer appearance-none bg-transparent",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]",
  "[&::-webkit-slider-thumb]:appearance-none",
  "[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3",
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)]",
  "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[var(--border)]",
  "[&::-webkit-slider-thumb]:mt-[-0.25rem]",
  "[&::-webkit-slider-runnable-track]:h-1",
  "[&::-webkit-slider-runnable-track]:rounded-full",
  "[&::-webkit-slider-runnable-track]:bg-[var(--border)]",
  "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3",
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--accent)]",
  "[&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[var(--border)]",
  "[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full",
  "[&::-moz-range-track]:bg-[var(--border)]"
);

function ColorOnlyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </span>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label} color`}
          className={colorInputClasses}
        />
      </div>
    </div>
  );
}

function ColorAlphaField({
  label,
  colorValue,
  alphaValue,
  onColorChange,
  onAlphaChange,
}: {
  label: string;
  colorValue: string;
  alphaValue: number;
  onColorChange: (value: string) => void;
  onAlphaChange: (value: number) => void;
}) {
  const clampedAlpha = clampAlpha(alphaValue);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </span>
        <input
          type="color"
          value={colorValue}
          onChange={(event) => onColorChange(event.target.value)}
          aria-label={`${label} color`}
          className={colorInputClasses}
        />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <label className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span className="whitespace-nowrap">Opacity</span>
          <input
            type="range"
            min={0}
            max={100}
            value={clampedAlpha}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) return;
              onAlphaChange(clampAlpha(next));
            }}
            aria-label={`${label} opacity`}
            className={rangeInputClasses}
          />
        </label>
        <input
          type="number"
          min={0}
          max={100}
          value={clampedAlpha}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (!Number.isFinite(next)) return;
            onAlphaChange(clampAlpha(next));
          }}
          aria-label={`${label} opacity value`}
          className="w-16 rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onToggle(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-left hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
    >
      <span className="text-sm font-medium text-[var(--text-secondary)]">
        {label}
      </span>
      <span
        className={cn(
          "inline-flex min-w-[56px] items-center justify-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
          checked
            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
            : "border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--muted)]"
        )}
      >
        {checked ? "On" : "Off"}
      </span>
    </button>
  );
}

function InfoCard({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2",
        className
      )}
    >
      <LabelValue label={label} value={value} className="gap-1" />
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text)]">
        {value}
      </p>
    </div>
  );
}
