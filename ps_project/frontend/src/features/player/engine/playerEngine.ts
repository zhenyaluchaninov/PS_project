import type { AdventureModel, LinkModel, NodeModel } from "@/domain/models";

export type NodeKind =
  | "root"
  | "random"
  | "reference"
  | "reference-tab"
  | "video"
  | "chapter"
  | "default"
  | "unknown";

export type EngineError = {
  title: string;
  description?: string;
};

export type EngineContext = {
  nodes: Record<number, NodeModel>;
  linksBySource: Record<number, LinkModel[]>;
  linksById: Record<number, LinkModel>;
  visited: Set<number>;
};

export type EnterNodeDecision =
  | { type: "show"; nodeId: number; nodeKind: NodeKind }
  | {
      type: "auto";
      nodeId: number;
      nodeKind: NodeKind;
      viaLinkId: number;
      targetNodeId: number;
    }
  | { type: "error"; error: EngineError; nodeId?: number; nodeKind?: NodeKind };

export type ClickDecision =
  | { type: "move"; nodeId: number; linkId: number }
  | { type: "error"; error: EngineError };

const firstString = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (Array.isArray(value)) {
    const found = value.find((item) => typeof item === "string" && item.trim().length > 0);
    return typeof found === "string" ? found : null;
  }
  return null;
};

const normalizeKindKey = (value?: string | null) =>
  (value ?? "").toLowerCase().trim();

const chapterTypeFromProps = (node?: NodeModel | null): string | null => {
  if (!node?.rawProps) return null;
  const props = node.rawProps;
  return (
    firstString(
      (props as Record<string, unknown>)["settings_chapterType"] ??
        (props as Record<string, unknown>)["settings_chaptertype"] ??
        (props as Record<string, unknown>)["chapterType"] ??
        (props as Record<string, unknown>)["chapter_type"]
    ) ?? null
  );
};

export const resolveNodeKind = (node?: NodeModel | null): NodeKind => {
  const chapterType = chapterTypeFromProps(node);
  const typeKey = normalizeKindKey(chapterType ?? node?.type);

  if (typeKey === "root" || typeKey === "start-node") return "root";
  if (typeKey === "random" || typeKey === "random-node") return "random";
  if (typeKey === "ref-node-tab" || typeKey === "reference-tab") return "reference-tab";
  if (typeKey.startsWith("ref-node") || typeKey === "reference") return "reference";
  if (typeKey.includes("video")) return "video";
  if (typeKey.includes("chapter")) return "chapter";
  if (typeKey.length > 0) return "default";
  return "unknown";
};

export const EMPTY_LINKS: LinkModel[] = Object.freeze([]);

export const getOutgoingLinksForNode = (
  nodeId: number | null | undefined,
  linksBySource?: Record<number, LinkModel[]>
): LinkModel[] => {
  if (nodeId == null || !linksBySource) return EMPTY_LINKS;
  return linksBySource[nodeId] ?? EMPTY_LINKS;
};

export const buildGraphIndexes = (adventure: AdventureModel) => {
  const nodeIndex = Object.fromEntries(
    (adventure.nodes ?? []).map((node) => [node.nodeId, node])
  );

  const linksBySource: Record<number, LinkModel[]> = {};
  const linksById: Record<number, LinkModel> = {};
  for (const link of adventure.links ?? []) {
    const sourceId = link.fromNodeId;
    if (!linksBySource[sourceId]) {
      linksBySource[sourceId] = [];
    }
    linksBySource[sourceId].push(link);
    linksById[link.linkId] = link;
    linksById[link.id] = link;
  }

  return { nodeIndex, linksBySource, linksById };
};

const pickRandomLink = ({
  nodeId,
  linksBySource,
  nodes,
  visited,
}: {
  nodeId: number;
  linksBySource: Record<number, LinkModel[]>;
  nodes: Record<number, NodeModel>;
  visited: Set<number>;
}): LinkModel | null => {
  const outgoing = getOutgoingLinksForNode(nodeId, linksBySource);

  const validTargets = outgoing
    .filter((link) => link.toNodeId != null)
    .map((link) => ({ link, target: nodes[link.toNodeId] }))
    .filter((item) => Boolean(item.target)) as Array<{ link: LinkModel; target: NodeModel }>;

  if (validTargets.length === 0) return null;

  const nonSelf = validTargets.filter((item) => item.link.toNodeId !== nodeId);
  if (nonSelf.length === 0) return null;
  const pool = nonSelf;

  const unvisited = pool.filter((item) => !visited.has(item.link.toNodeId));
  const candidates = unvisited.length > 0 ? unvisited : pool;

  const choice = candidates[Math.floor(Math.random() * candidates.length)];
  return choice.link;
};

const cleanUrl = (raw?: string | null): string | null => {
  if (!raw) return null;
  return raw.replace(/["'>),\s]+$/, "");
};

const isAllowedUrl = (url: string | null): url is string => {
  if (!url) return false;
  if (url.startsWith("/")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const extractFirstHttpUrl = (text?: string | null): string | null => {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  return cleanUrl(match?.[0] ?? null);
};

export const decideOnEnterNode = (
  nodeId: number,
  context: EngineContext
): EnterNodeDecision => {
  const node = context.nodes[nodeId];
  const nodeKind = resolveNodeKind(node);

  if (!node) {
    return {
      type: "error",
      error: { title: "Missing node", description: "The requested node does not exist." },
    };
  }

  if (nodeKind !== "random") {
    return { type: "show", nodeId, nodeKind };
  }

  const chosenLink = pickRandomLink({
    nodeId,
    linksBySource: context.linksBySource,
    nodes: context.nodes,
    visited: context.visited,
  });

  if (!chosenLink || chosenLink.toNodeId == null) {
    return {
      type: "error",
      nodeId,
      nodeKind,
      error: {
        title: "Random node error",
        description: "No valid outgoing targets from this random node.",
      },
    };
  }

  return {
    type: "auto",
    nodeId,
    nodeKind,
    viaLinkId: chosenLink.linkId,
    targetNodeId: chosenLink.toNodeId,
  };
};

export const decideOnClick = (
  linkId: number,
  context: EngineContext
): ClickDecision => {
  const link = context.linksById[linkId];
  if (!link) {
    return {
      type: "error",
      error: { title: "Broken link", description: "This choice is missing." },
    };
  }

  if (link.toNodeId == null) {
    return {
      type: "error",
      error: { title: "Broken link", description: "This choice has no destination." },
    };
  }

  const targetNode = context.nodes[link.toNodeId];
  if (!targetNode) {
    return {
      type: "error",
      error: { title: "Broken link", description: "The target node is missing." },
    };
  }

  return {
    type: "move",
    nodeId: targetNode.nodeId,
    linkId: link.linkId,
  };
};

export const resolveReferenceUrl = (node?: NodeModel | null): string | null => {
  const url = extractFirstHttpUrl(node?.text);
  return isAllowedUrl(url) ? url : null;
};

export const resolveVideoSource = (node?: NodeModel | null): string | null => {
  if (!node) return null;
  const imageUrl = cleanUrl(node.image?.url ?? null);
  if (imageUrl && isAllowedUrl(imageUrl) && imageUrl.toLowerCase().includes(".mp4")) {
    return imageUrl;
  }

  const urlInText = extractFirstHttpUrl(node.text);
  if (urlInText && isAllowedUrl(urlInText) && urlInText.toLowerCase().includes(".mp4")) {
    return urlInText;
  }

  return null;
};
