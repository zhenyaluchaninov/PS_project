"use client";

import { useEffect } from "react";
import { LegacyContent } from "@/features/ui-core/components/LegacyContent";
import { Button } from "@/features/ui-core/primitives";
import { buildPropsStyle } from "@/features/ui-core/props";
import { LabelValue } from "@/ui-core/LabelValue";
import { PageShell } from "@/ui-core/PageShell";
import { Panel } from "@/ui-core/Panel";
import { toastError } from "@/features/ui-core/toast";
import {
  selectPlayerAdventure,
  selectPlayerCurrentNode,
  selectPlayerCurrentNodeKind,
  selectPlayerHistoryLength,
  selectPlayerMode,
  selectPlayerOutgoingLinks,
  selectPlayerProgress,
  selectPlayerRootNodeId,
  selectPlayerVisitedCount,
  usePlayerStore,
} from "../state/playerStore";
import {
  resolveReferenceUrl,
  resolveVideoSource,
  type NodeKind,
} from "../engine/playerEngine";

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
  const referenceUrl =
    currentNodeKind === "reference" || currentNodeKind === "reference-tab"
      ? resolveReferenceUrl(currentNode)
      : null;
  const videoSource = currentNodeKind === "video" ? resolveVideoSource(currentNode) : null;
  const openReference = () => {
    if (!referenceUrl) {
      toastError("Missing link", "No URL found for this reference node.");
      return;
    }
    try {
      if (currentNodeKind === "reference-tab") {
        window.open(referenceUrl, "_blank", "noopener,noreferrer");
      } else {
        window.location.assign(referenceUrl);
      }
    } catch (err) {
      toastError("Could not open link", referenceUrl);
      console.error(err);
    }
  };

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
            {videoSource ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60">
                <video
                  key={videoSource}
                  src={videoSource}
                  controls
                  className="h-full w-full max-h-[360px] bg-black"
                  playsInline
                />
              </div>
            ) : null}
            <NodeContent
              nodeKind={currentNodeKind}
              nodeTitle={currentNode?.title ?? ""}
              nodeText={currentNode?.text ?? ""}
            />
            {currentNodeKind === "reference" || currentNodeKind === "reference-tab" ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-3">
                <Button onClick={openReference} disabled={!referenceUrl}>
                  {currentNodeKind === "reference-tab"
                    ? "Open link in new tab"
                    : "Open link"}
                </Button>
                <div className="min-w-0 flex-1 text-xs text-[var(--muted)]">
                  {referenceUrl ? (
                    <span className="break-words">{referenceUrl}</span>
                  ) : (
                    <span className="text-red-300">No URL found in this node.</span>
                  )}
                </div>
              </div>
            ) : null}
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

function NodeContent({
  nodeKind,
  nodeTitle,
  nodeText,
}: {
  nodeKind: NodeKind;
  nodeTitle: string;
  nodeText: string;
}) {
  const prose = (
    <div className="prose prose-invert max-w-none text-[var(--text)] prose-p:my-3 prose-a:text-[var(--accent-strong)]">
      {nodeText ? (
        <LegacyContent value={nodeText} />
      ) : (
        <p className="text-sm text-[var(--muted)]">No content.</p>
      )}
    </div>
  );

  if (nodeKind === "start") {
    return (
      <div className="mt-4 space-y-3">
        <h1 className="text-3xl font-bold text-[var(--text)]">{nodeTitle || "Start"}</h1>
        {prose}
      </div>
    );
  }

  if (nodeKind === "chapter") {
    return (
      <div className="mt-4 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-4">
        <div className="border-b border-[var(--border)] pb-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Chapter</p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--text)]">
            {nodeTitle || "Untitled chapter"}
          </h2>
        </div>
        {prose}
      </div>
    );
  }

  if (nodeKind === "chapter-plain") {
    return (
      <div className="mt-4 space-y-2">
        <h2 className="text-xl font-semibold text-[var(--text)]">
          {nodeTitle || "Untitled chapter"}
        </h2>
        {prose}
      </div>
    );
  }

  return <div className="mt-4">{prose}</div>;
}
