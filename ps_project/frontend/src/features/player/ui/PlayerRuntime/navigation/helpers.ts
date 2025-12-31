import type { LinkModel } from "@/domain/models";
import type { CSSProperties } from "react";
import type { resolveConditionedStyle } from "@/features/player/utils/navigationConditions";
import { EMPTY_LINKS } from "../constants";

const isBidirectionalLink = (link: LinkModel) =>
  String(link.type ?? "").toLowerCase().includes("bidirectional");

export const getNavigationLinksForNode = (
  nodeId: number | null | undefined,
  links: LinkModel[] | null | undefined
): LinkModel[] => {
  if (nodeId == null || !links || links.length === 0) return EMPTY_LINKS;
  return links.filter((link) => {
    if (link.fromNodeId === nodeId) return true;
    return isBidirectionalLink(link) && link.toNodeId === nodeId;
  });
};

export const resolveNavigationTargetId = (
  link: LinkModel,
  currentNodeId: number | null | undefined
): number | null => {
  if (currentNodeId == null) return link.toNodeId ?? null;
  if (isBidirectionalLink(link) && link.toNodeId === currentNodeId) {
    return link.fromNodeId ?? null;
  }
  return link.toNodeId ?? null;
};

export const resolveNavigationLabel = (
  link: LinkModel,
  currentNodeId: number | null | undefined
): string | null => {
  if (currentNodeId != null && isBidirectionalLink(link) && link.toNodeId === currentNodeId) {
    const label = link.sourceTitle?.trim();
    return label ? label : null;
  }
  const label = link.label?.trim();
  return label ? label : null;
};

export const buildConditionedButtonStyle = (
  config: ReturnType<typeof resolveConditionedStyle>
): CSSProperties | undefined => {
  if (config.mode !== "dim") return undefined;
  const style: CSSProperties = {};
  if (config.opacity !== undefined) {
    style.opacity = config.opacity;
  }
  if (config.backgroundColor) {
    style.backgroundColor = config.backgroundColor;
  }
  return Object.keys(style).length > 0 ? style : undefined;
};
