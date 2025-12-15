"use client";

import { useEffect } from "react";
import {
  selectPlayerAdventure,
  selectPlayerError,
  selectPlayerStatus,
  usePlayerStore,
} from "../state/playerStore";
import { API_BASE_URL, resolveApiUrl } from "@/features/state/api/client";
import { PageShell } from "@/ui-core/PageShell";
import { Panel } from "@/ui-core/Panel";
import { LabelValue } from "@/ui-core/LabelValue";

type PlayerRouteProps = {
  viewSlug: string;
};

export function PlayerRoute({ viewSlug }: PlayerRouteProps) {
  const status = usePlayerStore(selectPlayerStatus);
  const adventure = usePlayerStore(selectPlayerAdventure);
  const error = usePlayerStore(selectPlayerError);
  const loadByViewSlug = usePlayerStore((s) => s.loadByViewSlug);

  useEffect(() => {
    void loadByViewSlug(viewSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewSlug]);

  if (status === "loading" || status === "idle") {
    return (
      <PageShell>
        <Panel>
          <p className="text-sm text-[var(--muted)]">Loading adventure…</p>
        </Panel>
      </PageShell>
    );
  }

  if (status === "error" && error) {
    const apiBase = API_BASE_URL || "relative via Next rewrite (/api)";
    const attemptedUrl =
      error.url ?? resolveApiUrl(`/api/adventure/${viewSlug}`);
    const detail =
      typeof error.details === "string"
        ? error.details
        : error.details
          ? JSON.stringify(error.details, null, 2)
          : null;

    const isNotFound = error.status === 404;

    return (
      <PageShell>
        <Panel>
          <div className="space-y-3 text-[var(--text)]">
            <p className="text-sm font-semibold">
              {isNotFound ? "Adventure not found" : "Could not load adventure"}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {error.status ? `${error.status}: ` : ""}
              {error.message}
            </p>
            <div className="rounded-lg bg-black/30 p-3 text-xs leading-relaxed text-red-50">
              <p>
                API base: <span className="font-semibold">{apiBase}</span>
              </p>
              <p>
                Request URL:{" "}
                <span className="font-semibold">{attemptedUrl}</span>
              </p>
              {error.status ? (
                <p>
                  Status: <span className="font-semibold">{error.status}</span>
                </p>
              ) : null}
              {detail ? (
                <pre className="mt-2 whitespace-pre-wrap break-words">
                  {detail}
                </pre>
              ) : null}
            </div>
          </div>
        </Panel>
      </PageShell>
    );
  }

  if (status === "ready" && adventure) {
    return (
      <PageShell>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              Player route
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-[var(--text)]">
              {adventure.title}
            </h1>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Panel>
              <LabelValue label="view slug" value={adventure.viewSlug} />
              <LabelValue
                label="edit slug"
                value={adventure.slug || "n/a"}
                className="mt-3"
              />
            </Panel>
            <Panel>
              <LabelValue
                label="Nodes"
                value={adventure.nodes.length}
                inline
              />
              <LabelValue
                label="Links"
                value={adventure.links.length}
                inline
                className="mt-2"
              />
            </Panel>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Data fetched via validated API client (mode: play).
          </p>
        </div>
      </PageShell>
    );
  }

  return null;
}
