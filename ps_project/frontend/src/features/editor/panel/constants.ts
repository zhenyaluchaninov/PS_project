import type { EditorNodeInspectorTab } from "../state/types";

export const chapterTypeOptions = [
  { value: "", label: "Default" },
  { value: "start-node", label: "Start" },
  { value: "chapter-node", label: "Chapter" },
  { value: "chapter-node-plain", label: "Chapter (plain)" },
  { value: "videoplayer-node", label: "Video player" },
  { value: "random-node", label: "Random" },
  { value: "ref-node", label: "Reference" },
  { value: "ref-node-tab", label: "Reference (new tab)" },
  { value: "podplayer-node", label: "Audio player" },
];

export const tabOptions: Array<{ value: EditorNodeInspectorTab; label: string }> = [
  { value: "content", label: "Content" },
  { value: "style", label: "Style" },
  { value: "buttons", label: "Buttons" },
  { value: "logic", label: "Logic" },
];

export const BULK_NODE_TITLE_PATH = "node.title";
export const BULK_NODE_TEXT_PATH = "node.text";
export const BULK_NODE_TYPE_PATH = "settings_chapterType";

export const emojiOptions = [
  "\u{1F600}",
  "\u{1F601}",
  "\u{1F602}",
  "\u{1F923}",
  "\u{1F60A}",
  "\u{1F60D}",
  "\u{1F60E}",
  "\u{1F914}",
  "\u{1F44D}",
  "\u{1F44F}",
  "\u{1F525}",
  "\u2728",
  "\u{1F389}",
  "\u2705",
  "\u2764\uFE0F",
  "\u{1F9E9}",
  "\u{1F5FA}\uFE0F",
  "\u26A1",
  "\u{1F4CC}",
  "\u{1F517}",
];
