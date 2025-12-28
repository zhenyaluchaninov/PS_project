"use client";

import { memo, type ReactNode } from "react";
import sanitizeHtml from "sanitize-html";
import MarkdownIt from "markdown-it";

import { cn } from "@/lib/utils";

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
});

const sanitize = (value: string) =>
  sanitizeHtml(value, {
    allowedTags: [
      "p",
      "strong",
      "b",
      "em",
      "a",
      "ul",
      "ol",
      "li",
      "br",
      "h1",
      "h2",
      "h3",
      "blockquote",
      "code",
      "pre",
      "span",
      "del",
      "u",
      "i",
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
            rel: isExternal
              ? "noopener noreferrer"
              : attribs.rel ?? undefined,
          },
        };
      },
    },
  });

export const renderLegacyContent = (
  value: string,
  { allowMarkdown = true }: { allowMarkdown?: boolean } = {}
): string => {
  if (!value) return "";
  const raw = allowMarkdown ? markdown.render(value) : value;
  return sanitize(raw);
};

type LegacyContentProps = {
  value: string;
  allowMarkdown?: boolean;
  className?: string;
};

export const LegacyContent = memo(function LegacyContent({
  value,
  allowMarkdown = true,
  className,
}: LegacyContentProps): ReactNode {
  const html = renderLegacyContent(value, { allowMarkdown });
  return (
    <div
      className={cn(
        "prose prose-invert prose-sm max-w-none prose-a:text-[var(--accent-strong)] prose-blockquote:border-l-[var(--border)] prose-li:marker:text-[var(--accent-strong)]",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
LegacyContent.displayName = "LegacyContent";
