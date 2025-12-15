type PlayerPageProps = {
  params: { viewSlug: string };
};

export default function PlayerPage({ params }: PlayerPageProps) {
  const { viewSlug } = params;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-12">
      <p className="text-xs uppercase tracking-[0.22em] text-accent-strong">
        Player route
      </p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight">/spela</h1>
      <p className="mt-4 text-base text-muted">
        Dynamic view slug:
        <span className="ml-2 rounded-full bg-white/5 px-3 py-1 text-sm font-semibold text-foreground">
          {viewSlug}
        </span>
      </p>
      <p className="mt-2 text-sm text-muted">
        Placeholder UI - adventure loading will be added in a later step.
      </p>
    </main>
  );
}
