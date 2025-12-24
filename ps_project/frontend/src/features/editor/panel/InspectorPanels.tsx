"use client";

import type { ReactNode } from "react";
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
  style: "Style controls arrive in a later step.",
  buttons: "Button settings arrive in a later step.",
  logic: "Logic tools arrive in a later step.",
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
  subtitle?: string | null;
  meta?: string | null;
  children: ReactNode;
};

function InspectorShell({ title, subtitle, meta, children }: InspectorShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
          Inspector
        </p>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
            {subtitle ? (
              <p className="text-xs text-[var(--muted)]">{subtitle}</p>
            ) : null}
          </div>
          {meta ? (
            <span className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs font-mono text-[var(--muted)]">
              {meta}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex-1 space-y-6 px-5 py-5 text-sm text-[var(--text)]">
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
      title={node.title || "Untitled node"}
      subtitle="Node properties"
      meta={`#${node.nodeId}`}
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as EditorNodeInspectorTab)}
      >
        <TabsList className="w-full flex-wrap justify-start">
          {tabOptions.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="content">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
                Title
              </label>
              <input
                value={node.title ?? ""}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="Untitled node"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-muted)]"
              />
            </div>

            <details className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/40" open>
              <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)] list-none">
                <span>Node properties</span>
                <span className="text-[10px] tracking-[0.18em] text-[var(--muted)]">
                  Basics
                </span>
              </summary>
              <div className="space-y-3 border-t border-[var(--border)] px-3 py-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
                    Chapter type
                  </label>
                  <select
                    value={chapterType}
                    onChange={(event) => onNodeTypeChange(event.target.value)}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-muted)]"
                  >
                    {chapterTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </details>
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
  return (
    <InspectorShell
      title="Link"
      subtitle={`From #${link.source} to #${link.target}`}
      meta={`#${link.linkId}`}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <LabelValue label="From" value={`#${link.source}`} />
        <LabelValue label="To" value={`#${link.target}`} />
        <LabelValue label="Type" value={link.type || "default"} />
        <LabelValue label="Label" value={link.label || "Untitled"} />
      </div>
      <PlaceholderPanel>Editing links arrives in Step 26.</PlaceholderPanel>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <LabelValue label="Nodes" value={adventure.nodes.length} />
        <LabelValue label="Links" value={adventure.links.length} />
        <LabelValue label="Slug" value={adventure.slug || "n/a"} />
        <LabelValue label="View" value={adventure.viewSlug || "n/a"} />
      </div>
      <PlaceholderPanel>Adventure settings arrive in Step 27.</PlaceholderPanel>
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
        "rounded-xl border border-[var(--border)] bg-[var(--bg)]/40 p-4 text-sm text-[var(--muted)]",
        className
      )}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
        Coming soon
      </p>
      <p className="mt-2 text-[var(--text-secondary)]">{children}</p>
    </div>
  );
}
