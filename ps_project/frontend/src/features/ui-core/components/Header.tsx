import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface-2)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-sm font-semibold text-[var(--text)]">
          Projekt PS
        </Link>
        <nav className="flex items-center gap-4 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          <Link href="/" className="hover:text-[var(--text)]">
            Home
          </Link>
          <Link href="/spela/demo" className="hover:text-[var(--text)]">
            Play
          </Link>
          <Link href="/redigera/demo" className="hover:text-[var(--text)]">
            Edit
          </Link>
        </nav>
      </div>
    </header>
  );
}
