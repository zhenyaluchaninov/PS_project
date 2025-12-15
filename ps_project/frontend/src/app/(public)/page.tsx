export default function PublicHomePage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-accent-strong">
          Projekt PS
        </p>
        <h1 className="text-4xl font-semibold leading-tight">
          Public landing (placeholder)
        </h1>
        <p className="max-w-2xl text-base text-muted">
          Public-facing layout stub without editor chrome. Landing content will
          live here while we keep URLs aligned with the legacy site.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-foreground">Player</p>
          <p className="text-sm text-muted">
            Legacy path `/spela/[viewSlug]` maps directly to the player route.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-foreground">Editor</p>
          <p className="text-sm text-muted">
            Editor-only surface lives under `/redigera/[slug]` with a dedicated
            layout.
          </p>
        </div>
      </div>
    </section>
  );
}
