"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  FileCode2,
  Eraser,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Smile,
  Undo2,
  Underline,
} from "lucide-react";
import sanitizeHtml from "sanitize-html";
import MarkdownIt from "markdown-it";
import { Extension } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import UnderlineExtension from "@tiptap/extension-underline";
import { cn } from "@/lib/utils";
import { getFontMeta } from "@/lib/fonts";
import { emojiOptions } from "../constants";
import "./RichTextEditor.css";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  fontList?: string[];
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const stripHtml = (value: string): string =>
  value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");

const isRichTextEmpty = (value: string): boolean =>
  stripHtml(value).trim().length === 0;

const normalizeOutput = (html: string, isEmpty: boolean) =>
  isEmpty ? "" : html;

const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true });

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write node content...",
  readOnly = false,
  fontList = [],
}: RichTextEditorProps) {
  const emojiRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<string>("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  const fontOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [
      { value: "", label: "Default" },
    ];
    const seen = new Set<string>();
    fontList.forEach((entry) => {
      const meta = getFontMeta(entry);
      if (!meta?.family || seen.has(meta.family)) return;
      seen.add(meta.family);
      const labelBase = meta.displayName || meta.fileName || meta.family;
      options.push({
        value: meta.family,
        label: labelBase,
      });
    });
    return options;
  }, [fontList]);

  const fontSizeOptions = useMemo(
    () => [
      "12px",
      "14px",
      "16px",
      "18px",
      "20px",
      "24px",
      "28px",
      "32px",
      "36px",
      "40px",
      "48px",
      "56px",
      "64px",
      "72px",
      "80px",
      "96px",
      "112px",
      "128px",
      "144px",
      "160px",
      "180px",
      "200px",
    ],
    []
  );

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      TextStyle,
      FontFamily,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      FontSizeExtension,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      UnderlineExtension,
    ],
    []
  );

  const sanitizePastedHtml = useCallback(
    (html: string) =>
      sanitizeHtml(html, {
        allowedTags: [
          "p",
          "strong",
          "b",
          "em",
          "i",
          "u",
          "a",
          "ul",
          "ol",
          "li",
          "br",
          "h1",
          "h2",
          "blockquote",
          "code",
          "pre",
          "span",
          "del",
        ],
        allowedAttributes: {
          a: ["href", "title", "target", "rel"],
          span: ["style"],
          p: ["style"],
          h1: ["style"],
          h2: ["style"],
          blockquote: ["style"],
          code: ["class"],
          pre: ["class"],
        },
        allowedSchemes: ["http", "https", "mailto", "tel"],
        transformTags: {
          a: (tagName, attribs) => {
            const href = attribs.href || "#";
            const isExternal = href.startsWith("http");
            return {
              tagName,
              attribs: {
                ...attribs,
                href,
                target: isExternal ? "_blank" : attribs.target ?? "_self",
                rel: isExternal ? "noopener noreferrer" : attribs.rel ?? undefined,
              },
            };
          },
        },
      }),
    []
  );

  const editor = useEditor({
    extensions,
    content: value ?? "",
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "ps-richtext-uniform min-h-[140px] px-3 py-2 text-sm text-[var(--text)] outline-none",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1",
          "[&_i]:italic [&_em]:italic [&_u]:underline [&_a]:underline [&_a]:text-[var(--accent-strong)]"
        ),
        style: "font-synthesis: weight style;",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": placeholder,
        "aria-readonly": readOnly ? "true" : "false",
        spellcheck: "true",
      },
      transformPastedHTML: sanitizePastedHtml,
    },
    onUpdate: ({ editor }) => {
      const html = normalizeOutput(editor.getHTML(), editor.isEmpty);
      if (html === lastHtmlRef.current) return;
      lastHtmlRef.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor) return;
    const nextValue = value ?? "";
    if (nextValue === lastHtmlRef.current) return;
    editor.commands.setContent(nextValue, false);
    lastHtmlRef.current = nextValue;
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      forceUpdate((prev) => prev + 1);
    };
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

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

  const insertEmoji = useCallback(
    (emoji: string) => {
      if (!editor || readOnly) return;
      editor.chain().focus().insertContent(emoji).run();
      setEmojiOpen(false);
    },
    [editor, readOnly]
  );
  const handleSetLink = useCallback(() => {
    if (!editor || readOnly) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const nextUrl = window.prompt("Enter URL", previousUrl ?? "");
    if (nextUrl === null) return;
    const trimmed = nextUrl.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  }, [editor, readOnly]);
  const handleConvertMarkdown = useCallback(() => {
    if (!editor || readOnly) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    const selectedText = editor.state.doc.textBetween(from, to, "\n");
    if (!selectedText.trim()) return;
    const html = sanitizePastedHtml(markdown.render(selectedText));
    if (!html.trim()) return;
    editor.chain().focus().insertContent(html).run();
  }, [editor, readOnly, sanitizePastedHtml]);

  const isEmpty = editor ? editor.isEmpty : isRichTextEmpty(value ?? "");
  const toolbarButtonClass =
    "flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] p-0 text-[var(--text)] hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]";

  const currentBlock = editor?.isActive("heading", { level: 1 })
    ? "h1"
    : editor?.isActive("heading", { level: 2 })
      ? "h2"
      : "paragraph";
  const currentFontFamily = editor?.getAttributes("textStyle")?.fontFamily ?? "";
  const currentFontSize = editor?.getAttributes("textStyle")?.fontSize ?? "";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-2">
        <select
          value={currentFontFamily}
          onChange={(event) => {
            if (!editor || readOnly) return;
            const value = event.target.value;
            if (!value) {
              editor.chain().focus().unsetFontFamily().run();
            } else {
              editor.chain().focus().setFontFamily(value).run();
            }
          }}
          disabled={readOnly || !editor}
          className={cn(
            "h-8 rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 text-xs text-[var(--text)]",
            readOnly && "cursor-not-allowed opacity-60"
          )}
          aria-label="Font family"
        >
          {fontOptions.map((option) => (
            <option key={option.value || "default"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={currentFontSize}
          onChange={(event) => {
            if (!editor || readOnly) return;
            const value = event.target.value;
            if (!value) {
              editor.chain().focus().unsetFontSize().run();
            } else {
              editor.chain().focus().setFontSize(value).run();
            }
          }}
          disabled={readOnly || !editor}
          className={cn(
            "h-8 rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 text-xs text-[var(--text)]",
            readOnly && "cursor-not-allowed opacity-60"
          )}
          aria-label="Font size"
        >
          <option value="">Size</option>
          {fontSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <select
          value={currentBlock}
          onChange={(event) => {
            if (!editor || readOnly) return;
            const value = event.target.value;
            if (value === "h1") {
              editor.chain().focus().setHeading({ level: 1 }).run();
            } else if (value === "h2") {
              editor.chain().focus().setHeading({ level: 2 }).run();
            } else {
              editor.chain().focus().setParagraph().run();
            }
          }}
          disabled={readOnly || !editor}
          className={cn(
            "h-8 rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 text-xs text-[var(--text)]",
            readOnly && "cursor-not-allowed opacity-60"
          )}
          aria-label="Block style"
        >
          <option value="paragraph">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
        </select>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            editor?.chain().focus().setTextAlign("left").run();
          }}
          disabled={readOnly || !editor}
          className={cn(
            toolbarButtonClass,
            readOnly && "cursor-not-allowed opacity-60"
          )}
          aria-label="Align left"
        >
          <AlignLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            editor?.chain().focus().setTextAlign("center").run();
          }}
          disabled={readOnly || !editor}
          className={cn(
            toolbarButtonClass,
            readOnly && "cursor-not-allowed opacity-60"
          )}
          aria-label="Align center"
        >
          <AlignCenter className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            editor?.chain().focus().setTextAlign("right").run();
          }}
          disabled={readOnly || !editor}
          className={cn(
            toolbarButtonClass,
            readOnly && "cursor-not-allowed opacity-60"
          )}
          aria-label="Align right"
        >
          <AlignRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            editor?.chain().focus().toggleBold().run();
          }}
          disabled={readOnly || !editor}
          className={cn(
            toolbarButtonClass,
            readOnly && "cursor-not-allowed opacity-60"
          )}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            editor?.chain().focus().toggleItalic().run();
          }}
          disabled={readOnly || !editor}
          className={cn(
            toolbarButtonClass,
            readOnly && "cursor-not-allowed opacity-60"
          )}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            editor?.chain().focus().toggleUnderline().run();
          }}
          disabled={readOnly || !editor}
          className={cn(
            toolbarButtonClass,
            readOnly && "cursor-not-allowed opacity-60"
          )}
          aria-label="Underline"
        >
          <Underline className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            editor?.chain().focus().toggleCode().run();
          }}
          disabled={readOnly || !editor}
          className={cn(
            toolbarButtonClass,
            readOnly && "cursor-not-allowed opacity-60"
          )}
          aria-label="Inline code"
        >
          <Code className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            editor?.chain().focus().toggleBlockquote().run();
          }}
          disabled={readOnly || !editor}
          className={cn(
            toolbarButtonClass,
            readOnly && "cursor-not-allowed opacity-60"
          )}
          aria-label="Blockquote"
        >
          <Quote className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            handleConvertMarkdown();
          }}
          disabled={readOnly || !editor || editor.state.selection.empty}
          className={cn(
            toolbarButtonClass,
            (readOnly || !editor || editor.state.selection.empty) &&
              "cursor-not-allowed opacity-60"
          )}
          aria-label="Convert markdown selection"
          title="Convert markdown selection"
        >
          <FileCode2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            handleSetLink();
          }}
          disabled={readOnly || !editor}
          className={cn(
            toolbarButtonClass,
            readOnly && "cursor-not-allowed opacity-60"
          )}
          aria-label="Link"
        >
          <Link2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            editor?.chain().focus().toggleBulletList().run();
          }}
          disabled={readOnly || !editor}
          className={cn(
            toolbarButtonClass,
            readOnly && "cursor-not-allowed opacity-60"
          )}
          aria-label="Bullet list"
        >
          <List className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            editor?.chain().focus().toggleOrderedList().run();
          }}
          disabled={readOnly || !editor}
          className={cn(
            toolbarButtonClass,
            readOnly && "cursor-not-allowed opacity-60"
          )}
          aria-label="Numbered list"
        >
          <ListOrdered className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            editor?.chain().focus().unsetAllMarks().clearNodes().run();
          }}
          disabled={readOnly || !editor}
          className={cn(
            toolbarButtonClass,
            readOnly && "cursor-not-allowed opacity-60"
          )}
          aria-label="Clear formatting"
        >
          <Eraser className="h-4 w-4" aria-hidden="true" />
        </button>
        <div ref={emojiRef} className="relative">
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              setEmojiOpen((open) => !open);
            }}
            disabled={readOnly || !editor}
            className={cn(
              toolbarButtonClass,
              readOnly && "cursor-not-allowed opacity-60"
            )}
            aria-label="Insert emoji"
          >
          <Smile className="h-4 w-4" aria-hidden="true" />
        </button>
        {emojiOpen && !readOnly ? (
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
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            editor?.chain().focus().undo().run();
          }}
          disabled={readOnly || !editor || !editor.can().undo()}
          className={cn(
            toolbarButtonClass,
            (readOnly || !editor?.can().undo()) &&
              "cursor-not-allowed opacity-60"
          )}
          aria-label="Undo"
        >
          <Undo2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            editor?.chain().focus().redo().run();
          }}
          disabled={readOnly || !editor || !editor.can().redo()}
          className={cn(
            toolbarButtonClass,
            (readOnly || !editor?.can().redo()) &&
              "cursor-not-allowed opacity-60"
          )}
          aria-label="Redo"
        >
          <Redo2 className="h-4 w-4" aria-hidden="true" />
        </button>
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
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

const FontSizeExtension = Extension.create({
  name: "fontSize",
  addOptions() {
    return {
      types: ["textStyle"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) =>
              attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});
