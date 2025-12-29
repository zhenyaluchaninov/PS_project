import { useCallback, useEffect, useRef, useState } from "react";
import type { AdventureModel } from "@/domain/models";
import { saveAdventure } from "@/features/state/api/adventures";
import { isApiError } from "@/features/state/api/client";
import { toastError } from "@/features/ui-core/toast";
import {
  selectEditorAdventure,
  selectEditorDirty,
  selectEditorLiveUpdateCount,
  selectEditorReadOnly,
  selectEditorSaveStatus,
  selectEditorStatus,
  useEditorStore,
} from "../state/editorStore";
import {
  buildAdventureDto,
  mergeServerAdventureIds,
} from "../state/adventureSerialization";

const AUTOSAVE_DEBOUNCE_MS = 250;
const SAVED_STATUS_MS = 2000;
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
  const liveUpdateCount = useEditorStore(selectEditorLiveUpdateCount);
  const saveStatus = useEditorStore(selectEditorSaveStatus);
  const readOnly = useEditorStore(selectEditorReadOnly);
  const setSaveStatus = useEditorStore((s) => s.setSaveStatus);
  const setReadOnly = useEditorStore((s) => s.setReadOnly);
  const [draftPromptOpen, setDraftPromptOpen] = useState(false);
  const draftRef = useRef<DraftSnapshot | null>(null);
  const checkedSlugRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const queuedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDirtyRef = useRef(dirty);
  const errorToastRef = useRef<string | null>(null);

  const clearSavedTimer = useCallback(() => {
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }
  }, []);

  const scheduleSavedReset = useCallback(() => {
    clearSavedTimer();
    savedTimerRef.current = setTimeout(() => {
      const current = useEditorStore.getState();
      if (!current.dirty && current.saveStatus === "saved" && !current.readOnly) {
        current.setSaveStatus("idle");
      }
    }, SAVED_STATUS_MS);
  }, [clearSavedTimer]);

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
    if (
      state.status !== "ready" ||
      !state.adventure ||
      !state.editSlug ||
      state.readOnly ||
      state.saveStatus === "locked"
    ) {
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
    state.setSaveStatus("saving");
    const snapshotAdventure = state.adventure;
    const slug = state.editSlug;
    const payload = buildAdventureDto(snapshotAdventure, currentEditVersion);
    let hadError = false;

    try {
      const saved = await saveAdventure(slug, payload);
      const latest = useEditorStore.getState();
      if (latest.editSlug !== slug) {
        return;
      }
      errorToastRef.current = null;
      if (latest.adventure === snapshotAdventure) {
        useEditorStore.setState((current) => ({
          adventure: saved,
          editVersion: saved.editVersion,
          dirty: false,
          saveStatus: current.saveStatus === "locked" ? current.saveStatus : "saved",
          saveError: null,
        }));
        persistDraft({
          adventure: saved,
          dirty: false,
          editVersion: saved.editVersion,
        });
        scheduleSavedReset();
      } else {
        useEditorStore.setState((current) => {
          if (!current.adventure) return {};
          const merged = mergeServerAdventureIds(current.adventure, saved);
          const nextAdventure =
            merged.editVersion === saved.editVersion
              ? merged
              : { ...merged, editVersion: saved.editVersion };
          const nextStatus = current.dirty ? "dirty" : "saved";
          return {
            adventure: nextAdventure,
            editVersion: saved.editVersion,
            saveStatus:
              current.saveStatus === "locked" ? current.saveStatus : nextStatus,
            saveError: nextStatus === "saved" ? null : current.saveError,
          };
        });
        if (!useEditorStore.getState().dirty) {
          scheduleSavedReset();
        }
      }
    } catch (err) {
      const isLocked =
        isApiError(err) &&
        (err.status === 423 ||
          err.status === 409 ||
          (err.status === 404 &&
            typeof err.message === "string" &&
            err.message.toLowerCase().includes("read-only")));
      const message = isApiError(err)
        ? err.message
        : "Could not reach the server.";
      if (isLocked) {
        setReadOnly(true);
        setSaveStatus("locked", message);
        queuedRef.current = false;
        return;
      }
      hadError = true;
      setSaveStatus("error", message);
      if (errorToastRef.current !== message) {
        errorToastRef.current = message;
        toastError("Autosave failed", message);
      }
      if (process.env.NODE_ENV !== "production") {
        console.error("[editor] autosave failed", err);
      }
    } finally {
      savingRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        if (!hadError) {
          void runSave();
        }
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
    if (readOnly || saveStatus === "locked") return;
    if (liveUpdateCount > 0) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      return;
    }
    if (!dirty) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      return;
    }
    if (saveStatus === "error") {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        persistDraft();
      }, AUTOSAVE_DEBOUNCE_MS);
      lastDirtyRef.current = dirty;
      return;
    }
    if (!lastDirtyRef.current && saveStatus !== "saving" && saveStatus !== "error") {
      setSaveStatus("dirty");
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      persistDraft();
      void runSave();
    }, AUTOSAVE_DEBOUNCE_MS);
    lastDirtyRef.current = dirty;
  }, [
    adventure,
    dirty,
    editSlug,
    persistDraft,
    readOnly,
    runSave,
    saveStatus,
    setSaveStatus,
    status,
    liveUpdateCount,
  ]);

  useEffect(() => {
    if (lastDirtyRef.current !== dirty) {
      lastDirtyRef.current = dirty;
    }
  }, [dirty]);

  useEffect(() => {
    if (readOnly || saveStatus === "locked") {
      clearSavedTimer();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      return;
    }
    if (!dirty && saveStatus === "dirty") {
      setSaveStatus("idle");
    }
  }, [clearSavedTimer, dirty, readOnly, saveStatus, setSaveStatus]);

  useEffect(() => {
    const shouldWarn =
      dirty ||
      saveStatus === "saving" ||
      saveStatus === "error";
    if (!shouldWarn || typeof window === "undefined") return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue =
        "You have unsaved changes. Please wait for autosave to finish.";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty, saveStatus]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      clearSavedTimer();
    };
  }, [clearSavedTimer]);

  useEffect(() => {
    savingRef.current = false;
    queuedRef.current = false;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    clearSavedTimer();
  }, [editSlug]);

  const retrySave = useCallback(() => {
    if (savingRef.current) return;
    const state = useEditorStore.getState();
    if (!state.dirty || state.readOnly || state.saveStatus === "locked") {
      state.setSaveStatus("idle");
      return;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setSaveStatus("saving");
    void runSave();
  }, [runSave, setSaveStatus]);

  return {
    draftPromptOpen,
    recoverDraft,
    discardDraft,
    retrySave,
  };
};
