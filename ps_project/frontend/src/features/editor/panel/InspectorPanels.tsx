"use client";

import { useState, type ReactNode } from "react";
import type { AdventureModel, LinkModel, NodeModel } from "@/domain/models";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/features/ui-core/primitives/tabs";
import { LabelValue } from "@/ui-core/LabelValue";
import { cn } from "@/lib/utils";
import type { EditorNodeInspectorTab } from "../state/editorStore";
import { ChevronDown, Clock } from "lucide-react";

const chapterTypeOptions = [
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

const tabOptions: Array<{ value: EditorNodeInspectorTab; label: string }> = [
  { value: "content", label: "Content" },
  { value: "style", label: "Style" },
  { value: "buttons", label: "Buttons" },
  { value: "logic", label: "Logic" },
];

const placeholderText = {
  style: "Style controls coming in the next update.",
  buttons: "Button controls coming in the next update.",
  logic: "Logic tools coming in the next update.",
};

const readStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((entry): entry is string => typeof entry === "string");
        }
      } catch {
        return [trimmed];
      }
    }
    return [trimmed];
  }
  return [];
};

const getNodeChapterType = (node: NodeModel): string => {
  const primaryProps = (node.props as Record<string, unknown> | null) ?? {};
  const fallbackProps = node.rawProps ?? {};
  const rawValue =
    primaryProps.settings_chapterType ??
    primaryProps.settingsChapterType ??
    primaryProps.chapterType ??
    primaryProps.chapter_type ??
    fallbackProps.settings_chapterType ??
    fallbackProps.settingsChapterType ??
    fallbackProps.chapterType ??
    fallbackProps.chapter_type;
  const values = readStringArray(rawValue);
  return values[0] ?? "";
};

type InspectorShellProps = {
  title: string;
  subtitle?: ReactNode | null;
  meta?: string | null;
  children: ReactNode;
};

function InspectorShell({ title, subtitle, meta, children }: InspectorShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-[var(--border)] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold text-[var(--text)]">
              {title}
            </p>
            {subtitle ? (
              <div className="text-xs text-[var(--muted)]">{subtitle}</div>
            ) : null}
          </div>
          {meta ? (
            <span className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[10px] font-mono text-[var(--muted)]">
              {meta}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex-1 space-y-4 px-4 py-4 text-sm text-[var(--text)]">
        {children}
      </div>
    </div>
  );
}

type NodeInspectorPanelProps = {
  node: NodeModel;
  activeTab: EditorNodeInspectorTab;
  onTabChange: (tab: EditorNodeInspectorTab) => void;
  onTitleChange: (title: string) => void;
  onNodeTypeChange: (chapterType: string) => void;
};

export function NodeInspectorPanel({
  node,
  activeTab,
  onTabChange,
  onTitleChange,
  onNodeTypeChange,
}: NodeInspectorPanelProps) {
  const chapterType = getNodeChapterType(node);

  return (
    <InspectorShell
      title="Node settings"
      meta={`#${node.nodeId}`}
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as EditorNodeInspectorTab)}
      >
        <TabsList className="w-full">
          {tabOptions.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="content">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium uppercase tracking-widest text-[var(--muted)]">
                Title
              </label>
              <input
                value={node.title ?? ""}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="Untitled node"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-muted)]"
              />
            </div>

            <CollapsibleSection title="Node properties" defaultOpen>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
                  Chapter type
                </label>
                <div className="relative">
                  <select
                    value={chapterType}
                    onChange={(event) => onNodeTypeChange(event.target.value)}
                    className="w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 pr-9 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-muted)]"
                  >
                    {chapterTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </TabsContent>

        <TabsContent value="style">
          <PlaceholderPanel>{placeholderText.style}</PlaceholderPanel>
        </TabsContent>
        <TabsContent value="buttons">
          <PlaceholderPanel>{placeholderText.buttons}</PlaceholderPanel>
        </TabsContent>
        <TabsContent value="logic">
          <PlaceholderPanel>{placeholderText.logic}</PlaceholderPanel>
        </TabsContent>
      </Tabs>
    </InspectorShell>
  );
}

type LinkInspectorPanelProps = {
  link: LinkModel;
};

export function LinkInspectorPanel({ link }: LinkInspectorPanelProps) {
  const isBidirectional = String(link.type ?? "")
    .toLowerCase()
    .includes("bidirectional");
  const arrow = isBidirectional ? "<->" : "->";

  return (
    <InspectorShell
      title="Link settings"
      meta={`#${link.linkId}`}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard
          label="Connection"
          value={
            <span className="inline-flex items-center gap-2 font-mono">
              <span>#{link.source}</span>
              <span className="text-[var(--muted)]">{arrow}</span>
              <span>#{link.target}</span>
            </span>
          }
          className="sm:col-span-2"
        />
        <InfoCard label="Type" value={link.type || "default"} />
        <InfoCard label="Label" value={link.label || "Untitled"} />
      </div>
      <PlaceholderPanel>Link editing coming in the next update.</PlaceholderPanel>
    </InspectorShell>
  );
}

type AdventureInspectorPanelProps = {
  adventure: AdventureModel;
};

export function AdventureInspectorPanel({
  adventure,
}: AdventureInspectorPanelProps) {
  return (
    <InspectorShell
      title={adventure.title || "Adventure"}
      subtitle="Adventure overview"
      meta={`#${adventure.id}`}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Nodes" value={adventure.nodes.length} />
        <StatCard label="Links" value={adventure.links.length} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard label="Edit slug" value={adventure.slug || "n/a"} />
        <InfoCard label="View slug" value={adventure.viewSlug || "n/a"} />
      </div>
      <PlaceholderPanel>Adventure settings coming in the next update.</PlaceholderPanel>
    </InspectorShell>
  );
}

function PlaceholderPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[120px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-6 text-xs text-[var(--muted)]",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
        <p className="text-[var(--muted)]">{children}</p>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-2 px-3 py-2 text-left",
          open ? "border-b border-[var(--border)]" : ""
        )}
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
          {title}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-[var(--muted)] transition-transform",
            open ? "rotate-180" : ""
          )}
          aria-hidden="true"
        />
      </button>
      {open ? <div className="space-y-3 px-3 py-3">{children}</div> : null}
    </div>
  );
}

function InfoCard({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2",
        className
      )}
    >
      <LabelValue label={label} value={value} className="gap-1" />
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text)]">
        {value}
      </p>
    </div>
  );
}
