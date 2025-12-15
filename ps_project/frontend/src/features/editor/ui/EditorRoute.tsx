"use client";

import { useEffect } from "react";
import { API_BASE_URL, resolveApiUrl } from "@/features/state/api/client";
import {
  selectEditorAdventure,
  selectEditorDirty,
  selectEditorEditVersion,
  selectEditorError,
  selectEditorStatus,
  useEditorStore,
} from "../state/editorStore";
import { PageShell } from "@/ui-core/PageShell";
import { Panel } from "@/ui-core/Panel";
import { LabelValue } from "@/ui-core/LabelValue";
import { SectionTitle } from "@/ui-core/SectionTitle";

type EditorRouteProps = {
  editSlug: string;
};

export function EditorRoute({ editSlug }: EditorRouteProps) {
  const status = useEditorStore(selectEditorStatus);
  const adventure = useEditorStore(selectEditorAdventure);
  const error = useEditorStore(selectEditorError);
  const dirty = useEditorStore(selectEditorDirty);
  const editVersion = useEditorStore(selectEditorEditVersion);
  const loadByEditSlug = useEditorStore((s) => s.loadByEditSlug);

  useEffect(() => {
    void loadByEditSlug(editSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSlug]);

  if (status === "loading" || status === "idle") {
    return (
      <PageShell>
        <Panel>
          <p className="text-sm text-[var(--muted)]">Loading editor data…</p>
        </Panel>
      </PageShell>
    );
  }

  if (status === "error" && error) {
    const apiBase = API_BASE_URL || "relative via Next rewrite (/api)";
    const attemptedUrl = error.url ?? resolveApiUrl(`/api/adventure/${editSlug}/edit`);
    const detail =
      typeof error.details === "string"
        ? error.details
        : error.details
          ? JSON.stringify(error.details, null, 2)
          : null;
    const isNotFound = error.status === 404;
    const isUnauthorized = error.status === 401 || error.status === 403;

    return (
      <PageShell>
        <Panel>
          <div className="space-y-3 text-[var(--text)]">
            <p className="text-sm font-semibold">
              {isNotFound
                ? "Adventure not found"
                : isUnauthorized
                  ? "Unauthorized / login required"
                  : "Could not load adventure"}
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
          <SectionTitle
            title="Editor route"
            subtitle="Edit slug required; view slug shown for reference."
          />
          <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
            <Panel>
              <LabelValue label="Title" value={adventure.title} />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <LabelValue label="Edit slug" value={editSlug} />
                <LabelValue label="View slug" value={adventure.viewSlug} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <LabelValue label="Nodes" value={adventure.nodes.length} />
                <LabelValue label="Links" value={adventure.links.length} />
              </div>
            </Panel>

            <Panel muted>
              <LabelValue label="Edit version" value={editVersion ?? "n/a"} />
              <LabelValue
                label="Dirty"
                value={dirty ? "true" : "false"}
                className="mt-3"
              />
            </Panel>
          </div>
        </div>
      </PageShell>
    );
  }

  return null;
}
