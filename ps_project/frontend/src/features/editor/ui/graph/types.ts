import type { Edge, Node } from "@xyflow/react";

export type NodeVariant =
  | "start"
  | "chapter"
  | "chapter-plain"
  | "ref"
  | "ref-tab"
  | "random"
  | "video"
  | "audio"
  | "default";

export type PlayTraceState = "visited" | "current" | null;

export type GraphNodeData = {
  label: string;
  nodeId: number;
  chapterType: string | null;
  variant: NodeVariant;
  statisticsEnabled: boolean;
  nodeVariableEnabled: boolean;
  badges: Array<{ key: string; label: string; tone: "flag" | "media" }>;
  playState?: PlayTraceState;
};

export type GraphEdgeData = {
  linkId: number;
  isBidirectional: boolean;
  hasConditions: boolean;
  playState?: PlayTraceState;
};

export type GraphNode = Node<GraphNodeData>;
export type GraphEdge = Edge<GraphEdgeData>;
