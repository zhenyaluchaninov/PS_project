import type { ReactNode } from "react";
import "@xyflow/react/dist/style.css";
import { EditorScrollLock } from "./EditorScrollLock";

export default function EditorShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <EditorScrollLock />
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
