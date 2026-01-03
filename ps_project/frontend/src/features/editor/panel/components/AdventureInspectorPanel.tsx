"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Crosshair, Loader2, Trash2, Upload } from "lucide-react";
import type { AdventureModel, CategoryModel } from "@/domain/models";
import { loadCategories } from "@/features/state/api";
import { deleteMedia, uploadMedia } from "@/features/state/api/media";
import { toastError } from "@/features/ui-core/toast";
import {
  selectEditorMenuShortcutPickIndex,
  selectEditorReadOnly,
  useEditorStore,
} from "@/features/editor/state/editorStore";
import { Button } from "@/features/ui-core/primitives/button";
import { cn } from "@/lib/utils";
import { getFontMeta, stripMediaUrl } from "@/lib/fonts";
import { CollapsibleSection } from "./CollapsibleSection";
import { InspectorShell } from "./InspectorShell";

const MENU_OPTION_VALUES = ["back", "home", "menu", "sound"] as const;

const MENU_OPTION_LABELS: Record<(typeof MENU_OPTION_VALUES)[number], string> = {
  back: "Back",
  home: "Home",
  menu: "Menu",
  sound: "Sound",
};

type MenuShortcutEntry = Record<string, unknown> & {
  nodeId: string;
  text: string;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readMenuOptions = (props?: Record<string, unknown> | null): string[] => {
  if (!props) return [...MENU_OPTION_VALUES];
  const raw = props.menu_option ?? props.menuOption ?? props.menu_options;
  if (raw === undefined || raw === null) return [...MENU_OPTION_VALUES];

  let values: string[] = [];
  if (Array.isArray(raw)) {
    values = raw.filter((item): item is string => typeof item === "string");
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed === "all") return [...MENU_OPTION_VALUES];
    values = [trimmed];
  }

  return MENU_OPTION_VALUES.filter((value) => values.includes(value));
};

const readMenuSoundOverride = (props?: Record<string, unknown> | null): boolean => {
  if (!props) return true;
  const raw = props.menu_sound_override ?? props.menuSoundOverride;
  if (raw === undefined || raw === null) return true;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (!normalized) return true;
    return ["1", "true", "yes", "on"].includes(normalized);
  }
  return true;
};

const normalizeMenuShortcutNodeId = (value: unknown): string => {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.startsWith("#") ? trimmed.slice(1).trim() : trimmed;
  }
  return "";
};

const readMenuShortcuts = (props?: Record<string, unknown> | null): MenuShortcutEntry[] => {
  const raw = props?.menu_shortcuts ?? props?.menuShortcuts;
  const list = Array.isArray(raw) ? raw : [];
  return Array.from({ length: 9 }, (_, index) => {
    const entry = isPlainRecord(list[index]) ? list[index] : {};
    const nodeValue =
      entry.nodeId ?? entry.node_id ?? entry.nodeID ?? entry.nodeid;
    const nodeId = normalizeMenuShortcutNodeId(nodeValue);
    const text = typeof entry.text === "string" ? entry.text : "";
    return { ...entry, nodeId, text };
  });
};

const readFontList = (props?: Record<string, unknown> | null): string[] => {
  if (!props) return [];
  const raw = props.font_list ?? props.fontList;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string");
};

const getMediaBasename = (url: string) => {
  const trimmed = stripMediaUrl(url);
  const parts = trimmed.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
};

const isUploadMediaUrl = (url: string) => {
  const trimmed = stripMediaUrl(url);
  if (!trimmed) return false;
  if (trimmed.startsWith("/upload/")) return true;
  return trimmed.includes("/upload/");
};

type AdventureInspectorPanelProps = {
  adventure: AdventureModel;
};

