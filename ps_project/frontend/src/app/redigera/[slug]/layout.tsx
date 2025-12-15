import type { ReactNode } from "react";

export default function EditorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen max-w-screen-xl flex-col px-6 py-10">
        {children}
      </main>
    </div>
  );
}
