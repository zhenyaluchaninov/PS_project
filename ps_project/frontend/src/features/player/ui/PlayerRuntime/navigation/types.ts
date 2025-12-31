import type { LinkModel } from "@/domain/models";
import type { CSSProperties } from "react";

export type NavItem = { kind: "link"; link: LinkModel } | { kind: "current" };

export type NavigationButton = {
  key: string;
  label: string;
  linkId?: number;
  targetNodeId?: number;
  disabled?: boolean;
  isBroken?: boolean;
  isCurrent?: boolean;
  isConditioned?: boolean;
  conditionedMode?: "hide" | "dim";
  style?: CSSProperties;
};

export type NavigationModel = {
  buttons: NavigationButton[];
  primaryLinkId?: number;
};
