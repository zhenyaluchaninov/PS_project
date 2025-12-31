import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  BarChart3,
  BookOpen,
  Bookmark,
  EyeOff,
  Eye,
  ExternalLink,
  FileText,
  Film,
  Headphones,
  Image as ImageIcon,
  Link as LinkIcon,
  Music,
  PlayCircle,
  Shuffle,
  Type,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/features/ui-core/primitives/dropdown-menu";
import { chapterTypeOptions } from "@/features/editor/panel/constants";
import { selectEditorReadOnly, useEditorStore } from "@/features/editor/state/editorStore";
import { cn } from "@/lib/utils";
import type { GraphNode, NodeVariant } from "../types";
import { getNodeVariant } from "../utils/buildGraphNodes";

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
  text: Type,
  stats: BarChart3,
};

export function AdventureNode({ data, selected }: NodeProps<GraphNode>) {
  const readOnly = useEditorStore(selectEditorReadOnly);
  const multiSelectActive = useEditorStore((state) => state.selectedNodeIds.length > 1);
  const setNodePropPath = useEditorStore((state) => state.setNodePropPath);
  const setNodePropStringArraySelect = useEditorStore(
    (state) => state.setNodePropStringArraySelect
  );
  const chapterTypeValue = data.chapterType ?? "";
  const currentChapterType =
    chapterTypeOptions.find((option) => option.value === chapterTypeValue) ??
    chapterTypeOptions[0];
  const statisticsEnabled = Boolean(data.statisticsEnabled);
  const nodeVariableEnabled = Boolean(data.nodeVariableEnabled);
  const controlsDisabled = readOnly || multiSelectActive;
  const disabledReason = multiSelectActive
    ? "Disabled in multi-select."
    : readOnly
      ? "Read-only."
      : undefined;
  const mediaBadges = data.badges.filter((badge) => badge.tone === "media");
  const isStart = data.variant === "start";
  const NodeTypeIcon = nodeTypeIcons[data.variant] ?? FileText;
  const playState = data.playState ?? null;
  const isPlayCurrent = playState === "current";
  const isPlayVisited = playState === "visited";
  const iconButtonClass = (active: boolean) =>
    cn(
      "nodrag flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] transition",
      active ? "text-[var(--warning)]" : "text-[var(--muted)]",
      "hover:border-[var(--border-light)] hover:bg-[var(--bg-hover)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]",
      "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[var(--bg-secondary)]"
    );

  const handleChapterTypeChange = (nextValue: string) => {
    if (controlsDisabled) return;
    setNodePropStringArraySelect(data.nodeId, "settings_chapterType", nextValue);
  };

  const handleStatisticsToggle = () => {
    if (controlsDisabled) return;
    const next = !statisticsEnabled;
    setNodePropPath(data.nodeId, "node_statistics", [next ? "on" : ""]);
  };

  const handleNodeVariableToggle = () => {
    if (controlsDisabled) return;
    const next = !nodeVariableEnabled;
    setNodePropPath(data.nodeId, "node_conditions", [next ? "hide_visited" : ""]);
  };

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
        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            disabled={controlsDisabled}
            title={disabledReason ?? `Node type: ${currentChapterType.label}`}
            aria-label={`Change node type (${currentChapterType.label})`}
            onPointerDown={(event) => event.stopPropagation()}
            className={cn(
              "nodrag flex h-7 w-7 items-center justify-center rounded-md border transition",
              isStart
                ? "border-[var(--editor-node-start-border)] bg-[var(--editor-node-start-bg)] text-[var(--success)]"
                : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--warning)]",
              "hover:border-[var(--border-light)] hover:bg-[var(--bg-hover)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]",
              "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[var(--bg-secondary)]"
            )}
          >
            <NodeTypeIcon className="h-4 w-4" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="min-w-[180px] bg-[var(--surface)]"
          >
            <DropdownMenuRadioGroup
              value={chapterTypeValue}
              onValueChange={handleChapterTypeChange}
            >
              {chapterTypeOptions.map((option) => {
                const OptionIcon =
                  nodeTypeIcons[getNodeVariant(option.value || null, null)] ??
                  FileText;
                const isSelected = option.value === chapterTypeValue;
                return (
                  <DropdownMenuRadioItem
                    key={option.value || "default"}
                    value={option.value}
                    className="pl-8"
                  >
                    <OptionIcon
                      className={cn(
                        "h-4 w-4",
                        isSelected ? "text-[var(--warning)]" : "text-[var(--muted)]"
                      )}
                      aria-hidden="true"
                    />
                    <span>{option.label}</span>
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Statistics tracking"
            aria-pressed={statisticsEnabled}
            title={disabledReason ?? "Statistics tracking"}
            disabled={controlsDisabled}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              handleStatisticsToggle();
            }}
            className={iconButtonClass(statisticsEnabled)}
          >
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Hide when visited"
            aria-pressed={nodeVariableEnabled}
            title={
              disabledReason ??
              (nodeVariableEnabled
                ? "Hidden when visited (click to disable)"
                : "Hide when visited (click to enable)")
            }
            disabled={controlsDisabled}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              handleNodeVariableToggle();
            }}
            className={iconButtonClass(nodeVariableEnabled)}
          >
            {nodeVariableEnabled ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
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
