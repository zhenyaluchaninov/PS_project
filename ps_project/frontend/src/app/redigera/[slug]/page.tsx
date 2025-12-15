type EditorPageProps = {
  params: { slug: string };
};

export default function EditorPage({ params }: EditorPageProps) {
  const { slug } = params;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-accent-strong">
            Editor route
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight">
            /redigera
          </h1>
          <p className="mt-1 text-sm text-muted">
            Slug:{" "}
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-foreground">
              {slug}
            </span>
          </p>
        </div>
        <span className="rounded-full bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Editor-only layout
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <section className="min-h-[320px] rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm font-semibold text-foreground">Graph area</p>
          <p className="mt-2 text-sm text-muted">
            Placeholder for the editor canvas/graph area.
          </p>
        </section>

        <aside className="min-h-[320px] rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm font-semibold text-foreground">Panel area</p>
          <p className="mt-2 text-sm text-muted">
            Placeholder for node or adventure settings.
          </p>
        </aside>
      </div>
    </div>
  );
}
