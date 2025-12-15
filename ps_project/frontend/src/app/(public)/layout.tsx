import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto max-w-5xl text-sm font-semibold uppercase tracking-[0.18em] text-muted">
          Public header (placeholder)
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
      </main>

      <footer className="border-t border-white/10 px-6 py-4 text-sm text-muted">
        <div className="mx-auto max-w-5xl">Public footer (placeholder)</div>
      </footer>
    </div>
  );
}
