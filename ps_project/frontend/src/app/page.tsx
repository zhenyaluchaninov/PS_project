// This page uses client-side interactivity (toasts), so mark as client.
"use client";

import { LucideIcon, Plug2, Server, Shield } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const cards: CardProps[] = [
  {
    title: "Frontend dev server",
    description: "Next.js App Router + TypeScript at http://localhost:3000",
    icon: Plug2,
  },
  {
    title: "API proxy",
    description: "Calls to /api/* are forwarded to the Go backend container.",
    icon: Server,
  },
  {
    title: "Uploads",
    description: "/upload/* rewrites to backend for legacy media handling.",
    icon: Shield,
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-10 shadow-[0_20px_120px_-50px_rgba(0,0,0,0.9)] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-accent-strong">
          PS Project
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-foreground">
          New Frontend running
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted">
          This Next.js dev slice is wired for the upcoming migration work.
          Tailwind, shadcn/ui helpers, Zustand, React Query, Tiptap, React Flow,
          emoji-mart, Sonner, and Lucide are already installed.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {cards.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner transition hover:border-accent/60"
            >
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-accent/10 p-2 text-accent-strong">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {title}
                  </p>
                  <p className="text-sm text-muted">{description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              toast.success("Dev slice is up. API proxy points at backend:8080.")
            }
            className={cn(
              "inline-flex items-center gap-2 rounded-full bg-accent-strong px-5 py-2 text-sm font-semibold text-white",
              "shadow-lg shadow-accent/30 transition hover:translate-y-[-1px] hover:shadow-xl"
            )}
          >
            Ping proxy
          </button>
          <Link
            href="/api/images/categories"
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2 text-sm font-semibold text-foreground transition hover:border-accent/60"
          >
            Open /api/images/categories
          </Link>
          <span className="text-xs uppercase tracking-[0.2em] text-muted">
            proxied through Next
          </span>
        </div>
      </div>
    </main>
  );
}
