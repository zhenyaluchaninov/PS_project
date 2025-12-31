import type { NodeModel } from "@/domain/models";
import type { PropsInput } from "@/features/ui-core/props";

export type ConditionedStyle = {
  mode: "hide" | "dim";
  opacity?: number;
  backgroundColor?: string;
};

type LinkConditionInput = {
  linkProps?: PropsInput;
  targetNode?: NodeModel | null;
  visitedNodes: Set<number>;
};

const DEFAULT_CONDITION_ALPHA = 40;

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parsePropsInput = (input?: PropsInput): Record<string, unknown> => {
  if (!input) return {};
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return isPlainRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return isPlainRecord(input) ? input : {};
};

const readRawProp = (
  raw: Record<string, unknown> | null | undefined,
  keys: string[]
) => {
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

const pickFirstString = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const found = value.find(
      (item) => typeof item === "string" && String(item).trim()
    );
    if (typeof found === "string" && found.trim()) return found.trim();
  }
  return null;
};

const parseNodeId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/^#/, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseNodeIdList = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value
      .map(parseNodeId)
      .filter((nodeId): nodeId is number => nodeId !== null);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseNodeIdList(parsed);
      } catch {
        return [];
      }
    }
    return trimmed
      .split(/[,\s]+/)
      .map(parseNodeId)
      .filter((nodeId): nodeId is number => nodeId !== null);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? [value] : [];
  }
  return [];
};

const readNodeIdList = (
  props: Record<string, unknown>,
  keys: string[]
): number[] => parseNodeIdList(readRawProp(props, keys));

const readNodeConditionTokens = (
  props: Record<string, unknown>
): string[] =>
  tokenize(
    readRawProp(props, [
      "node_conditions",
      "nodeConditions",
      "node-conditions",
    ])
  ).map((token) => token.toLowerCase());

const parseAlphaPercent = (
  value: unknown,
  fallback: number
): number => {
  if (value === undefined || value === null) return fallback;
  const primary = Array.isArray(value) ? value[0] : value;
  const numeric =
    typeof primary === "number"
      ? primary
      : typeof primary === "string"
        ? parseFloat(primary)
        : Number.NaN;
  if (!Number.isFinite(numeric)) return fallback;
  const hasDecimal =
    typeof primary === "string" ? primary.includes(".") : !Number.isInteger(numeric);
  if (numeric >= 0 && numeric <= 1 && hasDecimal) {
    return Math.min(Math.max(numeric * 100, 0), 100);
  }
  return Math.min(Math.max(numeric, 0), 100);
};

export const isLinkConditioned = ({
  linkProps,
  targetNode,
  visitedNodes,
}: LinkConditionInput): boolean => {
  const props = parsePropsInput(linkProps);
  const positiveNodeList = readNodeIdList(props, [
    "positiveNodeList",
    "positive_node_list",
    "positiveNodes",
    "positive_nodes",
  ]);
  const negativeNodeList = readNodeIdList(props, [
    "negativeNodeList",
    "negative_node_list",
    "negativeNodes",
    "negative_nodes",
  ]);

  if (
    positiveNodeList.length > 0 &&
    positiveNodeList.some((nodeId) => !visitedNodes.has(nodeId))
  ) {
    return true;
  }
  if (
    negativeNodeList.length > 0 &&
    negativeNodeList.every((nodeId) => visitedNodes.has(nodeId))
  ) {
    return true;
  }

  if (!targetNode) return false;
  if (!visitedNodes.has(targetNode.nodeId)) return false;

  const targetProps = {
    ...parsePropsInput(targetNode.rawProps ?? undefined),
    ...parsePropsInput(targetNode.props ?? undefined),
  };
  return readNodeConditionTokens(targetProps).includes("hide_visited");
};

export const resolveConditionedStyle = (
  input?: PropsInput,
  options?: { defaultOpacity?: number; modeOverride?: ConditionedStyle["mode"] }
): ConditionedStyle => {
  const props = parsePropsInput(input);
  const typeToken =
    tokenize(
      readRawProp(props, [
        "type_nodeconditions",
        "typeNodeconditions",
        "type-nodeconditions",
      ])
    )[0]?.toLowerCase() ?? "";
  const defaultMode = typeToken.includes("hide") ? "hide" : "dim";
  const mode = options?.modeOverride ?? defaultMode;
  const shouldApplyOpacity =
    typeToken.includes("trans") ||
    typeToken === "" ||
    options?.modeOverride === "dim";
  const alphaValue = parseAlphaPercent(
    readRawProp(props, [
      "alpha_nodeconditions",
      "alphaNodeconditions",
      "alpha-nodeconditions",
    ]),
    options?.defaultOpacity ?? DEFAULT_CONDITION_ALPHA
  );
  const backgroundColor = pickFirstString(
    readRawProp(props, [
      "color_nodeconditions",
      "colorNodeconditions",
      "color-nodeconditions",
    ])
  );

  return {
    mode,
    opacity: shouldApplyOpacity ? alphaValue / 100 : undefined,
    backgroundColor: backgroundColor ?? undefined,
  };
};

export const resolveLinkConditionBehaviorOverride = (
  input?: PropsInput
): ConditionedStyle["mode"] | null => {
  const props = parsePropsInput(input);
  const raw = readRawProp(props, [
    "conditionBehavior",
    "condition_behavior",
    "condition-behavior",
  ]);
  const token = pickFirstString(raw)?.toLowerCase() ?? "";
  if (token === "hide") return "hide";
  if (token === "dim" || token === "transparency") return "dim";
  return null;
};
