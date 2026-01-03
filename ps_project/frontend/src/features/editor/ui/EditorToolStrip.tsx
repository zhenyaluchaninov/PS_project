"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  MousePointer2,
  PieChart,
  Search,
  Stethoscope,
  X,
} from "lucide-react";
import type { AdventureModel } from "@/domain/models";
import {
  selectEditorSelectionToolActive,
  selectEditorToolPanel,
  useEditorStore,
} from "../state/editorStore";
import { cn } from "@/lib/utils";

type EditorToolStripProps = {
  adventure: AdventureModel;
};

const DIAGNOSTICS_DEBOUNCE_MS = 300;

type DiagnosticsEntry = {
  id: string;
  label: string;
  nodeId?: number;
};

type DiagnosticsStats = {
  totalNodes: number;
  totalLinks: number;
  uniqueImages: number;
  uniqueVideos: number;
  uniqueAudio: number;
  uniqueSubtitles: number;
  linksWithConditions: number;
};

type DiagnosticsState = {
  critical: DiagnosticsEntry[];
  warnings: DiagnosticsEntry[];
  stats: DiagnosticsStats;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return isPlainRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isPlainRecord(value) ? value : null;
};

const getPropString = (
  record: Record<string, unknown> | null,
  keys: string[]
): string | null => {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
};

const hasConditionList = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "[]") return false;
    if (/^\d+$/.test(trimmed)) {
      return Number(trimmed) > 0;
    }
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) && parsed.length > 0;
      } catch {
        return true;
      }
    }
    return true;
  }
  if (typeof value === "number") return value > 0;
  return false;
};

const hasLinkConditions = (props: Record<string, unknown> | null): boolean => {
  if (!props) return false;
  const positive =
    props.positiveNodeList ??
    props.positive_node_list ??
    props.positiveNodes ??
    props.positive_nodes;
  const negative =
    props.negativeNodeList ??
    props.negative_node_list ??
    props.negativeNodes ??
    props.negative_nodes;
  return hasConditionList(positive) || hasConditionList(negative);
};

