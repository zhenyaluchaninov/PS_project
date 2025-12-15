import type { ReactNode } from "react";

export default function EditorShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
