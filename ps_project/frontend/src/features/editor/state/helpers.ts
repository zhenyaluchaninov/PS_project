import type { AdventureModel } from "@/domain/models";

export function getNextNodeId(adventure: AdventureModel): number {
  return adventure.nodes.reduce((maxId, node) => Math.max(maxId, node.nodeId), -1) + 1;
}

export function getNextLinkId(adventure: AdventureModel): number {
  return adventure.links.reduce((maxId, link) => Math.max(maxId, link.linkId), -1) + 1;
}

export function cloneRawProps(
  value: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!value) return null;
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}
