import { useCallback, useEffect, useRef, useState } from "react";
import type { AdventureModel } from "@/domain/models";
import { saveAdventure } from "@/features/state/api/adventures";
import { isApiError } from "@/features/state/api/client";
import { toastError } from "@/features/ui-core/toast";
import {
  selectEditorAdventure,
  selectEditorDirty,
  selectEditorStatus,
  useEditorStore,
} from "../state/editorStore";
import {
  buildAdventureDto,
  mergeServerAdventureIds,
} from "../state/adventureSerialization";

const AUTOSAVE_DEBOUNCE_MS = 250;
const DRAFT_PREFIX = "ps.editor.draft.";

type DraftSnapshot = {
  savedAt: number;
  dirty: boolean;
  editVersion: number | null;
  adventure: AdventureModel;
};

const getDraftKey = (slug: string) => `${DRAFT_PREFIX}${slug}`;

const parseServerTime = (value?: string | null): number | null => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readDraft = (slug: string): DraftSnapshot | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getDraftKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftSnapshot;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.adventure || typeof parsed.adventure !== "object") return null;
    if (
      typeof parsed.savedAt !== "number" ||
      typeof parsed.dirty !== "boolean"
    ) {
      return null;
    }
    const editVersion =
      typeof parsed.editVersion === "number" ? parsed.editVersion : null;
    return {
      savedAt: parsed.savedAt,
      dirty: parsed.dirty,
      editVersion,
      adventure: parsed.adventure,
    };
  } catch {
    return null;
  }
};

const writeDraft = (slug: string, snapshot: DraftSnapshot) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getDraftKey(slug), JSON.stringify(snapshot));
  } catch {
    return;
  }
};

const removeDraft = (slug: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getDraftKey(slug));
  } catch {
    return;
  }
};

export const useEditorAutosave = (editSlug: string) => {
  const status = useEditorStore(selectEditorStatus);
  const adventure = useEditorStore(selectEditorAdventure);
  const dirty = useEditorStore(selectEditorDirty);
  const [draftPromptOpen, setDraftPromptOpen] = useState(false);
  const draftRef = useRef<DraftSnapshot | null>(null);
  const checkedSlugRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const queuedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistDraft = useCallback(
    (overrides?: Partial<DraftSnapshot>) => {
      const state = useEditorStore.getState();
      const snapshotAdventure = overrides?.adventure ?? state.adventure;
      if (!snapshotAdventure || !editSlug) return;
      const snapshot: DraftSnapshot = {
        savedAt: overrides?.savedAt ?? Date.now(),
        dirty: overrides?.dirty ?? state.dirty,
        editVersion: overrides?.editVersion ?? state.editVersion ?? null,
        adventure: snapshotAdventure,
      };
      writeDraft(editSlug, snapshot);
    },
    [editSlug]
  );

  const recoverDraft = useCallback(() => {
    const draft = draftRef.current;
    if (!draft) return;
    useEditorStore.setState((state) => {
      const nextEditVersion = state.editVersion ?? draft.editVersion ?? 0;
      const nextAdventure = { ...draft.adventure, editVersion: nextEditVersion };
      return {
        adventure: nextAdventure,
        editVersion: nextEditVersion,
        dirty: true,
        selection: { type: "none" },
        selectedNodeIds: [],
        selectedLinkIds: [],
        focusNodeId: null,
        menuShortcutPickIndex: null,
        undoStack: [],
      };
    });
    const state = useEditorStore.getState();
    if (state.adventure) {
      persistDraft({
        adventure: state.adventure,
        dirty: true,
        editVersion: state.editVersion ?? null,
      });
    }
    draftRef.current = null;
    setDraftPromptOpen(false);
  }, [persistDraft]);

  const discardDraft = useCallback(() => {
    removeDraft(editSlug);
    draftRef.current = null;
    setDraftPromptOpen(false);
  }, [editSlug]);

  const runSave = useCallback(async () => {
    const state = useEditorStore.getState();
    if (savingRef.current) {
      queuedRef.current = true;
      return;
    }
    if (state.status !== "ready" || !state.adventure || !state.editSlug) {
      return;
    }
    if (!state.dirty) {
      return;
    }
    const currentEditVersion =
      state.editVersion ?? state.adventure.editVersion;
    if (!Number.isFinite(currentEditVersion)) {
      return;
    }
    savingRef.current = true;
    const snapshotAdventure = state.adventure;
    const slug = state.editSlug;
    const payload = buildAdventureDto(snapshotAdventure, currentEditVersion);

    try {
      const saved = await saveAdventure(slug, payload);
      const latest = useEditorStore.getState();
      if (latest.editSlug !== slug) {
        return;
      }
      if (latest.adventure === snapshotAdventure) {
        useEditorStore.setState({
          adventure: saved,
          editVersion: saved.editVersion,
          dirty: false,
        });
        persistDraft({
          adventure: saved,
          dirty: false,
          editVersion: saved.editVersion,
        });
      } else {
        useEditorStore.setState((current) => {
          if (!current.adventure) return {};
          const merged = mergeServerAdventureIds(current.adventure, saved);
          const nextAdventure =
            merged.editVersion === saved.editVersion
              ? merged
              : { ...merged, editVersion: saved.editVersion };
          return {
            adventure: nextAdventure,
            editVersion: saved.editVersion,
          };
        });
      }
    } catch (err) {
      const message = isApiError(err)
        ? err.message
        : "Could not reach the server.";
      toastError("Autosave failed", message);
      if (process.env.NODE_ENV !== "production") {
        console.error("[editor] autosave failed", err);
      }
    } finally {
      savingRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        void runSave();
      }
    }
  }, [persistDraft]);

  useEffect(() => {
    if (status !== "ready" || !adventure || !editSlug) return;
    if (checkedSlugRef.current === editSlug) return;
    checkedSlugRef.current = editSlug;
    const draft = readDraft(editSlug);
    if (!draft) return;
    if (draft.adventure?.slug && draft.adventure.slug !== editSlug) {
      return;
    }
    const serverTime = parseServerTime(adventure.updatedAt);
    const shouldPrompt =
      draft.dirty && (serverTime === null || draft.savedAt > serverTime);
    if (!shouldPrompt) return;
    draftRef.current = draft;
    setDraftPromptOpen(true);
  }, [adventure, editSlug, status]);

  useEffect(() => {
    if (status !== "ready" || !adventure || !editSlug) return;
    if (!dirty) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      return;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      persistDraft();
      void runSave();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [adventure, dirty, editSlug, persistDraft, runSave, status]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    savingRef.current = false;
    queuedRef.current = false;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [editSlug]);

  return {
    draftPromptOpen,
    recoverDraft,
    discardDraft,
  };
};
