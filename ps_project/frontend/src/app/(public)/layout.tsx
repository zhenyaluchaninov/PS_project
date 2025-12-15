import type { ReactNode } from "react";
import { Header } from "@/features/ui-core/components/Header";
import { Footer } from "@/features/ui-core/components/Footer";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
      </main>

      <Footer />
    </div>
  );
}
