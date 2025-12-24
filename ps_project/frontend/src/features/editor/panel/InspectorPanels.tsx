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

const textShadowOptions = [
  { value: "", label: "None" },
  { value: "text-shadow-black", label: "Black" },
  { value: "text-shadow-white", label: "White" },
];

const textShadowValues = new Set(
  textShadowOptions.map((option) => option.value)
);

const NAV_TEXT_SIZE_MIN = 8;
const NAV_TEXT_SIZE_MAX = 18;
const NAV_TEXT_SIZE_DEFAULT = 14;

const verticalPositionOptions = [
  { value: "vertical-align-top", label: "Top" },
  { value: "vertical-align-center", label: "Center" },
  { value: "vertical-align-bottom", label: "Bottom" },
];

const verticalPositionValues = new Set(
  verticalPositionOptions.map((option) => option.value)
);

const SCROLL_SPEED_MIN = 0;
const SCROLL_SPEED_MAX = 1.5;
const SCROLL_SPEED_DEFAULT = 0.5;
const BLUR_MIN = 0;
const BLUR_MAX = 100;
const MARGIN_DEFAULT = 18;
const MARGIN_MIN = 0;
const MARGIN_MAX = 100;
const AUDIO_VOLUME_MIN = 0;
const AUDIO_VOLUME_MAX = 100;
const CONDITIONS_COLOR_DEFAULT = "#000000";
const CONDITIONS_ALPHA_DEFAULT = 40;

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

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const parseFontEntry = (entry: string) => {
  const trimmed = entry.trim();
  const isUrl = /^https?:\/\//.test(trimmed) || trimmed.startsWith("/");
  const name =
    isUrl && trimmed.includes("/")
      ? trimmed.split("/").pop()?.replace(/\.[^/.]+$/, "") ?? trimmed
      : trimmed;
  return { name, url: isUrl ? trimmed : undefined };
};

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

const getColorValue = (
  node: NodeModel,
  key: string,
  fallback: string
): string => {
  const value = readNodePropValue(node, key);
  if (typeof value === "string" && isHexColor(value)) {
    return value;
  }
  return fallback;
};

const getAlphaValue = (
  node: NodeModel,
  key: string,
  fallback: number
): number => {
  const value = readNodePropValue(node, key);
  const primary =
    Array.isArray(value) && value.length > 0 ? value[0] : value;
  const parsed =
    typeof primary === "number"
      ? primary
      : typeof primary === "string"
        ? parseFloat(primary)
        : Number.NaN;
  return Number.isFinite(parsed) ? clampAlpha(parsed) : fallback;
};

const getNumberProp = (
  node: NodeModel,
  key: string,
  fallback: number
): number => {
  const value = readNodePropValue(node, key);
  const primary =
    Array.isArray(value) && value.length > 0 ? value[0] : value;
  const parsed =
    typeof primary === "number"
      ? primary
      : typeof primary === "string"
        ? parseFloat(primary)
        : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
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

const getFontToken = (node: NodeModel): string => {
  const value =
    readNodePropValue(node, "background.font") ??
    readNodePropValue(node, "background_font");
  const tokens = readStringArray(value);
  return tokens[0]?.trim() ?? "";
};

const getTextShadow = (node: NodeModel): string => {
  const tokens = readStringArray(
    readNodePropValue(node, "outer_container.textShadow")
  );
  const candidate = tokens[0]?.trim() ?? "";
  return textShadowValues.has(candidate) ? candidate : "";
};

const isToggleOn = (value: unknown): boolean => {
  const tokens = readStringArray(value).map((token) => token.toLowerCase());
  return tokens.some(
    (token) =>
      token === "on" || token === "true" || token === "1" || token === "yes"
  );
};

const getGrayscaleEnabled = (node: NodeModel): boolean =>
  readStringArray(readNodePropValue(node, "settings_grayscale")).some(
    (token) => token.toLowerCase() === "on"
  );

const getBlurAmount = (node: NodeModel): number => {
  const blur = getNumberProp(node, "color_blur", 0);
  return Number.isFinite(blur) ? Math.max(0, blur) : 0;
};

const getHideVisitedEnabled = (node: NodeModel): boolean =>
  readStringArray(readNodePropValue(node, "node_conditions")).some(
    (token) => token.toLowerCase() === "hide_visited"
  );

const getStatisticsEnabled = (node: NodeModel): boolean =>
  isToggleOn(readNodePropValue(node, "node_statistics"));

const getNavTextSize = (node: NodeModel): number => {
  const raw = getNumberProp(node, "playerNavigation_textSize", NAV_TEXT_SIZE_DEFAULT);
  return clampNumber(raw, NAV_TEXT_SIZE_MIN, NAV_TEXT_SIZE_MAX);
};

const getAudioVolume = (node: NodeModel): number => {
  const volume = getNumberProp(node, "audio_volume", AUDIO_VOLUME_MAX);
  return Number.isFinite(volume) ? volume : AUDIO_VOLUME_MAX;
};

const getVerticalPosition = (node: NodeModel): string => {
  const value = readNodePropValue(node, "player.verticalPosition");
  const tokens = readStringArray(value);
  const candidate = tokens[0]?.trim() ?? "";
  if (verticalPositionValues.has(candidate)) return candidate;
  return "vertical-align-center";
};

const getScrollSpeed = (node: NodeModel): number => {
  const value = readNodePropValue(node, "settings_scrollSpeed");
  const tokens = readStringArray(value);
  const candidate = tokens[0]?.trim() ?? "";
  const parsed = parseFloat(candidate);
  return Number.isFinite(parsed) ? parsed : SCROLL_SPEED_DEFAULT;
};

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
  fontList?: string[];
  activeTab: EditorNodeInspectorTab;
  onTabChange: (tab: EditorNodeInspectorTab) => void;
  onTitleChange: (title: string) => void;
  onTextChange: (text: string) => void;
  onNodeTypeChange: (chapterType: string) => void;
  onNodePropChange: (path: string, value: unknown) => void;
};

