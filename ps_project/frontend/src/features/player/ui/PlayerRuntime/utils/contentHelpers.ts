import type { NodeModel } from "@/domain/models";
import type { PropsInput } from "@/features/ui-core/props";
import { coerceSeconds } from "./audioHelpers";
import { parsePropsInput, pickFirstString, readRawProp, tokenize } from "./propsParser";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeLegacyHtml = (value: string) =>
  value.replace(/font-size:\s*(\d+(?:\.\d+)?)pt/gi, (match, num) => {
    const parsed = parseInt(num, 10);
    if (!Number.isFinite(parsed)) return match;
    return `font-size: ${(parsed / 10).toFixed(3)}em`;
  });

const hasEditorVersion = (props?: Record<string, unknown> | null): boolean => {
  if (!props) return false;
  const raw = readRawProp(props, [
    "editorVersion",
    "editor_version",
    "editorversion",
  ]);
  const primary = Array.isArray(raw) ? raw[0] : raw;
  if (primary === undefined || primary === null) return false;
  const value = String(primary).trim();
  return value !== "" && value !== "0";
};

const resolveChapterType = (props?: Record<string, unknown> | null): string => {
  if (!props) return "";
  const raw = readRawProp(props, [
    "settings_chapterType",
    "settingsChapterType",
    "chapterType",
    "chapter_type",
  ]);
  return tokenize(raw)[0]?.toLowerCase() ?? "";
};

const buildLegacyNodeText = (
  node: NodeModel,
  nodeProps: Record<string, unknown>
) => {
  const rawText = node.text ?? "";
  const title = (node.title ?? "").trim();
  const hasImage = Boolean(
    node.image?.url ??
      pickFirstString(readRawProp(nodeProps, ["image_url", "imageUrl"]))
  );
  const hasContent = rawText.trim().length > 0;
  let content = rawText;
  let usedFallbackTitle = false;

  if (!hasContent && !hasImage) {
    content = title || "Har finns inget innehall";
    usedFallbackTitle = true;
  }

  const chapterType = resolveChapterType(nodeProps);
  if (chapterType === "start-node") {
    if (title) {
      return `<h1 class="title">${escapeHtml(title)}</h1>`;
    }
    return content;
  }

  if (chapterType === "chapter-node" || chapterType === "chapter-node-plain") {
    if (!title) return content;
    const style =
      chapterType === "chapter-node-plain" ? ' style="border-bottom: none;"' : "";
    const heading = `<h1 class="title"${style}>${escapeHtml(title)}</h1>`;
    if (!hasContent && usedFallbackTitle && content === title) {
      return heading;
    }
    return content ? `${heading}\n${content}` : heading;
  }

  return content;
};

export const buildLegacyContent = (
  node: NodeModel,
  nodeProps: Record<string, unknown>
) => {
  const value = buildLegacyNodeText(node, nodeProps);
  const allowMarkdown = !hasEditorVersion(nodeProps);
  return {
    value: allowMarkdown ? value : normalizeLegacyHtml(value),
    allowMarkdown,
  };
};

const resolveParagraphDelay = (value?: string | null): number => {
  const suffix = value?.split("-")[1]?.toLowerCase() ?? "";
  switch (suffix) {
    case "faster":
      return 1.0;
    case "paragraphs":
      return 2.0;
    case "slower":
      return 3.0;
    case "slowerer":
      return 4.0;
    case "slowest":
      return 5.0;
    default:
      return 0.0;
  }
};

export const readLegacyAnimationSettings = (
  adventureProps?: PropsInput,
  nodeProps?: PropsInput
) => {
  const merged = {
    ...parsePropsInput(adventureProps),
    ...parsePropsInput(nodeProps),
  };
  const animationDelay = coerceSeconds(readRawProp(merged, ["animation_delay"])) ?? 0;
  const navigationDelay =
    coerceSeconds(readRawProp(merged, ["playerNavigation_delay"])) ?? 0;
  const backgroundFadeSeconds =
    coerceSeconds(readRawProp(merged, ["animation_backgroundfade"])) ?? 1;
  const animationToken = pickFirstString(
    readRawProp(merged, ["player_container.animation"])
  );
  const paragraphDelay = resolveParagraphDelay(animationToken);

  return {
    animationDelay,
    navigationDelay,
    backgroundFadeSeconds,
    paragraphDelay,
  };
};
