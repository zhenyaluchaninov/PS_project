import type { AdventureModel } from "@/domain/models";
import { buildFallbackPositions } from "./graphHelpers";
import type { GraphNode, GraphNodeData, NodeVariant } from "../types";

function readStringArray(value: unknown): string[] {
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
}

function isTruthyFlag(value: unknown): boolean {
  if (value === true) return true;
  if (value === false || value == null) return false;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return (
      normalized === "on" ||
      normalized === "true" ||
      normalized === "yes" ||
      normalized === "1" ||
      normalized === "hide_visited"
    );
  }
  return false;
}

function isFlagEnabled(value: unknown): boolean {
  const entries = readStringArray(value);
  if (entries.length) {
    return entries.some((entry) => isTruthyFlag(entry));
  }
  return isTruthyFlag(value);
}

function stripNodeText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasTextContent(value: string | null | undefined): boolean {
  if (!value) return false;
  return stripNodeText(value).length > 0;
}

function getChapterType(rawProps: Record<string, unknown> | null): string | null {
  if (!rawProps) return null;
  const rawValue =
    rawProps.settings_chapterType ??
    rawProps.settingsChapterType ??
    rawProps.chapterType ??
    rawProps.chapter_type;
  const values = readStringArray(rawValue);
  return values[0] ?? null;
}

function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.split(/[?#]/)[0]?.toLowerCase() ?? "";
  return trimmed.endsWith(".mp4");
}

export function getNodeVariant(
  chapterType: string | null,
  nodeType: string | null
): NodeVariant {
  if (nodeType === "root") return "start";
  switch (chapterType) {
    case "start-node":
      return "start";
    case "chapter-node":
      return "chapter";
    case "chapter-node-plain":
      return "chapter-plain";
    case "ref-node":
      return "ref";
    case "ref-node-tab":
      return "ref-tab";
    case "random-node":
      return "random";
    case "videoplayer-node":
      return "video";
    case "podplayer-node":
      return "audio";
    default:
      return "default";
  }
}

function hasStatisticsFlag(rawProps: Record<string, unknown> | null): boolean {
  if (!rawProps) return false;
  const directKeys = ["node_statistics", "nodeStatistics", "node_stats", "nodeStats"];
  for (const key of directKeys) {
    if (isFlagEnabled(rawProps[key])) return true;
  }
  for (const [key, value] of Object.entries(rawProps)) {
    if (/statistics/i.test(key) && isFlagEnabled(value)) {
      return true;
    }
  }
  return false;
}

function hasNodeVariableFlag(rawProps: Record<string, unknown> | null): boolean {
  if (!rawProps) return false;
  const directKeys = ["node_conditions", "nodeConditions", "node_condition", "nodeCondition"];
  for (const key of directKeys) {
    const entries = readStringArray(rawProps[key]).map((entry) => entry.toLowerCase());
    if (entries.includes("hide_visited")) return true;
  }
  const legacyKeys = ["node_variable", "nodeVariable"];
  for (const key of legacyKeys) {
    if (isFlagEnabled(rawProps[key])) return true;
  }
  return false;
}

export function buildGraphNodes(
  nodes: AdventureModel["nodes"],
  existingNodes: GraphNode[]
): GraphNode[] {
  const existingById = new Map(existingNodes.map((node) => [node.id, node]));
  const fallbackPositions = buildFallbackPositions(nodes);

  return nodes.map((node) => {
    const existing = existingById.get(String(node.nodeId));
    const hasPosition = node.position.x !== 0 || node.position.y !== 0;
    const position = hasPosition
      ? node.position
      : existing?.position ??
        fallbackPositions.get(node.nodeId) ?? { x: 0, y: 0 };
    const chapterType = getChapterType(node.rawProps);
    const variant = getNodeVariant(chapterType, node.type ?? null);
    const hasStatistics = hasStatisticsFlag(node.rawProps);
    const hasNodeVariable = hasNodeVariableFlag(node.rawProps);
    const hasText = hasTextContent(node.text);
    const hasImage = Boolean(node.image.url || node.image.id);
    const hasAudio = Boolean(node.props?.audioUrl || node.props?.audioUrlAlt);
    const hasVideo =
      isVideoUrl(node.image.url) ||
      Boolean(node.props?.subtitlesUrl) ||
      chapterType === "videoplayer-node";
    const badges: GraphNodeData["badges"] = [];

    if (hasStatistics) {
      badges.push({ key: "stats", label: "STAT", tone: "flag" });
    }
    if (hasText) {
      badges.push({ key: "text", label: "Text", tone: "media" });
    }
    if (hasVideo) {
      badges.push({ key: "video", label: "VID", tone: "media" });
    } else if (hasImage) {
      badges.push({ key: "image", label: "IMG", tone: "media" });
    }
    if (hasAudio) {
      badges.push({ key: "audio", label: "AUD", tone: "media" });
    }

    return {
      id: String(node.nodeId),
      type: "adventure",
      position,
      selectable: true,
      data: {
        label: node.title || `Node ${node.nodeId}`,
        nodeId: node.nodeId,
        chapterType,
        variant,
        statisticsEnabled: hasStatistics,
        nodeVariableEnabled: hasNodeVariable,
        badges,
      },
      selected: existing?.selected ?? false,
    };
  });
}
