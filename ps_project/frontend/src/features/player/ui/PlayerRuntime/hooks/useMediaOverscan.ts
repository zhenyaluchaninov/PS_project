import { useEffect, type MutableRefObject } from "react";
import { applyMediaOverscan } from "../utils/mediaHelpers";

export const useMediaOverscan = (
  rootRef: MutableRefObject<HTMLElement | null>,
  blurKey?: string | null
) => {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        applyMediaOverscan(root);
      });
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    schedule();

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      observer.disconnect();
    };
  }, [rootRef, blurKey]);
};
