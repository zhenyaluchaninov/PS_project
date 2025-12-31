import type { LinkModel } from "@/domain/models";

export const EMPTY_LINKS: LinkModel[] = Object.freeze([]) as unknown as LinkModel[];

export const MENU_OPTION_VALUES = ["back", "home", "menu", "sound"] as const;
