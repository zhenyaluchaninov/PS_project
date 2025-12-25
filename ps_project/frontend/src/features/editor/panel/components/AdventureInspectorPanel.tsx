"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AdventureModel, CategoryModel } from "@/domain/models";
import { loadCategories } from "@/features/state/api";
import { LabelValue } from "@/features/ui-core/LabelValue";
import { useEditorStore } from "@/features/editor/state/editorStore";
import { cn } from "@/lib/utils";
import { InspectorShell } from "./InspectorShell";

type AdventureInspectorPanelProps = {
  adventure: AdventureModel;
};

export function AdventureInspectorPanel({
  adventure,
}: AdventureInspectorPanelProps) {
  const updateAdventureFields = useEditorStore((s) => s.updateAdventureFields);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [categoriesStatus, setCategoriesStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setCategoriesStatus("loading");
    loadCategories()
      .then((list) => {
        if (!active) return;
        setCategories(list);
        setCategoriesStatus("ready");
        setCategoriesError(null);
      })
      .catch((err) => {
        if (!active) return;
        setCategories([]);
        setCategoriesStatus("error");
        setCategoriesError(
          err instanceof Error ? err.message : "Unable to load categories."
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const categoryOptions = useMemo(() => {
    if (!categories.length) {
      return adventure.category ? [adventure.category] : [];
    }
    if (
      adventure.category &&
      !categories.some((category) => category.id === adventure.category?.id)
    ) {
      return [adventure.category, ...categories];
    }
    return categories;
  }, [adventure.category, categories]);

  const selectedCategoryId = adventure.category
    ? String(adventure.category.id)
    : "";
  const categoryDisabled =
    categoriesStatus === "loading" ||
    categoriesStatus === "error" ||
    categoryOptions.length === 0;
  const categoryHelper =
    categoriesStatus === "loading"
      ? "Loading categories..."
      : categoriesStatus === "error"
        ? categoriesError ?? "Unable to load categories."
        : categoryOptions.length === 0
          ? "No categories available."
          : null;

  return (
    <InspectorShell
      title="Adventure settings"
      subtitle={null}
      meta={`#${adventure.id}`}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
            Title
          </label>
          <input
            type="text"
            value={adventure.title ?? ""}
            onChange={(event) =>
              updateAdventureFields({ title: event.target.value })
            }
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
            Description
          </label>
          <textarea
            value={adventure.description ?? ""}
            onChange={(event) =>
              updateAdventureFields({ description: event.target.value })
            }
            rows={4}
            className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
            Category
          </label>
          <select
            value={selectedCategoryId}
            onChange={(event) => {
              const rawValue = event.target.value;
              if (!rawValue) {
                updateAdventureFields({ category: null });
                return;
              }
              const nextId = Number(rawValue);
              if (!Number.isFinite(nextId)) return;
              const nextCategory =
                categoryOptions.find((category) => category.id === nextId) ??
                null;
              updateAdventureFields({ category: nextCategory });
            }}
            disabled={categoryDisabled}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)] disabled:cursor-not-allowed disabled:text-[var(--muted)]"
          >
            {!adventure.category && categoryOptions.length ? (
              <option value="" disabled>
                Select category
              </option>
            ) : null}
            {categoryOptions.length ? (
              categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.title}
                </option>
              ))
            ) : (
              <option value="">No categories available</option>
            )}
          </select>
          {categoryHelper ? (
            <p className="text-xs text-[var(--muted)]">{categoryHelper}</p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Nodes" value={adventure.nodes.length} />
        <StatCard label="Links" value={adventure.links.length} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard label="Edit slug" value={adventure.slug || "n/a"} />
        <InfoCard label="View slug" value={adventure.viewSlug || "n/a"} />
      </div>
    </InspectorShell>
  );
}

function InfoCard({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2",
        className
      )}
    >
      <LabelValue label={label} value={value} className="gap-1" />
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text)]">
        {value}
      </p>
    </div>
  );
}
