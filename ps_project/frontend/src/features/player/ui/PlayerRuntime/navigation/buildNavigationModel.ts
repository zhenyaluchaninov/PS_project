import type { LinkModel, NodeModel } from "@/domain/models";
import type { buildNavigationConfig } from "@/features/player/utils/navigationUtils";
import {
  isLinkConditioned,
  resolveConditionedStyle,
  resolveLinkConditionBehaviorOverride,
} from "@/features/player/utils/navigationConditions";
import { buildConditionedButtonStyle, resolveNavigationLabel, resolveNavigationTargetId } from "./helpers";
import type { NavItem, NavigationButton, NavigationModel } from "./types";

const applyOrder = <T,>(
  items: T[],
  order: number[] | null | undefined,
  getId: (item: T) => number
) => {
  if (!order || order.length === 0) return items;

  const ordered: T[] = [];
  const used = new Set<number>();

  order.forEach((rawId) => {
    const id = Number(rawId);
    if (!Number.isFinite(id) || used.has(id)) return;
    const found = items.find((item) => getId(item) === id);
    if (found) {
      ordered.push(found);
      used.add(id);
    }
  });

  items.forEach((item) => {
    const id = getId(item);
    if (!used.has(id)) ordered.push(item);
  });

  return ordered;
};

type NavigationConfig = ReturnType<typeof buildNavigationConfig>;

export type BuildNavigationModelArgs = {
  currentNode: NodeModel | null | undefined;
  currentNodeId: number | null | undefined;
  currentNodeProps: Record<string, unknown>;
  navigationLinks: LinkModel[];
  navigationConfig: NavigationConfig;
  getNodeById: (nodeId: number | null | undefined) => NodeModel | null | undefined;
  visitedNodes: Set<number>;
};

export const buildNavigationModel = ({
  currentNode,
  currentNodeId,
  currentNodeProps,
  navigationLinks,
  navigationConfig,
  getNodeById,
  visitedNodes,
}: BuildNavigationModelArgs): NavigationModel => {
  const conditionedConfig = resolveConditionedStyle(currentNodeProps);
  const conditionedStyle = buildConditionedButtonStyle(conditionedConfig);
  const conditionedDimStyle =
    conditionedConfig.mode === "dim"
      ? conditionedStyle
      : buildConditionedButtonStyle(
          resolveConditionedStyle(currentNodeProps, { modeOverride: "dim" })
        );
  // Preserve API ordering for deterministic fallback when no custom order is defined.
  const baseItems: NavItem[] = navigationLinks.map((link) => ({ kind: "link", link }));
  if (navigationConfig.showCurrent && currentNode) {
    baseItems.push({ kind: "current" });
  }

  const resolveTargetId = (link: LinkModel) =>
    resolveNavigationTargetId(link, currentNodeId);

  const orderedItems = applyOrder(
    baseItems,
    navigationConfig.orderedIds,
    (item) => (item.kind === "current" ? -1 : item.link.linkId)
  );

  const linkInfoCache = new Map<
    number,
    {
      targetNodeId: number | null;
      targetNode?: NodeModel;
      conditioned: boolean;
      overrideMode: "hide" | "dim" | null;
    }
  >();

  const getLinkInfo = (link: LinkModel) => {
    const cached = linkInfoCache.get(link.linkId);
    if (cached) return cached;
    const targetNodeId = resolveTargetId(link);
    const targetNode = getNodeById(targetNodeId ?? null);
    const conditioned = isLinkConditioned({
      linkProps: link.props,
      targetNode,
      visitedNodes,
    });
    const overrideMode = resolveLinkConditionBehaviorOverride(link.props);
    const info = { targetNodeId, targetNode, conditioned, overrideMode };
    linkInfoCache.set(link.linkId, info);
    return info;
  };

  const resolveConditionedMode = (
    info: ReturnType<typeof getLinkInfo>
  ): "hide" | "dim" | null => {
    if (!info.conditioned) return null;
    return info.overrideMode ?? conditionedConfig.mode;
  };

  const shouldHideLink = (link: LinkModel) => {
    const info = getLinkInfo(link);
    if (
      navigationConfig.hideVisited &&
      info.targetNodeId != null &&
      visitedNodes.has(info.targetNodeId)
    ) {
      return true;
    }
    const conditionedMode = resolveConditionedMode(info);
    return conditionedMode === "hide";
  };

  const firstUsableLink = orderedItems.find((item) => {
    if (item.kind !== "link") return false;
    if (shouldHideLink(item.link)) return false;
    const info = getLinkInfo(item.link);
    return info.targetNodeId != null && Boolean(info.targetNode);
  });

  if (navigationConfig.style === "noButtons") {
    return {
      buttons: [],
      primaryLinkId:
        firstUsableLink && firstUsableLink.kind === "link"
          ? firstUsableLink.link.linkId
          : undefined,
    };
  }

  const buildButton = (link: LinkModel, fallbackIndex: number): NavigationButton => {
    const info = getLinkInfo(link);
    const label =
      resolveNavigationLabel(link, currentNodeId) ??
      (info.targetNode?.title || `Continue ${fallbackIndex}`);
    const isBroken = info.targetNodeId == null || !info.targetNode;
    const conditionedMode = resolveConditionedMode(info);

    return {
      key: String(link.linkId),
      label,
      linkId: link.linkId,
      targetNodeId: info.targetNodeId ?? undefined,
      disabled: isBroken,
      isBroken,
      isConditioned: info.conditioned,
      conditionedMode: conditionedMode ?? undefined,
      style:
        info.conditioned && conditionedMode === "dim"
          ? conditionedDimStyle
          : undefined,
    };
  };

  let skip = navigationConfig.skipCount;
  const buttons: NavigationButton[] = [];

  orderedItems.forEach((item) => {
    if (skip > 0) {
      skip -= 1;
      return;
    }

    if (item.kind === "current") {
      buttons.push({
        key: "current",
        label: currentNode?.title || "Current node",
        isCurrent: true,
      });
      return;
    }

    const link = item.link;
    if (shouldHideLink(link)) return;
    buttons.push(buildButton(link, buttons.length + 1));
  });

  const visibleButtons = buttons.filter(
    (button) => button.conditionedMode !== "hide"
  );

  return {
    buttons: visibleButtons,
    primaryLinkId:
      firstUsableLink && firstUsableLink.kind === "link"
        ? firstUsableLink.link.linkId
        : undefined,
  };
};
