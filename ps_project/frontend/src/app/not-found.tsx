import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-start justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold">Sidan hittades inte</h1>
      <p className="mt-3 text-sm text-muted">
        Den efterfragade resursen saknas eller har flyttats.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent-strong"
      >
        Till startsidan
      </Link>
    </main>
  );
}
