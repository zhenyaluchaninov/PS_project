import type { ReactNode } from "react";
import "reactflow/dist/style.css";

export default function EditorShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--bg)] text-[var(--text)]">
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
