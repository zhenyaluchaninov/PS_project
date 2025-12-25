import type { CategoryModel } from "@/domain/models";
import type { StateCreator } from "zustand";
import type { EditorState } from "../types";

type EditorSlice = StateCreator<EditorState, [], [], Partial<EditorState>>;

type AdventureFieldUpdates = {
  title?: string;
  description?: string;
  category?: CategoryModel | null;
};

const categoriesEqual = (
  current: CategoryModel | undefined,
  next: CategoryModel | undefined
): boolean => {
  if (!current && !next) return true;
  if (!current || !next) return false;
  return current.id === next.id;
};

export const adventureOpsSlice: EditorSlice = (set) => ({
  updateAdventureFields: (updates: AdventureFieldUpdates) => {
    set((state) => {
      const adventure = state.adventure;
      if (!adventure) return {};
      let changed = false;
      let nextAdventure = adventure;

      if (updates.title !== undefined && updates.title !== adventure.title) {
        nextAdventure = nextAdventure === adventure ? { ...adventure } : nextAdventure;
        nextAdventure.title = updates.title;
        changed = true;
      }

      if (
        updates.description !== undefined &&
        updates.description !== adventure.description
      ) {
        nextAdventure = nextAdventure === adventure ? { ...adventure } : nextAdventure;
        nextAdventure.description = updates.description;
        changed = true;
      }

      if (Object.prototype.hasOwnProperty.call(updates, "category")) {
        const nextCategory = updates.category ?? undefined;
        if (!categoriesEqual(adventure.category, nextCategory)) {
          nextAdventure = nextAdventure === adventure ? { ...adventure } : nextAdventure;
          nextAdventure.category = nextCategory;
          changed = true;
        }
      }

      if (!changed) return {};

      return {
        adventure: nextAdventure,
        dirty: true,
      };
    });
  },
});
