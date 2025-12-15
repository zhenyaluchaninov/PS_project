"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL, resolveApiUrl } from "@/features/state/api/client";
import {
  selectEditorAdventure,
  selectEditorDirty,
  selectEditorEditVersion,
  selectEditorError,
  selectEditorStatus,
  useEditorStore,
} from "../state/editorStore";
import { LabelValue } from "@/ui-core/LabelValue";
import { Panel } from "@/ui-core/Panel";
import { SectionTitle } from "@/ui-core/SectionTitle";
import { Toolbar } from "@/ui-core/Toolbar";
import EditorLayout from "@/features/ui-core/components/EditorLayout";

type EditorRouteProps = {
  editSlug: string;
};

type InspectorTab = "empty" | "node" | "link";

export function EditorRoute({ editSlug }: EditorRouteProps) {
  const status = useEditorStore(selectEditorStatus);
  const adventure = useEditorStore(selectEditorAdventure);
  const error = useEditorStore(selectEditorError);
  const dirty = useEditorStore(selectEditorDirty);
  const editVersion = useEditorStore(selectEditorEditVersion);
  const loadByEditSlug = useEditorStore((s) => s.loadByEditSlug);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("empty");

  useEffect(() => {
    void loadByEditSlug(editSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSlug]);

  useEffect(() => {
    setInspectorTab("empty");
  }, [editSlug]);

  const toolbar = useMemo(
    () => (
      <Toolbar>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Editor
        </span>
        <span className="text-xs text-[var(--muted)]">
          /redigera/<span className="font-mono">{editSlug}</span>
        </span>
      </Toolbar>
    ),
    [editSlug]
  );

  if (status === "loading" || status === "idle") {
    return (
      <EditorLayout
        toolbar={toolbar}
        graph={
          <Panel title="Graph area (placeholder)">
            <p className="text-sm text-[var(--muted)]">Loading editor data…</p>
          </Panel>
        }
        sidePanel={
          <Panel title="Inspector" muted>
            <p className="text-sm text-[var(--muted)]">Loading…</p>
          </Panel>
        }
      />
    );
  }

  if (status === "error" && error) {
    const apiBase = API_BASE_URL || "relative via Next rewrite (/api)";
    const attemptedUrl =
      error.url ?? resolveApiUrl(`/api/adventure/${editSlug}/edit`);
    const detail =
      typeof error.details === "string"
        ? error.details
        : error.details
          ? JSON.stringify(error.details, null, 2)
          : null;
    const isNotFound = error.status === 404;
    const isUnauthorized = error.status === 401 || error.status === 403;

    return (
      <EditorLayout
        toolbar={toolbar}
        graph={
          <Panel title="Graph area (placeholder)">
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
        }
        sidePanel={
          <Panel title="Inspector" muted>
            <p className="text-sm text-[var(--muted)]">
              {isUnauthorized
                ? "Log in required to load edit mode."
                : isNotFound
                  ? "Nothing to inspect."
                  : "Error state."}
            </p>
          </Panel>
        }
      />
    );
  }

  if (status === "ready" && adventure) {
    const tabButton = (tab: InspectorTab, label: string) => {
      const active = inspectorTab === tab;
      return (
        <button
          type="button"
          onClick={() => setInspectorTab(tab)}
          className={[
            "rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition",
            active
              ? "bg-[var(--surface)] text-[var(--text)]"
              : "text-[var(--muted)] hover:text-[var(--text)]",
          ].join(" ")}
        >
          {label}
        </button>
      );
    };

    return (
      <EditorLayout
        toolbar={toolbar}
        graph={
          <Panel title="Graph area (placeholder)">
            <p className="text-sm text-[var(--muted)]">
              ReactFlow graph will be mounted here in Step 10.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <LabelValue label="Nodes" value={adventure.nodes.length} />
              <LabelValue label="Links" value={adventure.links.length} />
            </div>
          </Panel>
        }
        sidePanel={
          <div className="flex h-full min-h-0 flex-col gap-4">
            <Panel title="Inspector" muted className="flex min-h-0 flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1">
                  <div className="flex items-center gap-1">
                    {tabButton("empty", "Empty")}
                    {tabButton("node", "Node")}
                    {tabButton("link", "Link")}
                  </div>
                </div>
                <span className="text-xs text-[var(--muted)]">
                  Placeholder tabs (selection wiring later)
                </span>
              </div>

              <div className="mt-4 flex-1 min-h-0 overflow-auto">
                {inspectorTab === "empty" ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[var(--text)]">
                      Nothing selected
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      Select a node or link in the graph to inspect it.
                    </p>
                  </div>
                ) : null}
                {inspectorTab === "node" ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[var(--text)]">
                      Node view placeholder
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      Node inspector UI will live here.
                    </p>
                  </div>
                ) : null}
                {inspectorTab === "link" ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[var(--text)]">
                      Link view placeholder
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      Link inspector UI will live here.
                    </p>
                  </div>
                ) : null}
              </div>
            </Panel>

            <Panel title="Adventure" className="bg-[var(--surface)]/90">
              <SectionTitle
                title="Loaded"
                subtitle="Edit slug required; view slug shown for reference."
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <LabelValue label="Title" value={adventure.title} />
                <LabelValue label="Dirty" value={dirty ? "true" : "false"} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <LabelValue label="Edit slug" value={editSlug} />
                <LabelValue label="View slug" value={adventure.viewSlug} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <LabelValue label="Edit version" value={editVersion ?? "n/a"} />
                <LabelValue label="Nodes" value={adventure.nodes.length} />
              </div>
            </Panel>
          </div>
        }
      />
    );
  }

  return null;
}

