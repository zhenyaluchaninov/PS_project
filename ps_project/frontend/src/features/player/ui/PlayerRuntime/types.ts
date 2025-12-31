import type { ReadonlyURLSearchParams } from "next/navigation";
import type { PlayerStoreHook } from "../../state/playerStore";

export type SubtitleStatus = {
  state: "idle" | "loading" | "ok" | "error";
  attempted: string[];
};

export type StatsDebugState = {
  lastAttempt: { nodeId: number; adventureSlug: string } | null;
  sent: number;
  deduped: number;
  skippedDisabled: number;
  errors: number;
};

export type PlayerPreferences = {
  highContrast?: boolean;
  hideBackground?: boolean;
  soundEnabled: boolean;
  statisticsEnabled?: boolean;
};

export type SearchParamLike =
  | ReadonlyURLSearchParams
  | URLSearchParams
  | null
  | undefined;

export type MenuShortcut = {
  nodeId: number | null;
  text: string;
};

export type MenuShortcutItem = {
  nodeId: number;
  label: string;
};

export type PlayerRuntimeProps = {
  startNodeIdOverride?: number | null;
  playerStore?: PlayerStoreHook;
  embedded?: boolean;
  viewportScope?: "document" | "target";
};
