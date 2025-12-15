"use client";

import Link from "next/link";
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
      <div className="flex flex-1 flex-col gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted">
          Loading editor data…
        </div>
      </div>
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
      <div className="flex flex-1 flex-col gap-6">
        <div className="space-y-3 rounded-2xl border border-red-400/40 bg-red-500/10 p-6 text-red-100">
          <p className="text-sm font-semibold">
            {isNotFound
              ? "Adventure not found"
              : isUnauthorized
                ? "Unauthorized / login required"
                : "Could not load adventure"}
          </p>
          <p className="mt-1 text-sm opacity-90">
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
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:border-white"
          >
            Till startsidan
          </Link>
        </div>
      </div>
    );
  }

  if (status === "ready" && adventure) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-accent-strong">
              Editor route
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">
              {adventure.title}
            </h1>
            <p className="mt-1 text-sm text-muted">
              edit slug:{" "}
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-foreground">
                {editSlug}
              </span>
            </p>
            <p className="text-sm text-muted">
              view slug:{" "}
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-foreground">
                {adventure.viewSlug}
              </span>
            </p>
          </div>
          <span className="rounded-full bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Dirty: {dirty ? "true" : "false"}
          </span>
        </header>
        <p className="text-xs text-muted">
          This route expects the edit slug (`slug`) in the URL. View slug from payload is shown for reference.
        </p>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <section className="min-h-[320px] rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm font-semibold text-foreground">Graph area</p>
            <p className="mt-2 text-sm text-muted">
              Nodes:{" "}
              <span className="font-semibold text-foreground">
                {adventure.nodes.length}
              </span>
            </p>
            <p className="text-sm text-muted">
              Links:{" "}
              <span className="font-semibold text-foreground">
                {adventure.links.length}
              </span>
            </p>
          </section>

          <aside className="min-h-[320px] rounded-2xl border border-white/10 bg-white/5 p-6 space-y-2">
            <p className="text-sm font-semibold text-foreground">Panel area</p>
            <p className="text-sm text-muted">
              Title:{" "}
              <span className="font-semibold text-foreground">
                {adventure.title}
              </span>
            </p>
            <p className="text-sm text-muted">
              Edit version:{" "}
              <span className="font-semibold text-foreground">
                {editVersion ?? "n/a"}
              </span>
            </p>
            <p className="text-sm text-muted">
              Dirty:{" "}
              <span className="font-semibold text-foreground">
                {dirty ? "true" : "false"}
              </span>
            </p>
          </aside>
        </div>
      </div>
    );
  }

  return null;
}