export function NodeInspectorPanel({
  node,
  fontList,
  activeTab,
  onTabChange,
  onTitleChange,
  onTextChange,
  onNodeTypeChange,
  onNodePropChange,
}: NodeInspectorPanelProps) {
  const [sectionState, setSectionState] = useState<Record<string, boolean>>({
    "Node type": false,
    Text: false,
    Background: false,
    Typography: false,
    Layout: false,
    Navigation: false,
    Audio: false,
    "Button appearance": false,
    Conditions: false,
    Tracking: false,
  });
  const setSectionOpen = (key: string, next: boolean) =>
    setSectionState((prev) => ({ ...prev, [key]: next }));
  const chapterType = getNodeChapterType(node);
  const isRefNode = chapterType.startsWith("ref-node");
  const navigationStyle = getNavigationStyle(node);
  const navigationSettings = getNavigationSettings(node);
  const verticalPosition = getVerticalPosition(node);
  const scrollSpeed = getScrollSpeed(node);
  const textShadow = getTextShadow(node);
  const grayscaleEnabled = getGrayscaleEnabled(node);
  const blurAmount = getBlurAmount(node);
  const hideVisitedEnabled = getHideVisitedEnabled(node);
  const statisticsEnabled = getStatisticsEnabled(node);
  const navTextSize = getNavTextSize(node);
  const audioVolume = getAudioVolume(node);
  const marginLeft = getNumberProp(
    node,
    "player_container_marginleft",
    MARGIN_DEFAULT
  );
  const marginRight = getNumberProp(
    node,
    "player_container_marginright",
    MARGIN_DEFAULT
  );
  const conditionsColor = getColorValue(
    node,
    "color_nodeconditions",
    CONDITIONS_COLOR_DEFAULT
  );
  const conditionsAlpha = getAlphaValue(
    node,
    "alpha_nodeconditions",
    CONDITIONS_ALPHA_DEFAULT
  );
  const fontToken = getFontToken(node);
  const uploadedFonts = Array.from(
    new Set(
      (fontList ?? [])
        .map((entry) => parseFontEntry(entry).name)
        .filter((name) => name.length > 0)
    )
  );
  const fontOptions = uploadedFonts.map((name) => ({
    value: `xfont-${name}`,
    label: name,
  }));
  const hasUploadedFonts = fontOptions.length > 0;
  const fontOptionValues = new Set(fontOptions.map((option) => option.value));
  const fontSelectValue = fontToken ?? "";
  const needsLegacyOption =
    fontSelectValue !== "" && !fontOptionValues.has(fontSelectValue);
  const legacyFontLabel = fontSelectValue.replace(/^xfont-/, "").replace(/^font-/, "");
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
              <CollapsibleSection
                title="Node type"
                open={sectionState["Node type"]}
                onToggle={(next) => setSectionOpen("Node type", next)}
              >
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

              <CollapsibleSection
                title="Text"
                open={sectionState.Text}
                onToggle={(next) => setSectionOpen("Text", next)}
              >
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
                    <>
                      <RichTextEditor
                        value={node.text ?? ""}
                        onChange={onTextChange}
                        placeholder="Write the node content..."
                      />
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-sm font-medium text-[var(--text-secondary)]">
                            Text shadow
                          </label>
                          <div className="relative w-48">
                            <select
                              value={textShadow}
                              onChange={(event) =>
                                onNodePropChange("outer_container.textShadow", [
                                  event.target.value,
                                ])
                              }
                              className="w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 pr-7 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                            >
                              {textShadowOptions.map((option) => (
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
                            onNodePropChange(
                              "alpha_textbackground",
                              String(value)
                            )
                          }
                        />
                      </div>
                    </>
                  )}
                </div>
              </CollapsibleSection>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="style">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
                <CollapsibleSection
                  title="Background"
                  open={sectionState.Background}
                  onToggle={(next) => setSectionOpen("Background", next)}
                >
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
                    <ToggleRow
                      label="Grayscale"
                      checked={grayscaleEnabled}
                      onToggle={(next) =>
                        onNodePropChange("settings_grayscale", [
                          next ? "on" : "",
                        ])
                      }
                    />

                    <RangeField
                      label="Blur"
                      value={blurAmount}
                      min={BLUR_MIN}
                      max={BLUR_MAX}
                      step={1}
                      allowBeyondMax
                      onChange={(next) =>
                        onNodePropChange("color_blur", String(next))
                      }
                    />
                  </div>
                </CollapsibleSection>

                <CollapsibleSection
                  title="Typography"
                  open={sectionState.Typography}
                  onToggle={(next) => setSectionOpen("Typography", next)}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium text-[var(--text-secondary)]">
                        Font
                      </label>
                      <div className="relative w-56">
                        <select
                          value={fontSelectValue}
                          onChange={(event) =>
                            onNodePropChange("background.font", [
                              event.target.value,
                            ])
                          }
                          disabled={!hasUploadedFonts}
                          className="w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 pr-7 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="">Default</option>
                          {fontOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                          {needsLegacyOption ? (
                            <option value={fontSelectValue}>
                              Current: {legacyFontLabel}
                            </option>
                          ) : null}
                        </select>
                        <ChevronDown
                          className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                    {!hasUploadedFonts ? (
                      <p className="text-xs text-[var(--muted)]">
                        No uploaded fonts.
                      </p>
                    ) : null}

                    <RangeField
                      label="Navigation font size"
                      value={navTextSize}
                      min={NAV_TEXT_SIZE_MIN}
                      max={NAV_TEXT_SIZE_MAX}
                      step={2}
                      onChange={(next) =>
                        onNodePropChange("playerNavigation_textSize", [
                          String(next),
                        ])
                      }
                    />
                  </div>
                </CollapsibleSection>

                <CollapsibleSection
                  title="Layout"
                  open={sectionState.Layout}
                  onToggle={(next) => setSectionOpen("Layout", next)}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium text-[var(--text-secondary)]">
                        Scroll speed
                      </label>
                      <input
                        type="number"
                        min={SCROLL_SPEED_MIN}
                        max={SCROLL_SPEED_MAX}
                        step={0.05}
                        value={scrollSpeed}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (!Number.isFinite(next)) return;
                          const clamped = clampNumber(
                            next,
                            SCROLL_SPEED_MIN,
                            SCROLL_SPEED_MAX
                          );
                          onNodePropChange("settings_scrollSpeed", [
                            String(clamped),
                          ]);
                        }}
                        className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium text-[var(--text-secondary)]">
                        Vertical position
                      </label>
                      <div className="relative w-48">
                        <select
                          value={verticalPosition}
                          onChange={(event) =>
                            onNodePropChange("player.verticalPosition", [
                              event.target.value,
                            ])
                          }
                          className="w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 pr-7 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                        >
                          {verticalPositionOptions.map((option) => (
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

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-sm font-medium text-[var(--text-secondary)]">
                          Left margin
                        </label>
                        <input
                          type="number"
                          min={MARGIN_MIN}
                          max={MARGIN_MAX}
                          step={1}
                          value={marginLeft}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            if (!Number.isFinite(next)) return;
                            const clamped = clampNumber(
                              next,
                              MARGIN_MIN,
                              MARGIN_MAX
                            );
                            onNodePropChange(
                              "player_container_marginleft",
                              String(clamped)
                            );
                          }}
                          className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-sm font-medium text-[var(--text-secondary)]">
                          Right margin
                        </label>
                        <input
                          type="number"
                          min={MARGIN_MIN}
                          max={MARGIN_MAX}
                          step={1}
                          value={marginRight}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            if (!Number.isFinite(next)) return;
                            const clamped = clampNumber(
                              next,
                              MARGIN_MIN,
                              MARGIN_MAX
                            );
                            onNodePropChange(
                              "player_container_marginright",
                              String(clamped)
                            );
                          }}
                          className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection
                  title="Navigation"
                  open={sectionState.Navigation}
                  onToggle={(next) => setSectionOpen("Navigation", next)}
                >
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

                <CollapsibleSection
                  title="Audio"
                  open={sectionState.Audio}
                  onToggle={(next) => setSectionOpen("Audio", next)}
                >
                  <div className="space-y-4">
                    <RangeField
                      label="Audio volume"
                      value={audioVolume}
                      min={AUDIO_VOLUME_MIN}
                      max={AUDIO_VOLUME_MAX}
                      step={1}
                      onChange={(next) =>
                        onNodePropChange("audio_volume", String(next))
                      }
                    />
                  </div>
                </CollapsibleSection>
              </div>
            </div>
          </TabsContent>
        <TabsContent value="buttons">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
              <CollapsibleSection
                title="Button appearance"
                open={sectionState["Button appearance"]}
                onToggle={(next) => setSectionOpen("Button appearance", next)}
              >
                <div className="space-y-4">
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
          </div>
        </TabsContent>
        <TabsContent value="logic">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
              <CollapsibleSection
                title="Conditions"
                open={sectionState.Conditions}
                onToggle={(next) => setSectionOpen("Conditions", next)}
              >
                <div className="space-y-4">
                  <ToggleRow
                    label="Hide visited"
                    checked={hideVisitedEnabled}
                    onToggle={(next) =>
                      onNodePropChange("node_conditions", [
                        next ? "hide_visited" : "",
                      ])
                    }
                  />
                  <ColorAlphaField
                    label="Condition color"
                    colorValue={conditionsColor}
                    alphaValue={conditionsAlpha}
                    onColorChange={(value) =>
                      onNodePropChange("color_nodeconditions", value)
                    }
                    onAlphaChange={(value) =>
                      onNodePropChange("alpha_nodeconditions", String(value))
                    }
                  />
                </div>
              </CollapsibleSection>
              <CollapsibleSection
                title="Tracking"
                open={sectionState.Tracking}
                onToggle={(next) => setSectionOpen("Tracking", next)}
              >
                <div className="space-y-4">
                  <ToggleRow
                    label="Statistics tracking"
                    checked={statisticsEnabled}
                    onToggle={(next) =>
                      onNodePropChange("node_statistics", [next ? "on" : ""])
                    }
                  />
                  <ToggleRow
                    label="Node variable"
                    checked={hideVisitedEnabled}
                    onToggle={(next) =>
                      onNodePropChange("node_conditions", [
                        next ? "hide_visited" : "",
                      ])
                    }
                  />
                </div>
              </CollapsibleSection>
            </div>
          </div>
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
  open,
  onToggle,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  titleClassName?: string;
  open?: boolean;
  onToggle?: (next: boolean) => void;
  children: ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;
  const handleToggle = () => {
    const next = !isOpen;
    if (onToggle) {
      onToggle(next);
    } else {
      setInternalOpen(next);
    }
  };

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

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  allowBeyondMax = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  allowBeyondMax?: boolean;
}) {
  const sliderValue = clampNumber(value, min, max);

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
          onChange={(event) => {
            const next = Number(event.target.value);
            if (!Number.isFinite(next)) return;
            onChange(clampNumber(next, min, max));
          }}
          aria-label={label}
          className={rangeInputClasses}
        />
        <input
          type="number"
          min={min}
          max={allowBeyondMax ? undefined : max}
          step={step}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (!Number.isFinite(next)) return;
            const normalized = allowBeyondMax
              ? Math.max(min, next)
              : clampNumber(next, min, max);
            onChange(normalized);
          }}
          aria-label={`${label} value`}
          className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
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
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-[var(--text-secondary)]">
        {label}
      </span>
      <span className="relative inline-flex h-5 w-10 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(event) => onToggle(event.target.checked)}
          aria-label={label}
        />
        <span
          className={cn(
            "absolute inset-0 rounded-full border border-[var(--border)] bg-[var(--bg-tertiary)] transition",
            "peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent)]",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent-muted)]"
          )}
        />
        <span
          className={cn(
            "absolute left-0.5 h-4 w-4 rounded-full bg-[var(--bg)] shadow-sm transition",
            "peer-checked:translate-x-5"
          )}
        />
      </span>
    </label>
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
