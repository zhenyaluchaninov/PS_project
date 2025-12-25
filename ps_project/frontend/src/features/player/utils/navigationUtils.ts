import type { LinkModel } from "@/domain/models";
import { getOutgoingLinksForNode as getOutgoingLinksForNodeBase } from "../engine/playerEngine";

export type NavStyle =
  | "default"
  | "right"
  | "leftright"
  | "noButtons"
  | "swipe"
  | "swipeWithButton"
  | "scrollytell";

export type NavPlacement = "inline" | "bottom";

export type NavigationConfig = {
  style: NavStyle;
  placement: NavPlacement;
  showCurrent: boolean;
  orderedIds: number[];
  skipCount: number;
  hideVisited: boolean;
  swipeMode: boolean;
};

export type NavigationOverrides = {
  styleOverride?: NavStyle | null;
  bottomOverride?: boolean;
  showCurrentOverride?: boolean;
  hideVisitedOverride?: boolean;
};

const tokenize = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (value === undefined || value === null) return [];
  const str = String(value).trim();
  return str ? [str] : [];
};

const readRawProp = (raw: Record<string, unknown> | null | undefined, keys: string[]) => {
  if (!raw) return undefined;
  for (const key of keys) {
    const variants = [key, key.replace(/\./g, "_"), key.replace(/\./g, "-")];
    for (const variant of variants) {
      if (variant in raw) {
        return raw[variant];
      }
    }
  }
  return undefined;
};

const parseOrderedLinkIds = (value: unknown): number[] => {
  const tokens = tokenize(value);
  return tokens
    .map((token) => Number(token))
    .filter((num) => Number.isFinite(num))
    .map((num) => Number(num));
};

/**
 * Normalizes a raw navigation style value to a supported navigation style key.
 */
export const normalizeNavStyle = (raw?: string | null | unknown): NavStyle | null => {
  if (raw === null || raw === undefined) return null;
  let asString: string | null = null;
  if (typeof raw === "string") {
    asString = raw;
  } else if (Array.isArray(raw)) {
    const first = raw.find((item) => typeof item === "string") as string | undefined;
    asString = first ?? null;
  } else {
    asString = String(raw);
  }
  const key = asString?.toLowerCase().trim() ?? "";
  if (!key) return null;
  if (key === "right") return "right";
  if (key === "leftright" || key === "left-right" || key === "left_right") return "leftright";
  if (key === "nobuttons" || key === "no-buttons" || key === "no") return "noButtons";
  if (key === "swipewithbutton" || key === "swipe-with-button") return "swipeWithButton";
  if (key === "swipe") return "swipe";
  if (
    key === "scrollytell" ||
    key === "scrolly" ||
    key === "scroll-tell" ||
    key === "scrolly-tell" ||
    key === "scrollytelling"
  ) {
    return "scrollytell";
  }
  return "default";
};

/**
 * Groups links by their source node id for fast outgoing-link lookup.
 */
export const buildLinksBySource = (links: LinkModel[]): Record<number, LinkModel[]> => {
  const map: Record<number, LinkModel[]> = {};
  links.forEach((link) => {
    const sourceId = link.fromNodeId;
    if (!map[sourceId]) {
      map[sourceId] = [];
    }
    map[sourceId].push(link);
  });
  return map;
};

/**
 * Returns the outgoing links for a node, falling back to an empty list.
 */
export const getOutgoingLinksForNode = (
  nodeId: number | null | undefined,
  linksBySource?: Record<number, LinkModel[]>
): LinkModel[] => getOutgoingLinksForNodeBase(nodeId, linksBySource);

/**
 * Builds the navigation configuration for a node from raw props and optional overrides.
 */
export const buildNavigationConfig = (
  rawProps: Record<string, unknown> | null | undefined,
  overrides: NavigationOverrides = {}
): NavigationConfig => {
  const navSettingsTokens = tokenize(
    readRawProp(rawProps, [
      "playerNavigation.settings",
      "playerNavigation_settings",
      "playerNavigationSettings",
    ])
  ).map((token) => token.toLowerCase());

  const styleFromProps = normalizeNavStyle(
    readRawProp(rawProps, [
      "background.navigation_style",
      "navigation_style",
      "backgroundNavigationStyle",
    ])
  );

  const style: NavStyle = overrides.styleOverride ?? styleFromProps ?? "default";
  const placement: NavPlacement =
    overrides.bottomOverride || navSettingsTokens.includes("bottom-navigation")
      ? "bottom"
      : "inline";
  const showCurrent =
    overrides.showCurrentOverride ?? navSettingsTokens.includes("show-current-node");
  const hideVisited =
    (overrides.hideVisitedOverride ?? false) ||
    navSettingsTokens.includes("hide-visited");
  const orderedIds = parseOrderedLinkIds(
    readRawProp(rawProps, ["ordered_link_ids", "button_order", "button-order"])
  );
  const skipCount =
    style === "default" || style === "swipeWithButton" || style === "scrollytell" ? 0 : 1;
  const swipeMode = style === "swipe" || style === "swipeWithButton";

  return {
    style,
    placement,
    showCurrent,
    orderedIds,
    skipCount,
    hideVisited,
    swipeMode,
  };
};
