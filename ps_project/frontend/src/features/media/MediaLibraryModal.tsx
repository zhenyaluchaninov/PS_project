"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/features/ui-core/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/features/ui-core/primitives/dialog";
import { toastError } from "@/features/ui-core/toast";
import {
  loadImageById,
  loadImageCategories,
  loadImagesInCategory,
  type ImageCategoryDto,
  type ImageDto,
} from "@/features/state/api/images";

type MediaLibraryModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (image: ImageDto) => void;
  initialCategoryId?: number | null;
};

type LoadStatus = "idle" | "loading" | "ready" | "error";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function MediaLibraryModal({
  open,
  onOpenChange,
  onSelect,
  initialCategoryId,
}: MediaLibraryModalProps) {
  const [categories, setCategories] = useState<ImageCategoryDto[]>([]);
  const [categoriesStatus, setCategoriesStatus] = useState<LoadStatus>("idle");
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    initialCategoryId ?? null
  );
  const [images, setImages] = useState<ImageDto[]>([]);
  const [imagesStatus, setImagesStatus] = useState<LoadStatus>("idle");
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectingImageId, setSelectingImageId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let shouldLoad = false;
    setCategoriesStatus((prev) => {
      if (prev !== "idle") return prev;
      shouldLoad = true;
      return "loading";
    });
    if (!shouldLoad) return;
    let active = true;
    loadImageCategories()
      .then((list) => {
        if (!active) return;
        setCategories(list);
        setCategoriesStatus("ready");
        setCategoriesError(null);
      })
      .catch((error) => {
        if (!active) return;
        setCategories([]);
        setCategoriesStatus("error");
        setCategoriesError(
          getErrorMessage(error, "Unable to load image categories.")
        );
      });
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (initialCategoryId == null) return;
    setSelectedCategoryId(initialCategoryId);
  }, [initialCategoryId, open]);

  useEffect(() => {
    if (!categories.length) return;
    setSelectedCategoryId((prev) => {
      if (prev && categories.some((category) => category.id === prev)) {
        return prev;
      }
      if (
        initialCategoryId &&
        categories.some((category) => category.id === initialCategoryId)
      ) {
        return initialCategoryId;
      }
      return categories[0]?.id ?? null;
    });
  }, [categories, initialCategoryId]);

  useEffect(() => {
    if (!open) return;
    if (!selectedCategoryId) {
      setImages([]);
      setImagesStatus("idle");
      setImagesError(null);
      return;
    }
    let active = true;
    setImagesStatus("loading");
    setImagesError(null);
    loadImagesInCategory(selectedCategoryId)
      .then((list) => {
        if (!active) return;
        setImages(list);
        setImagesStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        setImages([]);
        setImagesStatus("error");
        setImagesError(getErrorMessage(error, "Unable to load images."));
      });
    return () => {
      active = false;
    };
  }, [open, selectedCategoryId]);

  useEffect(() => {
    if (!open) {
      setSelectingImageId(null);
    }
  }, [open]);

  const filteredImages = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return images;
    return images.filter((image) => {
      const title = (image.title ?? "").toLowerCase();
      const author = (image.author ?? "").toLowerCase();
      return title.includes(normalized) || author.includes(normalized);
    });
  }, [images, query]);

  const handleRetryCategories = useCallback(() => {
    setCategoriesStatus("loading");
    loadImageCategories({ force: true })
      .then((list) => {
        setCategories(list);
        setCategoriesStatus("ready");
        setCategoriesError(null);
      })
      .catch((error) => {
        setCategories([]);
        setCategoriesStatus("error");
        setCategoriesError(
          getErrorMessage(error, "Unable to load image categories.")
        );
      });
  }, []);

  const handleRetryImages = useCallback(() => {
    if (!selectedCategoryId) return;
    setImagesStatus("loading");
    loadImagesInCategory(selectedCategoryId, { force: true })
      .then((list) => {
        setImages(list);
        setImagesStatus("ready");
        setImagesError(null);
      })
      .catch((error) => {
        setImages([]);
        setImagesStatus("error");
        setImagesError(getErrorMessage(error, "Unable to load images."));
      });
  }, [selectedCategoryId]);

  const handleSelectImage = useCallback(
    async (image: ImageDto) => {
      if (selectingImageId != null) return;
      setSelectingImageId(image.id);
      try {
        const fullImage = await loadImageById(image.id);
        onSelect(fullImage);
        onOpenChange(false);
      } catch (error) {
        toastError(
          "Image selection failed",
          getErrorMessage(error, "Unable to load image details.")
        );
      } finally {
        setSelectingImageId(null);
      }
    },
    [onOpenChange, onSelect, selectingImageId]
  );

  const categoryHelper =
    categoriesStatus === "loading"
      ? "Loading categories..."
      : categoriesStatus === "error"
        ? categoriesError ?? "Unable to load categories."
        : categories.length === 0
          ? "Image bank is empty (no categories synced)."
          : null;

  const totalLabel =
    imagesStatus === "ready"
      ? `${filteredImages.length} of ${images.length} images`
      : categoriesStatus === "ready" && categories.length === 0
        ? "Image bank empty"
        : "Browse images";
  const emptyLabel =
    images.length === 0
      ? "No images available in this category."
      : "No images match your search.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl overflow-hidden p-0">
        <div className="flex max-h-[85vh] flex-col">
          <div className="border-b border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-4">
            <DialogHeader className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <DialogTitle>Media Library</DialogTitle>
                  <DialogDescription>
                    Browse curated Unsplash categories and choose an image.
                  </DialogDescription>
                </div>
                <div className="w-full sm:w-60">
                  <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                    Category
                  </label>
                  <select
                    value={selectedCategoryId ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      if (!raw) {
                        setSelectedCategoryId(null);
                        return;
                      }
                      const next = Number(raw);
                      if (!Number.isFinite(next)) return;
                      setSelectedCategoryId(next);
                    }}
                    disabled={categoriesStatus !== "ready" || categories.length === 0}
                    className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)] disabled:cursor-not-allowed disabled:text-[var(--muted)]"
                  >
                    {categoriesStatus !== "ready" ? (
                      <option value="">
                        {categoriesStatus === "loading"
                          ? "Loading categories..."
                          : "Categories unavailable"}
                      </option>
                    ) : null}
                    {categoriesStatus === "ready" && categories.length === 0 ? (
                      <option value="">No categories</option>
                    ) : null}
                    {categoriesStatus === "ready"
                      ? categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.title}
                          </option>
                        ))
                      : null}
                  </select>
                  {categoryHelper ? (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {categoryHelper}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                    aria-hidden="true"
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by title or author"
                    disabled={categoriesStatus !== "ready" || categories.length === 0}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] py-2 pl-9 pr-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                  />
                </div>
                {imagesStatus === "error" ? (
                  <Button size="sm" variant="outline" onClick={handleRetryImages}>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Retry images
                  </Button>
                ) : null}
              </div>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto bg-[var(--bg)] px-6 py-4">
            {categoriesStatus === "loading" ? (
              <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading categories...
              </div>
            ) : null}
            {categoriesStatus === "error" ? (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                <p className="text-sm font-semibold text-[var(--text)]">
                  Categories unavailable
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {categoriesError ?? "Unable to load image categories."}
                </p>
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={handleRetryCategories}>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Retry categories
                  </Button>
                </div>
              </div>
            ) : null}
            {categoriesStatus === "ready" && !selectedCategoryId ? (
              <div className="text-sm text-[var(--muted)]">
                {categories.length === 0
                  ? "No image bank categories are available."
                  : "Select a category to view images."}
              </div>
            ) : null}
            {categoriesStatus === "ready" && categories.length === 0 ? (
              <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-xs text-[var(--muted)]">
                This library is populated from curated Unsplash categories and does
                not include your uploaded node images/videos.
              </div>
            ) : null}
            {categoriesStatus === "ready" && selectedCategoryId ? (
              <>
                {imagesStatus === "loading" ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Loading images...
                  </div>
                ) : null}
                {imagesStatus === "error" ? (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                    <p className="text-sm font-semibold text-[var(--text)]">
                      Images unavailable
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {imagesError ?? "Unable to load images."}
                    </p>
                    <div className="mt-3">
                      <Button size="sm" variant="outline" onClick={handleRetryImages}>
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        Retry images
                      </Button>
                    </div>
                  </div>
                ) : null}
                {imagesStatus === "ready" && filteredImages.length === 0 ? (
                  <div className="text-sm text-[var(--muted)]">
                    {emptyLabel}
                  </div>
                ) : null}
                {imagesStatus === "ready" && filteredImages.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredImages.map((image) => {
                      const title =
                        image.title?.trim() || `Image ${image.id}`;
                      const author = image.author?.trim() || "Unknown author";
                      const isSelecting = selectingImageId === image.id;
                      const thumbnail = image.thumb_url || image.full_url;
                      return (
                        <button
                          key={image.id}
                          type="button"
                          onClick={() => handleSelectImage(image)}
                          disabled={selectingImageId != null}
                          aria-pressed={isSelecting}
                          className={cn(
                            "group relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-left transition",
                            "hover:border-[var(--border-light)] hover:bg-[var(--bg-hover)]",
                            isSelecting &&
                              "border-[var(--accent)] ring-2 ring-[var(--accent-muted)]"
                          )}
                        >
                          <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--bg)]">
                            {thumbnail ? (
                              <img
                                src={thumbnail}
                                alt={title}
                                className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">
                                No preview
                              </div>
                            )}
                          </div>
                          <div className="space-y-1 px-3 py-2">
                            <p className="truncate text-sm font-medium text-[var(--text-secondary)]">
                              {title}
                            </p>
                            <p className="truncate text-xs text-[var(--muted)]">
                              {author}
                            </p>
                          </div>
                          {isSelecting ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[var(--text)]">
                              <Loader2
                                className="h-5 w-5 animate-spin"
                                aria-hidden="true"
                              />
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-3">
            <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              {totalLabel}
            </span>
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