const computeDiagnostics = (adventure: AdventureModel): DiagnosticsState => {
  const nodes = adventure.nodes ?? [];
  const links = adventure.links ?? [];
  const nodeIds = new Set<number>();
  const adjacency = new Map<number, number[]>();

  nodes.forEach((node) => {
    nodeIds.add(node.nodeId);
    adjacency.set(node.nodeId, []);
  });

  links.forEach((link) => {
    const source = link.source;
    const target = link.target;
    if (!nodeIds.has(source) || !nodeIds.has(target)) return;
    adjacency.get(source)?.push(target);
    const normalizedType = String(link.type ?? "").toLowerCase();
    if (normalizedType.includes("bidirectional")) {
      adjacency.get(target)?.push(source);
    }
  });

  const rootNodes = nodes.filter(
    (node) => (node.type ?? "").toLowerCase() === "root"
  );
  const rootIds = rootNodes.map((node) => node.nodeId);
  const visited = new Set<number>();
  const queue = [...rootIds];
  rootIds.forEach((nodeId) => visited.add(nodeId));

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const neighbors = adjacency.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      queue.push(neighbor);
    }
  }

  const unreachableNodes = nodes.filter((node) => !visited.has(node.nodeId));
  const untitledNodes = nodes.filter((node) => node.title.trim().length === 0);

  const critical: DiagnosticsEntry[] = [];
  if (rootIds.length === 0) {
    critical.push({ id: "missing-root", label: "Missing root node" });
  }

  const warnings: DiagnosticsEntry[] = [];
  unreachableNodes.forEach((node) => {
    const title = node.title.trim();
    const titleLabel = title ? ` "${title}"` : "";
    warnings.push({
      id: `unreachable-${node.nodeId}`,
      label: `Node #${node.nodeId}${titleLabel} unreachable`,
      nodeId: node.nodeId,
    });
  });

  untitledNodes.forEach((node) => {
    warnings.push({
      id: `untitled-${node.nodeId}`,
      label: `Node #${node.nodeId} - no title`,
      nodeId: node.nodeId,
    });
  });

  const uniqueImages = new Set<string>();
  const uniqueVideos = new Set<string>();
  const uniqueAudio = new Set<string>();
  const uniqueSubtitles = new Set<string>();

  nodes.forEach((node) => {
    const rawImageUrl =
      typeof node.image?.url === "string" ? node.image.url.trim() : "";
    const imageUrl = rawImageUrl.split(/[?#]/)[0]?.trim() ?? "";
    const hasImage = imageUrl.length > 0;
    const isVideo = hasImage && imageUrl.toLowerCase().endsWith(".mp4");
    if (isVideo) {
      uniqueVideos.add(imageUrl.toLowerCase());
    } else if (hasImage) {
      uniqueImages.add(imageUrl.toLowerCase());
    }

    const props = parseRecord(node.rawProps ?? node.props);
    const audioUrl = getPropString(props, [
      "audio_url",
      "audioUrl",
      "audio_url_alt",
      "audioUrlAlt",
    ]);
    const normalizedAudio = audioUrl?.split(/[?#]/)[0]?.trim() ?? "";
    const subtitlesUrl = getPropString(props, [
      "subtitles_url",
      "subtitlesUrl",
    ]);
    const normalizedSubtitles = subtitlesUrl?.split(/[?#]/)[0]?.trim() ?? "";
    if (normalizedAudio) {
      uniqueAudio.add(normalizedAudio.toLowerCase());
    }
    if (normalizedSubtitles) {
      uniqueSubtitles.add(normalizedSubtitles.toLowerCase());
    }
  });

  let linksWithConditions = 0;
  links.forEach((link) => {
    const props = parseRecord(link.props);
    if (hasLinkConditions(props)) {
      linksWithConditions += 1;
    }
  });

  return {
    critical,
    warnings,
    stats: {
      totalNodes: nodes.length,
      totalLinks: links.length,
      uniqueImages: uniqueImages.size,
      uniqueVideos: uniqueVideos.size,
      uniqueAudio: uniqueAudio.size,
      uniqueSubtitles: uniqueSubtitles.size,
      linksWithConditions,
    },
  };
};

export function EditorToolStrip({ adventure }: EditorToolStripProps) {
  const selectionToolActive = useEditorStore(selectEditorSelectionToolActive);
  const toolPanel = useEditorStore(selectEditorToolPanel);
  const setSelectionToolActive = useEditorStore((s) => s.setSelectionToolActive);
  const setToolPanel = useEditorStore((s) => s.setToolPanel);
  const setFocusNodeId = useEditorStore((s) => s.setFocusNodeId);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const diagnosticsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState>(() =>
    computeDiagnostics(adventure)
  );
  const [criticalOpen, setCriticalOpen] = useState(true);
  const [warningOpen, setWarningOpen] = useState(true);

  const isSearchOpen = toolPanel === "search";
  const isDiagnosticsOpen = toolPanel === "diagnostics";
  const criticalCount = diagnostics.critical.length;
  const warningCount = diagnostics.warnings.length;
  const totalIssues = criticalCount + warningCount;
  const diagnosticsBadge = useMemo(() => {
    if (criticalCount > 0) {
      return { tone: "danger" as const, count: criticalCount };
    }
    if (warningCount > 0) {
      return { tone: "warning" as const, count: warningCount };
    }
    return null;
  }, [criticalCount, warningCount]);
  const diagnosticsTitle = useMemo(() => {
    if (criticalCount > 0) {
      return `Diagnostics: ${criticalCount} critical issue${
        criticalCount === 1 ? "" : "s"
      }`;
    }
    if (warningCount > 0) {
      return `Diagnostics: ${warningCount} warning${
        warningCount === 1 ? "" : "s"
      }`;
    }
    return "Diagnostics: no issues";
  }, [criticalCount, warningCount]);
  const toolButtonClass = (active: boolean) =>
    cn(
      "flex h-9 w-9 items-center justify-center rounded-md border text-[var(--text)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]",
      active
        ? "border-[var(--accent)] bg-[var(--bg-tertiary)]"
        : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-light)]"
    );
  const issueRowClass =
    "flex w-full items-start gap-2 rounded-md px-2 py-1 text-left text-sm text-[var(--text)] transition hover:bg-[var(--bg-hover)]";

  useEffect(() => {
    if (!isSearchOpen) return;
    inputRef.current?.focus();
  }, [isSearchOpen]);

  useEffect(() => {
    if (diagnosticsTimerRef.current) {
      clearTimeout(diagnosticsTimerRef.current);
    }
    diagnosticsTimerRef.current = setTimeout(() => {
      diagnosticsTimerRef.current = null;
      setDiagnostics(computeDiagnostics(adventure));
    }, DIAGNOSTICS_DEBOUNCE_MS);
    return () => {
      if (diagnosticsTimerRef.current) {
        clearTimeout(diagnosticsTimerRef.current);
        diagnosticsTimerRef.current = null;
      }
    };
  }, [adventure]);

  const sortedNodes = useMemo(
    () => [...adventure.nodes].sort((a, b) => a.nodeId - b.nodeId),
    [adventure.nodes]
  );

  const filteredNodes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sortedNodes;
    const idQuery = normalized.startsWith("#") ? normalized.slice(1) : normalized;
    return sortedNodes.filter((node) => {
      const title = (node.title || `Node ${node.nodeId}`).toLowerCase();
      if (title.includes(normalized)) return true;
      if (idQuery && String(node.nodeId).includes(idQuery)) return true;
      return false;
    });
  }, [query, sortedNodes]);

  return (
    <div className="relative h-full w-12 border-r border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex h-full flex-col items-center px-2 py-3">
        <div className="flex flex-col items-center gap-2 p-2">
          <button
            type="button"
            onClick={() => setToolPanel(isSearchOpen ? null : "search")}
            className={toolButtonClass(isSearchOpen)}
            aria-label="Search"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setToolPanel(isDiagnosticsOpen ? null : "diagnostics")}
            className={cn(toolButtonClass(isDiagnosticsOpen), "relative")}
            aria-label="Diagnostics"
            title={diagnosticsTitle}
          >
            <Stethoscope className="h-4 w-4" aria-hidden="true" />
            {diagnosticsBadge ? (
              <span
                className={cn(
                  "pointer-events-none absolute -right-1 -top-1 flex min-w-[16px] items-center justify-center rounded-full border px-1 text-[9px] font-semibold",
                  diagnosticsBadge.tone === "danger" &&
                    "border-[var(--danger)] bg-[var(--danger)] text-[var(--bg)]",
                  diagnosticsBadge.tone === "warning" &&
                    "border-[var(--warning)] bg-[var(--warning)] text-[var(--bg)]"
                )}
              >
                {diagnosticsBadge.count}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setSelectionToolActive(!selectionToolActive)}
            className={toolButtonClass(selectionToolActive)}
            aria-label="Selection tool"
          >
            <MousePointer2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {isSearchOpen ? (
        <div className="absolute left-full top-3 ml-3 w-[260px]">
          <div className="flex h-[60vh] max-h-[480px] flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[0_16px_36px_-24px_var(--border)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Search nodes
              </span>
              <button
                type="button"
                onClick={() => setToolPanel(null)}
                className="rounded-md border border-[var(--border)] bg-[var(--bg)] p-1 text-[var(--muted)] transition hover:border-[var(--border-light)] hover:text-[var(--text)]"
                aria-label="Close search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-3">
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title or #id"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-muted)]"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-3">
              {filteredNodes.length ? (
                filteredNodes.map((node) => (
                  <button
                    key={node.nodeId}
                    type="button"
                    onClick={() => setFocusNodeId(node.nodeId)}
                    className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm text-[var(--text)] transition hover:bg-[var(--bg-hover)]"
                  >
                    <span className="truncate">
                      {node.title || `Node ${node.nodeId}`}
                    </span>
                    <span className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs font-mono text-[var(--muted)]">
                      #{node.nodeId}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-2 py-4 text-sm text-[var(--muted)]">
                  No matching nodes.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {isDiagnosticsOpen ? (
        <div className="absolute left-full top-3 ml-3 w-[320px]">
          <div className="flex h-[70vh] max-h-[560px] flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[0_16px_36px_-24px_var(--border)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
                Diagnostics
              </div>
              <button
                type="button"
                onClick={() => setToolPanel(null)}
                className="rounded-md border border-[var(--border)] bg-[var(--bg)] p-1 text-[var(--muted)] transition hover:border-[var(--border-light)] hover:text-[var(--text)]"
                aria-label="Close diagnostics"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {totalIssues === 0 ? (
                <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]">
                  <Check className="h-4 w-4 text-[var(--success)]" aria-hidden="true" />
                  <span>No issues found</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-md border border-[var(--border)] bg-[var(--bg)]">
                    <button
                      type="button"
                      onClick={() => setCriticalOpen(!criticalOpen)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                      aria-expanded={criticalOpen}
                    >
                      <span className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                        <AlertOctagon
                          className="h-3.5 w-3.5 text-[var(--danger)]"
                          aria-hidden="true"
                        />
                        Critical ({criticalCount})
                      </span>
                      {criticalOpen ? (
                        <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
                      )}
                    </button>
                    {criticalOpen ? (
                      <div className="border-t border-[var(--border)] px-3 py-2">
                        {criticalCount ? (
                          <div className="space-y-1">
                            {diagnostics.critical.map((entry) =>
                              entry.nodeId == null ? (
                                <div
                                  key={entry.id}
                                  className="rounded-md px-2 py-1 text-sm text-[var(--text)]"
                                >
                                  {entry.label}
                                </div>
                              ) : (
                                <button
                                  key={entry.id}
                                  type="button"
                                  onClick={() => setFocusNodeId(entry.nodeId)}
                                  className={issueRowClass}
                                >
                                  {entry.label}
                                </button>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="px-2 py-1 text-xs text-[var(--muted)]">
                            No critical issues.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-md border border-[var(--border)] bg-[var(--bg)]">
                    <button
                      type="button"
                      onClick={() => setWarningOpen(!warningOpen)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                      aria-expanded={warningOpen}
                    >
                      <span className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                        <AlertTriangle
                          className="h-3.5 w-3.5 text-[var(--warning)]"
                          aria-hidden="true"
                        />
                        Warnings ({warningCount})
                      </span>
                      {warningOpen ? (
                        <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
                      )}
                    </button>
                    {warningOpen ? (
                      <div className="border-t border-[var(--border)] px-3 py-2">
                        {warningCount ? (
                          <div className="space-y-1">
                            {diagnostics.warnings.map((entry) =>
                              entry.nodeId == null ? (
                                <div
                                  key={entry.id}
                                  className="rounded-md px-2 py-1 text-sm text-[var(--text)]"
                                >
                                  {entry.label}
                                </div>
                              ) : (
                                <button
                                  key={entry.id}
                                  type="button"
                                  onClick={() => setFocusNodeId(entry.nodeId)}
                                  className={issueRowClass}
                                >
                                  {entry.label}
                                </button>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="px-2 py-1 text-xs text-[var(--muted)]">
                            No warnings.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-[var(--border)] px-3 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                <PieChart className="h-3.5 w-3.5" aria-hidden="true" />
                Statistics
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--text)]">
                <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1">
                  <span className="text-[var(--muted)]">Nodes</span>
                  <span className="font-semibold">{diagnostics.stats.totalNodes}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1">
                  <span className="text-[var(--muted)]">Links</span>
                  <span className="font-semibold">{diagnostics.stats.totalLinks}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1">
                  <span className="text-[var(--muted)]">Unique images</span>
                  <span className="font-semibold">{diagnostics.stats.uniqueImages}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1">
                  <span className="text-[var(--muted)]">Unique videos</span>
                  <span className="font-semibold">{diagnostics.stats.uniqueVideos}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1">
                  <span className="text-[var(--muted)]">Unique audio</span>
                  <span className="font-semibold">{diagnostics.stats.uniqueAudio}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1">
                  <span className="text-[var(--muted)]">Unique subtitles</span>
                  <span className="font-semibold">{diagnostics.stats.uniqueSubtitles}</span>
                </div>
                <div className="col-span-2 flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1">
                  <span className="text-[var(--muted)]">Conditional links</span>
                  <span className="font-semibold">
                    {diagnostics.stats.linksWithConditions}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
