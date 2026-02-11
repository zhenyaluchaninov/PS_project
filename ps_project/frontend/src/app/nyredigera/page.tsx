"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { EditorRoute } from "@/features/editor/ui/EditorRoute";

const EDITOR_BASE_SEGMENT = "nyredigera";

type SearchParamsLike = {
  get: (key: string) => string | null;
};

function extractSlugFromPathname(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const editorSegmentIndex = segments.findIndex(
    (segment) => segment.toLowerCase() === EDITOR_BASE_SEGMENT
  );
  if (editorSegmentIndex < 0) return "";

  const rawSlug = segments[editorSegmentIndex + 1];
  if (!rawSlug) return "";

  try {
    return decodeURIComponent(rawSlug).trim();
  } catch {
    return rawSlug.trim();
  }
}

function extractSlugFromQuery(searchParams: SearchParamsLike | null): string {
  if (!searchParams) return "";
  const querySlug = searchParams.get("slug") ?? searchParams.get("id");
  return querySlug?.trim() ?? "";
}

export default function NewEditorPage() {
  const pathname = usePathname() ?? "";

  const editSlug = useMemo(() => {
    const fromPath = extractSlugFromPathname(pathname);
    if (fromPath) return fromPath;
    if (typeof window === "undefined") return "";
    return extractSlugFromQuery(new URLSearchParams(window.location.search));
  }, [pathname]);

  if (!editSlug) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-sm text-[var(--muted)]">
        Missing editor slug. Open this page via <code>/nyredigera/&lt;slug&gt;</code>.
      </div>
    );
  }

  return <EditorRoute editSlug={editSlug} />;
}
