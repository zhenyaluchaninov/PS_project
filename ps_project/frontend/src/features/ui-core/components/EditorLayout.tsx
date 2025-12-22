/* eslint-disable @next/next/no-img-element */
"use client";
import type { ReactNode } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";

type EditorLayoutProps = {
  graph: ReactNode;
  sidePanel: ReactNode;
  toolbar?: ReactNode;
  className?: string;
};

export default function EditorLayout({
  graph,
  sidePanel,
  toolbar,
  className,
}: EditorLayoutProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-[var(--bg)] text-[var(--text)]",
        className
      )}
    >
      {toolbar ? (
        <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface-2)]/90 px-5 py-3 backdrop-blur">
          {toolbar}
        </div>
      ) : null}
      <PanelGroup direction="horizontal" className="flex-1 min-h-0">
        <Panel
          defaultSize={72}
          minSize={40}
          className="min-h-0 overflow-hidden bg-[var(--surface-2)]"
        >
          {graph}
        </Panel>
        <PanelResizeHandle className="w-1.5 cursor-col-resize bg-[var(--border)] opacity-70 hover:bg-[var(--accent)] hover:opacity-100" />
        <Panel
          defaultSize={28}
          minSize={18}
          maxSize={45}
          className="min-h-0 overflow-hidden bg-[var(--surface)]/95"
        >
          <div className="h-full min-h-0 overflow-y-auto">{sidePanel}</div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
