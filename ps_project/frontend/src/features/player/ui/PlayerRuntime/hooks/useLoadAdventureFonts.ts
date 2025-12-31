import { useEffect } from "react";
import type { AdventurePropsModel } from "@/domain/models";
import { buildFontFaceRules } from "@/lib/fonts";

const FONT_STYLE_SELECTOR = "style[data-player-fonts]";

export const useLoadAdventureFonts = (fontList?: AdventurePropsModel["fontList"]) => {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const rules = buildFontFaceRules(fontList ?? []);
    const existing = document.head.querySelector<HTMLStyleElement>(FONT_STYLE_SELECTOR);
    if (!rules) {
      existing?.remove();
      return;
    }
    const style = existing ?? document.createElement("style");
    style.setAttribute("data-player-fonts", "true");
    style.textContent = rules;
    if (!existing) {
      document.head.appendChild(style);
    }
  }, [fontList]);
};
