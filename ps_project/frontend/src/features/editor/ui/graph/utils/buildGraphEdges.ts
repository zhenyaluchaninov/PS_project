import type { AdventureModel } from "@/domain/models";
import type { GraphEdge } from "../types";

function hasConditionList(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "[]") return false;
    if (/^\d+$/.test(trimmed)) {
      return Number(trimmed) > 0;
    }
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) && parsed.length > 0;
      } catch {
        return true;
      }
    }
    return true;
  }
  if (typeof value === "number") return value > 0;
  return false;
}

function hasEdgeConditions(props: Record<string, unknown> | null): boolean {
  if (!props) return false;
  const positive =
    props.positiveNodeList ??
    props.positive_node_list ??
    props.positiveNodes ??
    props.positive_nodes;
  const negative =
    props.negativeNodeList ??
    props.negative_node_list ??
    props.negativeNodes ??
    props.negative_nodes;
  return hasConditionList(positive) || hasConditionList(negative);
}

export function buildGraphEdges(
  links: AdventureModel["links"],
  nodes: AdventureModel["nodes"],
  existingEdges: GraphEdge[],
  selectable: boolean
): GraphEdge[] {
  const existingById = new Map(existingEdges.map((edge) => [edge.id, edge]));
  const nodeIds = new Set(nodes.map((node) => String(node.nodeId)));

  return links
    .filter(
      (link) => nodeIds.has(String(link.source)) && nodeIds.has(String(link.target))
    )
    .map((link) => {
      const existing = existingById.get(String(link.linkId));
      const normalizedType = String(link.type ?? "").toLowerCase();
      const isBidirectional = normalizedType.includes("bidirectional");
      const hasConditions = hasEdgeConditions(link.props);
      return {
        id: String(link.linkId),
        source: String(link.source),
        target: String(link.target),
        type: "adventure",
        selectable,
        data: { linkId: link.linkId, isBidirectional, hasConditions },
        selected: selectable ? (existing?.selected ?? false) : false,
      };
    });
}
