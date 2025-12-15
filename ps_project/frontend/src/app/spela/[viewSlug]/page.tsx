import {
  API_BASE_URL,
  ApiError,
  isApiError,
  resolveApiUrl,
} from "@/features/state/api/client";
import { loadAdventure } from "@/features/state/api/adventures";
import { notFound } from "next/navigation";

type PlayerPageProps = {
  params: { viewSlug: string };
};

export default async function PlayerPage({ params }: PlayerPageProps) {
  try {
    const adventure = await loadAdventure(params.viewSlug, "play");

    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-12">
        <p className="text-xs uppercase tracking-[0.22em] text-accent-strong">
          Player route
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight">
          {adventure.title}
        </h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-foreground">
              Slugs (view/edit)
            </p>
            <p className="mt-1 text-sm text-muted">
              view_slug:{" "}
              <span className="font-semibold text-foreground">
                {adventure.viewSlug}
              </span>
            </p>
            <p className="text-sm text-muted">
              slug:{" "}
              <span className="font-semibold text-foreground">
                {adventure.slug || "n/a"}
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-foreground">Graph</p>
            <p className="mt-1 text-sm text-muted">
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
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">
          Data fetched via validated API client (mode: play).
        </p>
      </main>
    );
  } catch (error) {
    if (isApiError(error) && error.status === 404) {
      notFound();
    }

    const apiBase = API_BASE_URL || "relative via Next rewrite (/api)";
    const attemptedUrl = isApiError(error) && error.url
      ? error.url
      : resolveApiUrl(`/api/adventure/${params.viewSlug}`);

    const message =
      error instanceof ApiError
        ? `${error.status}: ${error.message}`
        : "Failed to load adventure.";

    const detail =
      error instanceof ApiError && error.details
        ? typeof error.details === "string"
          ? error.details
          : JSON.stringify(error.details, null, 2)
        : null;

    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-12">
        <div className="space-y-3 rounded-2xl border border-red-400/40 bg-red-500/10 p-6 text-red-100">
          <p className="text-sm font-semibold">Could not load adventure</p>
          <p className="mt-1 text-sm opacity-90">{message}</p>
          <div className="rounded-lg bg-black/30 p-3 text-xs leading-relaxed text-red-50">
            <p>API base: <span className="font-semibold">{apiBase}</span></p>
            <p>Request URL: <span className="font-semibold">{attemptedUrl}</span></p>
            {isApiError(error) ? (
              <p>Status: <span className="font-semibold">{error.status}</span></p>
            ) : null}
            {detail ? (
              <pre className="mt-2 whitespace-pre-wrap break-words">
                {detail}
              </pre>
            ) : null}
          </div>
        </div>
      </main>
    );
  }
}
