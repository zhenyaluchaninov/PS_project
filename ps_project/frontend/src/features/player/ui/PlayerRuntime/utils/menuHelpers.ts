import { MENU_OPTION_VALUES } from "../constants";
import type { MenuShortcut } from "../types";
import { isPlainRecord } from "./propsParser";

export const readMenuOptions = (props?: Record<string, unknown> | null): string[] => {
  if (!props) return [...MENU_OPTION_VALUES];
  const raw = props.menu_option ?? props.menuOption ?? props.menu_options;
  if (raw === undefined || raw === null) return [...MENU_OPTION_VALUES];

  let values: string[] = [];
  if (Array.isArray(raw)) {
    values = raw.filter((item): item is string => typeof item === "string");
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed === "all") return [...MENU_OPTION_VALUES];
    values = [trimmed];
  }

  return MENU_OPTION_VALUES.filter((value) => values.includes(value));
};

export const readMenuSoundOverride = (
  props?: Record<string, unknown> | null
): boolean => {
  if (!props) return true;
  const raw = props.menu_sound_override ?? props.menuSoundOverride;
  if (raw === undefined || raw === null) return true;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (!normalized) return true;
    return ["1", "true", "yes", "on"].includes(normalized);
  }
  return true;
};

const parseShortcutNodeId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/^#/, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const readMenuShortcuts = (
  props?: Record<string, unknown> | null
): MenuShortcut[] => {
  const raw = props?.menu_shortcuts ?? props?.menuShortcuts;
  const list = Array.isArray(raw) ? raw : [];
  return Array.from({ length: 9 }, (_, index) => {
    const entry = isPlainRecord(list[index]) ? list[index] : {};
    const nodeValue =
      entry.nodeId ?? entry.node_id ?? entry.nodeID ?? entry.nodeid;
    const nodeId = parseShortcutNodeId(nodeValue);
    const text = typeof entry.text === "string" ? entry.text : "";
    return { nodeId, text };
  });
};
