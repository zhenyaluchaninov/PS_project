import { useRef } from "react";
import { hexToRgba } from "@/features/ui-core/props/props";
import {
  applyPreviewOverrides,
  beginPreviewOverride,
  endPreviewOverride,
} from "@/features/editor/ui/previewLiveStyles";
import { clampAlpha } from "../utils/formatters";

export const useLivePreview = ({
  readOnly,
  bulkActive,
  nodeId,
  setNodePropPath,
  markDirty,
  pushHistorySnapshot,
  beginLiveUpdate,
  endLiveUpdate,
  beginInteractionLock,
  endInteractionLock,
  onBulkPropChange,
}: {
  readOnly: boolean;
  bulkActive: boolean;
  nodeId: number;
  setNodePropPath: (
    nodeId: number,
    path: string,
    value: unknown,
    options: { transient: boolean }
  ) => void;
  markDirty: () => void;
  pushHistorySnapshot: () => void;
  beginLiveUpdate: () => void;
  endLiveUpdate: () => void;
  beginInteractionLock: () => void;
  endInteractionLock: () => void;
  onBulkPropChange?: (path: string, value: unknown) => void;
}) => {
  const previewCommitRef = useRef(false);

  const handleLiveInteractionStart = () => {
    if (readOnly || bulkActive) return;
    pushHistorySnapshot();
    beginLiveUpdate();
  };

  const handleLiveInteractionEnd = () => {
    if (readOnly || bulkActive) return;
    endLiveUpdate();
  };

  const handlePreviewInteractionStart = () => {
    if (readOnly || bulkActive) return;
    previewCommitRef.current = false;
    beginPreviewOverride();
    handleLiveInteractionStart();
  };

  const handlePreviewInteractionEnd = () => {
    if (readOnly || bulkActive) return;
    handleLiveInteractionEnd();
    queueMicrotask(() => {
      endPreviewOverride({ restore: !previewCommitRef.current });
      previewCommitRef.current = false;
    });
  };

  const handlePreviewCommit = (path: string, value: unknown) => {
    if (readOnly) return;
    previewCommitRef.current = true;
    if (bulkActive) {
      onBulkPropChange?.(path, value);
      return;
    }
    setNodePropPath(nodeId, path, value, { transient: true });
    markDirty();
  };

  const handleColorScrubStart = () => {
    if (readOnly || bulkActive) return;
    beginInteractionLock();
  };

  const handleColorScrubEnd = () => {
    if (readOnly || bulkActive) return;
    endInteractionLock();
  };

  const handlePreviewColorLiveChange = (
    path: string,
    color: string,
    alpha?: number
  ) => {
    if (readOnly || bulkActive) return;
    const vars: Record<string, string> = {};
    let backgroundColor: string | undefined;
    let textColor: string | undefined;
    let overlayColor: string | null | undefined;
    const resolvedAlpha = alpha === undefined ? undefined : clampAlpha(alpha);
    const withAlpha =
      resolvedAlpha === undefined ? color : hexToRgba(color, resolvedAlpha);

    switch (path) {
      case "color_background":
        vars["--background"] = color;
        vars["--bg"] = color;
        vars["--player-bg"] = color;
        backgroundColor = color;
        break;
      case "color_foreground":
        vars["--foreground"] = withAlpha;
        vars["--player-foreground"] = withAlpha;
        overlayColor = withAlpha;
        break;
      case "color_text":
        vars["--text"] = withAlpha;
        vars["--player-text"] = withAlpha;
        textColor = withAlpha;
        break;
      case "color_textbackground":
        vars["--surface"] = withAlpha;
        vars["--player-text-bg"] = withAlpha;
        break;
      case "color_buttonbackground":
        vars["--accent"] = withAlpha;
        vars["--accent-strong"] = withAlpha;
        vars["--player-accent"] = withAlpha;
        vars["--player-button-bg"] = withAlpha;
        break;
      case "color_buttontext":
        vars["--muted"] = withAlpha;
        vars["--player-button-text"] = withAlpha;
        break;
      default:
        return;
    }

    applyPreviewOverrides({
      vars,
      backgroundColor,
      textColor,
      overlayColor,
    });
  };

  return {
    handleLiveInteractionStart,
    handleLiveInteractionEnd,
    handlePreviewInteractionStart,
    handlePreviewInteractionEnd,
    handlePreviewCommit,
    handlePreviewColorLiveChange,
    handleColorScrubStart,
    handleColorScrubEnd,
  };
};
