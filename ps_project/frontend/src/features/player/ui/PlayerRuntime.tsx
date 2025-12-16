"use client";

import { useEffect } from "react";
import { LegacyContent } from "@/features/ui-core/components/LegacyContent";
import { Button } from "@/features/ui-core/primitives";
import { buildPropsStyle } from "@/features/ui-core/props";
import { LabelValue } from "@/ui-core/LabelValue";
import { PageShell } from "@/ui-core/PageShell";
import { Panel } from "@/ui-core/Panel";
import {
  selectPlayerAdventure,
  selectPlayerCurrentNode,
  selectPlayerHistoryLength,
  selectPlayerMode,
  selectPlayerOutgoingLinks,
  selectPlayerProgress,
  selectPlayerRootNodeId,
  selectPlayerVisitedCount,
  selectPlayerCurrentNodeKind,
  usePlayerStore,
} from "../state/playerStore";

export function PlayerRuntime() {
  const adventure = usePlayerStore(selectPlayerAdventure);
  const currentNode = usePlayerStore(selectPlayerCurrentNode);
  const currentNodeKind = usePlayerStore(selectPlayerCurrentNodeKind);
  const outgoingLinks = usePlayerStore(selectPlayerOutgoingLinks);
  const mode = usePlayerStore(selectPlayerMode);
  const historyLength = usePlayerStore(selectPlayerHistoryLength);
  const visitedCount = usePlayerStore(selectPlayerVisitedCount);
  const progress = usePlayerStore(selectPlayerProgress);
  const rootNodeId = usePlayerStore(selectPlayerRootNodeId);
  const chooseLink = usePlayerStore((s) => s.chooseLink);
  const start = usePlayerStore((s) => s.start);
  const getNodeById = usePlayerStore((s) => s.getNodeById);
  const goBack = usePlayerStore((s) => s.goBack);
  const goHome = usePlayerStore((s) => s.goHome);

  useEffect(() => {
    if (!currentNode) {
      start();
    }
  }, [currentNode, start]);

  if (!adventure) return null;

  const { style: propsStyle, flags } = buildPropsStyle({
    adventureProps: adventure.props ?? undefined,
    nodeProps: currentNode?.props ?? undefined,
  });

  return (
    <PageShell>
      <div
        style={propsStyle}
        className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)]/80 p-5 shadow-[0_24px_120px_-80px_rgba(0,0,0,0.7)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              Player runtime
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-[var(--text)]">
              {adventure.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mode === "preview" ? (
              <span className="rounded-full border border-[var(--border)] bg-yellow-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-yellow-200">
                Preview mode
              </span>
            ) : null}
            {flags.highContrast ? (
              <span className="rounded-full border border-[var(--border)] bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                High contrast
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <Panel>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                  Current node
                </p>
                <p className="text-lg font-semibold text-[var(--text)]">
                  {currentNode?.title || "Untitled node"}
                </p>
              </div>
              {currentNode ? (
                <div className="flex flex-col items-end gap-2 text-right">
                  <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                    #{currentNode.nodeId}
                  </span>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    Node kind: {currentNodeKind}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="prose prose-invert mt-4 max-w-none text-[var(--text)] prose-p:my-3 prose-a:text-[var(--accent-strong)]">
              {currentNode ? (
                <LegacyContent value={currentNode.text} />
              ) : (
                <p className="text-sm text-[var(--muted)]">No node selected.</p>
              )}
            </div>
          </Panel>

          <Panel muted>
            <div className="space-y-2">
              <LabelValue label="View slug" value={adventure.viewSlug} />
              <LabelValue
                label="Edit slug"
                value={adventure.slug || "n/a"}
                className="mt-1"
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <LabelValue label="Nodes" value={adventure.nodes.length} />
                <LabelValue label="Links" value={adventure.links.length} />
              </div>
              <div className="mt-4 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 p-3">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent-strong)] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--muted)]">
                  Visited {visitedCount}/{adventure.nodes.length} nodes
                </p>
              </div>
            </div>
          </Panel>
        </div>

        <Panel title="Navigation">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              onClick={goBack}
              disabled={historyLength <= 1}
            >
              Back
            </Button>
            <Button
              variant="secondary"
              onClick={goHome}
              disabled={!rootNodeId || historyLength <= 1}
            >
              Home
            </Button>
          </div>
        </Panel>

        <Panel title="Choices">
          {currentNode && outgoingLinks.length > 0 ? (
            <div className="flex flex-col gap-3">
              {outgoingLinks.map((link, idx) => (
                (() => {
                  const targetNode = getNodeById(link.toNodeId);
                  const isBroken = !link.toNodeId || !targetNode;
                  return (
                    <button
                      key={link.linkId}
                      type="button"
                      onClick={() => chooseLink(link.linkId)}
                      aria-disabled={isBroken}
                      className={[
                        "flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-left text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)]",
                        isBroken
                          ? "border-red-400/40 bg-red-500/5 opacity-70 hover:border-red-300"
                          : "",
                      ].join(" ")}
                    >
                      <span className="flex flex-col">
                        <span>
                          {link.label && link.label.trim().length > 0
                            ? link.label
                            : targetNode?.title || `Continue ${idx + 1}`}
                        </span>
                        {isBroken ? (
                          <span className="text-xs font-normal text-red-300">
                            Broken link
                          </span>
                        ) : null}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        {isBroken
                          ? "No target"
                          : `→ Node ${link.toNodeId}`}
                      </span>
                    </button>
                  );
                })()
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">No outgoing links.</p>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}
