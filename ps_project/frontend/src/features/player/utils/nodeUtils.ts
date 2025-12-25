import type { NodeModel } from "@/domain/models";
import {
  resolveNodeKind as resolveNodeKindBase,
  type NodeKind,
} from "../engine/playerEngine";

/**
 * Builds a lookup map of node id to node for fast navigation access.
 */
export const buildNodeById = (nodes: NodeModel[]): Map<number, NodeModel> => {
  const map = new Map<number, NodeModel>();
  nodes.forEach((item) => {
    map.set(item.nodeId, item);
  });
  return map;
};

/**
 * Resolves the navigation-relevant kind for a node.
 */
export const resolveNodeKind = (node?: NodeModel | null): NodeKind =>
  resolveNodeKindBase(node);

export type { NodeKind };
