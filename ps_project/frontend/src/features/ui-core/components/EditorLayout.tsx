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
        <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface-2)]/80 px-4 py-3 backdrop-blur">
          {toolbar}
        </div>
      ) : null}
      <div className="flex-1 min-h-0 p-4">
        <PanelGroup
          direction="horizontal"
          className="h-full min-h-0 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/70"
        >
          <Panel defaultSize={65} minSize={40} className="min-h-0 overflow-auto p-4">
            {graph}
          </Panel>
          <PanelResizeHandle className="w-1.5 cursor-col-resize bg-[var(--border)]" />
          <Panel
            defaultSize={35}
            minSize={25}
            className="min-h-0 overflow-auto border-l border-[var(--border)] bg-[var(--surface)] p-4"
          >
            {sidePanel}
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
