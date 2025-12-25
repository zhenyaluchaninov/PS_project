import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  BarChart3,
  BookOpen,
  Bookmark,
  ExternalLink,
  FileText,
  FunctionSquare,
  Film,
  Headphones,
  Image as ImageIcon,
  Link as LinkIcon,
  Music,
  PlayCircle,
  Shuffle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GraphNode, NodeVariant } from "../types";

const nodeTypeIcons: Record<NodeVariant, LucideIcon> = {
  start: PlayCircle,
  chapter: BookOpen,
  "chapter-plain": Bookmark,
  ref: LinkIcon,
  "ref-tab": ExternalLink,
  random: Shuffle,
  video: Film,
  audio: Headphones,
  default: FileText,
};

const badgeIcons: Record<string, LucideIcon> = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  stats: BarChart3,
  "node-variable": FunctionSquare,
};

export function AdventureNode({ data, selected }: NodeProps<GraphNode>) {
  const flagBadges = data.badges
    .filter((badge) => badge.tone === "flag")
    .sort((a, b) => {
      if (a.key === b.key) return 0;
      if (a.key === "stats") return 1;
      if (b.key === "stats") return -1;
      return a.key.localeCompare(b.key);
    });
  const mediaBadges = data.badges.filter((badge) => badge.tone === "media");
  const isStart = data.variant === "start";
  const NodeTypeIcon = nodeTypeIcons[data.variant] ?? FileText;
  const playState = data.playState ?? null;
  const isPlayCurrent = playState === "current";
  const isPlayVisited = playState === "visited";

  return (
    <div
      className={cn(
        "relative min-w-[160px] max-w-[240px] w-fit rounded-lg border transition-all duration-150",
        isStart
          ? "border-[var(--editor-node-start-border)] shadow-[0_0_20px_-16px_var(--editor-node-start-border)]"
          : "border-[var(--editor-node-border)]",
        isPlayCurrent
          ? "ring-2 ring-[var(--editor-play-node-current)]"
          : isPlayVisited
            ? "ring-1 ring-[var(--editor-play-node)]"
            : "",
        selected
          ? "border-[var(--editor-edge-selected)] shadow-[0_0_0_2.2px_var(--editor-edge-selected)]"
          : isStart
            ? "hover:border-[var(--success)]"
            : "hover:border-[var(--border-light)]"
      )}
    >
      <div
        className={cn(
          "flex items-center rounded-t-lg border-b px-3 py-1.5",
          isStart
            ? "border-[var(--editor-node-start-border)] bg-[var(--editor-node-start-header-bg)]"
            : "border-[var(--editor-node-border)] bg-[var(--bg-tertiary)]"
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md border",
            isStart
              ? "border-[var(--editor-node-start-border)] bg-[var(--editor-node-start-bg)] text-[var(--success)]"
              : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--warning)]"
          )}
        >
          <NodeTypeIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        {flagBadges.length > 0 ? (
          <div className="ml-auto flex items-center gap-1">
            {flagBadges.map((badge) => {
              const BadgeIcon = badgeIcons[badge.key] ?? FileText;
              return (
                <span
                  key={badge.key}
                  title={badge.label}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--muted)]"
                >
                  <BadgeIcon className="h-4 w-4" aria-hidden="true" />
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "flex min-h-[64px] items-center justify-center px-4 py-3 w-full",
          isStart ? "bg-[var(--editor-node-start-bg)]" : "bg-[var(--editor-node-bg)]"
        )}
      >
        <div className="w-full break-words whitespace-normal text-center text-[15px] font-semibold leading-snug text-[var(--text)]">
          {data.label}
        </div>
      </div>

      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-b-lg border-t px-3 py-1.5",
          isStart
            ? "border-[var(--editor-node-start-border)] bg-[var(--editor-node-start-bg)]"
            : "border-[var(--border)] bg-[var(--editor-node-bg)]"
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {mediaBadges.map((badge) => {
            const BadgeIcon = badgeIcons[badge.key] ?? FileText;
            return (
              <span key={badge.key} title={badge.label}>
                <BadgeIcon
                  className={cn("h-4 w-4 text-[var(--accent)]")}
                  aria-hidden="true"
                />
              </span>
            );
          })}
        </div>
        <div className="shrink-0 font-mono text-xs text-[var(--muted)]">#{data.nodeId}</div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-2 !border-[var(--border)] !bg-[var(--bg-tertiary)]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-2 !border-[var(--border)] !bg-[var(--bg-tertiary)]"
      />
    </div>
  );
}