export function AdventureInspectorPanel({
  adventure,
}: AdventureInspectorPanelProps) {
  const updateAdventureFields = useEditorStore((s) => s.updateAdventureFields);
  const updateAdventureProps = useEditorStore((s) => s.updateAdventureProps);
  const updateAdventureCover = useEditorStore((s) => s.updateAdventureCover);
  const menuShortcutPickIndex = useEditorStore(selectEditorMenuShortcutPickIndex);
  const readOnly = useEditorStore(selectEditorReadOnly);
  const startMenuShortcutPick = useEditorStore((s) => s.startMenuShortcutPick);
  const cancelMenuShortcutPick = useEditorStore((s) => s.cancelMenuShortcutPick);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [categoriesStatus, setCategoriesStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [extraShortcutSlots, setExtraShortcutSlots] = useState<number[]>([]);
  const fontInputRef = useRef<HTMLInputElement | null>(null);
  const [fontUploading, setFontUploading] = useState(false);
  const [fontRemoving, setFontRemoving] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverRemoving, setCoverRemoving] = useState(false);

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

  useEffect(() => {
    setExtraShortcutSlots([]);
  }, [adventure.id]);

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

  const adventureProps = adventure.props as Record<string, unknown> | null | undefined;
  const menuOptions = useMemo(
    () => readMenuOptions(adventureProps ?? null),
    [adventureProps]
  );
  const menuSoundOverride = useMemo(
    () => readMenuSoundOverride(adventureProps ?? null),
    [adventureProps]
  );
  const menuShortcuts = useMemo(
    () => readMenuShortcuts(adventureProps ?? null),
    [adventureProps]
  );
  const fontList = useMemo(
    () => readFontList(adventureProps ?? null),
    [adventureProps]
  );
  const coverUrl = adventure.coverUrl?.trim() ?? "";
  const coverImageId = adventure.imageId ?? null;
  const coverLabel = coverUrl ? getMediaBasename(coverUrl) : "";
  const coverIsUpload = coverUrl ? isUploadMediaUrl(coverUrl) : false;
  const hasCover = Boolean(coverUrl || coverImageId);
  const nodeById = useMemo(() => {
    const map = new Map<number, AdventureModel["nodes"][number]>();
    adventure.nodes.forEach((node) => map.set(node.nodeId, node));
    return map;
  }, [adventure.nodes]);
  const visibleShortcutIndexes = useMemo(() => {
    const next = new Set<number>();
    next.add(0);
    menuShortcuts.forEach((shortcut, index) => {
      if (index === 0) return;
      const hasContent =
        Boolean(shortcut.nodeId?.trim()) || Boolean(shortcut.text?.trim());
      if (hasContent) {
        next.add(index);
      }
    });
    extraShortcutSlots.forEach((index) => {
      if (index >= 1 && index <= 8) {
        next.add(index);
      }
    });
    return next;
  }, [extraShortcutSlots, menuShortcuts]);
  const nextHiddenShortcutIndex = useMemo(() => {
    for (let index = 1; index < menuShortcuts.length; index += 1) {
      if (!visibleShortcutIndexes.has(index)) {
        return index;
      }
    }
    return null;
  }, [menuShortcuts.length, visibleShortcutIndexes]);

  const handleMenuOptionToggle = (value: (typeof MENU_OPTION_VALUES)[number]) => {
    const hasValue = menuOptions.includes(value);
    const nextValues = hasValue
      ? menuOptions.filter((option) => option !== value)
      : [...menuOptions, value];
    const ordered = MENU_OPTION_VALUES.filter((option) =>
      nextValues.includes(option)
    );
    updateAdventureProps({ menu_option: ordered });
  };

  const handleMenuSoundOverrideChange = (next: boolean) => {
    updateAdventureProps({ menu_sound_override: next });
  };

  const updateMenuShortcut = (
    index: number,
    updates: Partial<MenuShortcutEntry>
  ) => {
    const nextShortcuts = menuShortcuts.map((shortcut, shortcutIndex) =>
      shortcutIndex === index ? { ...shortcut, ...updates } : shortcut
    );
    updateAdventureProps({ menu_shortcuts: nextShortcuts });
  };

  const handleShortcutNodeIdChange = (index: number, value: string) => {
    const normalized = normalizeMenuShortcutNodeId(value);
    updateMenuShortcut(index, { nodeId: normalized });
  };

  const handleShortcutLabelChange = (index: number, value: string) => {
    updateMenuShortcut(index, { text: value });
  };

  const handleShortcutPickToggle = (index: number) => {
    if (menuShortcutPickIndex === index) {
      cancelMenuShortcutPick();
      return;
    }
    startMenuShortcutPick(index);
  };

  const handleShortcutClear = (index: number) => {
    updateMenuShortcut(index, { nodeId: "", text: "" });
    if (menuShortcutPickIndex === index) {
      cancelMenuShortcutPick();
    }
    if (index > 0) {
      setExtraShortcutSlots((prev) => prev.filter((slot) => slot !== index));
    }
  };

  const handleAddShortcutRow = () => {
    if (nextHiddenShortcutIndex == null) return;
    setExtraShortcutSlots((prev) =>
      prev.includes(nextHiddenShortcutIndex)
        ? prev
        : [...prev, nextHiddenShortcutIndex]
    );
  };

  const handleCoverUploadClick = () => {
    if (coverUploading) return;
    coverInputRef.current?.click();
  };

  const handleCoverFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!adventure.slug) {
      toastError("Cover upload failed", "Missing adventure slug.");
      return;
    }
    setCoverUploading(true);
    const previousUrl = coverUrl;
    try {
      const result = await uploadMedia(adventure.slug, file);
      const url = result?.url;
      if (!url) {
        throw new Error("Upload response missing URL.");
      }
      updateAdventureCover({ coverUrl: url, imageId: null });
      if (previousUrl && previousUrl !== url && isUploadMediaUrl(previousUrl)) {
        const previousHash = getMediaBasename(previousUrl);
        if (previousHash) {
          await deleteMedia(adventure.slug, previousHash);
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to upload cover image.";
      toastError("Cover upload failed", message);
    } finally {
      setCoverUploading(false);
    }
  };

  const handleCoverRemove = async () => {
    if (!hasCover) return;
    if (!adventure.slug) {
      toastError("Cover removal failed", "Missing adventure slug.");
      return;
    }
    setCoverRemoving(true);
    try {
      if (coverUrl && coverIsUpload) {
        const hash = getMediaBasename(coverUrl);
        if (hash) {
          await deleteMedia(adventure.slug, hash);
        }
      }
      updateAdventureCover({
        coverUrl: null,
        imageId: null,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to remove cover image.";
      toastError("Cover removal failed", message);
    } finally {
      setCoverRemoving(false);
    }
  };

  const handleFontUploadClick = () => {
    if (fontUploading) return;
    fontInputRef.current?.click();
  };

  const handleFontFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!adventure.slug) {
      toastError("Font upload failed", "Missing adventure slug.");
      return;
    }
    setFontUploading(true);
    try {
      const result = await uploadMedia(adventure.slug, file);
      const url = result?.url;
      if (!url) {
        throw new Error("Upload response missing URL.");
      }
      const normalized = stripMediaUrl(url);
      const existing = new Set(fontList.map(stripMediaUrl));
      if (!existing.has(normalized)) {
        const nextList = [...fontList, url];
        updateAdventureProps({ font_list: nextList, fontList: nextList });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to upload font.";
      toastError("Font upload failed", message);
    } finally {
      setFontUploading(false);
    }
  };

  const handleFontRemove = async (entry: string) => {
    if (!adventure.slug) {
      toastError("Font removal failed", "Missing adventure slug.");
      return;
    }
    const meta = getFontMeta(entry);
    if (!meta?.fileName) {
      toastError("Font removal failed", "Missing font filename.");
      return;
    }
    const removeKey = stripMediaUrl(entry);
    setFontRemoving(removeKey);
    try {
      await deleteMedia(adventure.slug, meta.fileName);
      const nextList = fontList.filter(
        (item) => stripMediaUrl(item) !== removeKey
      );
      updateAdventureProps({ font_list: nextList, fontList: nextList });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to remove font.";
      toastError("Font removal failed", message);
    } finally {
      setFontRemoving(null);
    }
  };

  const activePickLabel =
    menuShortcutPickIndex == null
      ? null
      : menuShortcutPickIndex === 0
        ? "Home shortcut"
        : `Shortcut ${menuShortcutPickIndex}`;

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
            disabled={readOnly}
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
            disabled={readOnly}
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
            disabled={readOnly || categoryDisabled}
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
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
        <CollapsibleSection title="Cover" sectionKey="editor.adventure.cover">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Cover image
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Used for adventure previews and cards.
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif"
                  onChange={handleCoverFileChange}
                  disabled={readOnly}
                  className="hidden"
                  aria-label="Upload cover image"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCoverUploadClick}
                  disabled={readOnly || coverUploading}
                  aria-label={coverUrl ? "Replace cover image" : "Upload cover image"}
                  title={coverUrl ? "Replace cover image" : "Upload cover image"}
                  className="h-8 w-8"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleCoverRemove}
                  disabled={readOnly || !hasCover || coverRemoving}
                  aria-label="Remove cover image"
                  title="Remove cover image"
                  className="h-8 w-8 text-[var(--danger)] hover:text-[var(--danger)]"
                >
                  {coverRemoving ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] p-3">
              {coverUrl ? (
                <div className="flex flex-wrap items-center gap-3">
                  <img
                    src={coverUrl}
                    alt="Adventure cover"
                    className="h-16 w-24 rounded-md border border-[var(--border)] object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-secondary)]">
                      {coverLabel || "Cover image"}
                    </p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {coverUrl}
                    </p>
                  </div>
                </div>
              ) : coverImageId != null ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                    Image library cover
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Image #{coverImageId}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[var(--muted)]">No cover set.</p>
              )}
            </div>
          </div>
        </CollapsibleSection>
        <CollapsibleSection title="Menu" sectionKey="editor.adventure.menu">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Menu buttons
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {MENU_OPTION_VALUES.map((option) => (
                  <ToggleRow
                    key={option}
                    label={MENU_OPTION_LABELS[option]}
                    checked={menuOptions.includes(option)}
                    onToggle={() => handleMenuOptionToggle(option)}
                    disabled={readOnly}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Sound override
              </p>
              <ToggleRow
                label="Mute sound on menu navigation"
                checked={menuSoundOverride}
                onToggle={handleMenuSoundOverrideChange}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Shortcuts
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Home plus eight menu shortcuts.
                </p>
              </div>
              <div className="space-y-3">
                {menuShortcutPickIndex != null ? (
                  <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--muted)]">
                    {activePickLabel
                      ? `Picking for ${activePickLabel}. Click a node to assign. Esc to cancel.`
                      : "Click a node to assign. Esc to cancel."}
                  </div>
                ) : null}
                {menuShortcuts.map((shortcut, index) => {
                  if (!visibleShortcutIndexes.has(index)) {
                    return null;
                  }
                  const slotLabel =
                    index === 0 ? "Home shortcut" : `Shortcut ${index}`;
                  const nodeValue = shortcut.nodeId;
                  const isPicking = menuShortcutPickIndex === index;
                  const numericId = nodeValue ? Number(nodeValue) : NaN;
                  const targetNode =
                    nodeValue && Number.isFinite(numericId)
                      ? nodeById.get(numericId)
                      : undefined;
                  const targetLabel = nodeValue
                    ? targetNode
                      ? `Target: ${targetNode.title?.trim() || `Node #${targetNode.nodeId}`}`
                      : `Target not found`
                    : null;
                  return (
                    <div
                      key={`shortcut-${index}`}
                      className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                          {slotLabel}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant={isPicking ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => handleShortcutPickToggle(index)}
                            aria-pressed={isPicking}
                            disabled={readOnly}
                          >
                            <Crosshair className="h-4 w-4" aria-hidden="true" />
                            {isPicking ? "Cancel pick" : "Pick node"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShortcutClear(index)}
                            disabled={readOnly}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                            Target node
                          </label>
                          <input
                            type="text"
                            value={nodeValue}
                            onChange={(event) =>
                              handleShortcutNodeIdChange(
                                index,
                                event.target.value
                              )
                            }
                            placeholder="Node id or #123"
                            disabled={readOnly}
                            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                          />
                          {targetLabel ? (
                            <p className="text-xs text-[var(--muted)]">
                              {targetLabel}
                            </p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                            Label
                          </label>
                          <input
                            type="text"
                            value={shortcut.text ?? ""}
                            onChange={(event) =>
                              handleShortcutLabelChange(
                                index,
                                event.target.value
                              )
                            }
                            placeholder="Menu label"
                            disabled={readOnly}
                            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {nextHiddenShortcutIndex != null ? (
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddShortcutRow}
                      disabled={readOnly}
                    >
                      + Add shortcut
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </CollapsibleSection>
        <CollapsibleSection title="Fonts" sectionKey="editor.adventure.fonts">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Upload fonts
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Uploaded fonts appear as xfont-* options for player buttons
                  and menu text.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fontInputRef}
                  type="file"
                  accept=".woff,.woff2,.ttf,.otf"
                  onChange={handleFontFileChange}
                  disabled={readOnly}
                  className="hidden"
                  aria-label="Upload font file"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFontUploadClick}
                  disabled={readOnly || fontUploading}
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  {fontUploading ? "Uploading..." : "Upload font"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {fontList.length === 0 ? (
                <p className="text-xs text-[var(--muted)]">
                  No fonts uploaded yet.
                </p>
              ) : null}
              {fontList.map((entry, index) => {
                const meta = getFontMeta(entry);
                if (!meta) return null;
                const removeKey = stripMediaUrl(entry);
                const isRemoving = fontRemoving === removeKey;
                const fileLabel = meta.fileName || entry;
                return (
                  <div
                    key={`${removeKey}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-secondary)]">
                        {fileLabel}
                      </p>
                      <p className="text-xs font-mono text-[var(--muted)]">
                        {meta.family}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleFontRemove(entry)}
                      disabled={readOnly || isRemoving}
                      aria-label="Remove font"
                      title="Remove font"
                      className="h-8 w-8 text-[var(--danger)] hover:text-[var(--danger)]"
                    >
                      {isRemoving ? (
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </InspectorShell>
  );
}

function ToggleRow({
  label,
  checked,
  onToggle,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
      <span className="text-sm font-medium text-[var(--text-secondary)]">
        {label}
      </span>
      <span className="relative inline-flex h-5 w-10 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(event) => onToggle(event.target.checked)}
          aria-label={label}
          disabled={disabled}
        />
        <span
          className={cn(
            "absolute inset-0 rounded-full border border-[var(--border)] bg-[var(--bg-tertiary)] transition",
            "peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent)]",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent-muted)]",
            disabled && "opacity-60"
          )}
        />
        <span
          className={cn(
            "absolute left-0.5 h-4 w-4 rounded-full bg-[var(--bg)] shadow-sm transition",
            "peer-checked:translate-x-5",
            disabled && "opacity-60"
          )}
        />
      </span>
    </label>
  );
}
