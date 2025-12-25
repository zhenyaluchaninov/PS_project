import type { ReactNode } from "react";

type InspectorShellProps = {
  title: string;
  subtitle?: ReactNode | null;
  meta?: string | null;
  children: ReactNode;
};

export function InspectorShell({ title, subtitle, meta, children }: InspectorShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-[var(--border)] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold text-[var(--text)]">
              {title}
            </p>
            {subtitle ? (
              <div className="text-xs text-[var(--muted)]">{subtitle}</div>
            ) : null}
          </div>
          {meta ? (
            <span className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[10px] font-mono text-[var(--muted)]">
              {meta}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex-1 space-y-4 px-4 py-4 text-sm text-[var(--text)]">
        {children}
      </div>
    </div>
  );
}
