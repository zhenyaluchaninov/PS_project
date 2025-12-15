"use client";

import { useEffect } from "react";
import { LabelValue } from "@/ui-core/LabelValue";
import { PageShell } from "@/ui-core/PageShell";
import { Panel } from "@/ui-core/Panel";
import {
  usePlayerStore,
} from "../state/playerStore";

export function PlayerRuntime() {
  const adventure = usePlayerStore((s) => s.adventure);
  const currentNodeId = usePlayerStore((s) => s.currentNodeId);
  const chooseLink = usePlayerStore((s) => s.chooseLink);
  const start = usePlayerStore((s) => s.start);
  const getNodeById = usePlayerStore((s) => s.getNodeById);
  const getOutgoingLinks = usePlayerStore((s) => s.getOutgoingLinks);
  const getCurrentNode = usePlayerStore((s) => s.getCurrentNode);

  useEffect(() => {
    if (currentNodeId == null) {
      start();
    }
  }, [currentNodeId, start]);

  if (process.env.NODE_ENV !== "production") {
    console.log("[player] runtime render", { node: currentNodeId });
  }

  if (!adventure) return null;
  const currentNode = getCurrentNode();
  const outgoingLinks = getOutgoingLinks(currentNodeId);

  return (
    <PageShell>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
            Player runtime
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-[var(--text)]">
            {adventure.title}
          </h1>
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
                <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                  #{currentNode.nodeId}
                </span>
              ) : null}
            </div>
            <div className="prose prose-invert mt-4 max-w-none text-[var(--text)] prose-p:my-3 prose-a:text-[var(--accent)]">
              {currentNode ? (
                <div
                  dangerouslySetInnerHTML={{ __html: currentNode.text }}
                />
              ) : (
                <p className="text-sm text-[var(--muted)]">No node selected.</p>
              )}
            </div>
          </Panel>

          <Panel muted>
            <LabelValue label="View slug" value={adventure.viewSlug} />
            <LabelValue
              label="Edit slug"
              value={adventure.slug || "n/a"}
              className="mt-3"
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <LabelValue label="Nodes" value={adventure.nodes.length} />
              <LabelValue label="Links" value={adventure.links.length} />
            </div>
          </Panel>
        </div>

        <Panel title="Choices">
          {currentNode && outgoingLinks.length > 0 ? (
            <div className="flex flex-col gap-3">
              {outgoingLinks.map((link, idx) => (
                <button
                  key={link.linkId}
                  type="button"
                  onClick={() => chooseLink(link.linkId)}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-left text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)]"
                >
                  <span>
                    {link.label && link.label.trim().length > 0
                      ? link.label
                      : getNodeById(link.toNodeId)?.title || `Continue ${idx + 1}`}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    → Node {link.toNodeId}
                  </span>
                </button>
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
