"use client";

import { useEffect, useRef } from "react";
import type { NodeModel } from "@/domain/models";
import {
  selectEditorReadOnly,
  useEditorStore,
} from "@/features/editor/state/editorStore";
import type { EditorNodeInspectorTab } from "../../state/types";
import {
  BULK_NODE_TEXT_PATH,
  BULK_NODE_TITLE_PATH,
  BULK_NODE_TYPE_PATH,
} from "../../constants";
import type { BulkDraftEntry, BulkEditConfig } from "../types";
import { InspectorShell } from "../InspectorShell";
import { BulkEditBanner } from "./BulkEditBanner";
import {
  extraAudioOptions,
  fadeOptions,
  textShadowOptions,
  videoAudioOptions,
} from "./constants";
import { useLivePreview } from "./hooks/useLivePreview";
import { useNodeMedia } from "./hooks/useNodeMedia";
import { useNodeProps } from "./hooks/useNodeProps";
import { RouterInspector } from "./RouterInspector";
import { InspectorTabs } from "./tabs";
import { hasEditorVersion } from "./utils/propReaders";

type NodeInspectorPanelProps = {
  node: NodeModel;
  editSlug?: string;
  fontList?: string[];
  outgoingLinks?: Array<{ linkId: number; targetId: number; label: string }>;
  selectedLinkId?: number | null;
  onSelectLink?: (linkId: number) => void;
  activeTab: EditorNodeInspectorTab;
  onTabChange: (tab: EditorNodeInspectorTab) => void;
  onTitleChange: (title: string) => void;
  onTextChange: (text: string) => void;
  onNodeImageUrlChange: (url: string | null) => void;
  onNodeTypeChange: (chapterType: string) => void;
  onNodePropChange: (path: string, value: unknown) => void;
  onNodePropsChange: (updates: Record<string, unknown>) => void;
  bulk?: BulkEditConfig;
};

export function NodeInspectorPanel({
  node,
  editSlug,
  fontList,
  outgoingLinks = [],
  selectedLinkId = null,
  onSelectLink,
  activeTab,
  onTabChange,
  onTitleChange,
  onTextChange,
  onNodeImageUrlChange,
  onNodeTypeChange,
  onNodePropChange,
  onNodePropsChange,
  bulk,
}: NodeInspectorPanelProps) {
  const readOnly = useEditorStore(selectEditorReadOnly);
  const setNodePropPath = useEditorStore((s) => s.setNodePropPath);
  const markDirty = useEditorStore((s) => s.markDirty);
  const pushHistorySnapshot = useEditorStore((s) => s.pushHistorySnapshot);
  const beginLiveUpdate = useEditorStore((s) => s.beginLiveUpdate);
  const endLiveUpdate = useEditorStore((s) => s.endLiveUpdate);
  const beginInteractionLock = useEditorStore((s) => s.beginInteractionLock);
  const endInteractionLock = useEditorStore((s) => s.endInteractionLock);
  const bulkDraft = bulk?.draft ?? {};
  const bulkActive = bulk?.active ?? false;
  const stagedCount = Object.keys(bulkDraft).length;
  const hasStagedChanges = stagedCount > 0;
  const stagedTitle = bulkDraft[BULK_NODE_TITLE_PATH];
  const stagedText = bulkDraft[BULK_NODE_TEXT_PATH];
  const titleValue =
    bulkActive && stagedTitle ? String(stagedTitle.value ?? "") : node.title ?? "";
  const textValue =
    bulkActive && stagedText ? String(stagedText.value ?? "") : node.text ?? "";
  const editorVersionRef = useRef(hasEditorVersion(node, bulkDraft));

  useEffect(() => {
    editorVersionRef.current = hasEditorVersion(node, bulkDraft);
  }, [node, bulkDraft]);

  const isBulkFieldStaged = (paths: string | string[]) => {
    if (!bulkActive) return false;
    const pathList = Array.isArray(paths) ? paths : [paths];
    return pathList.some((path) => Boolean(bulkDraft[path]));
  };

  const clearBulkPaths = (paths: string | string[]) => {
    if (!bulkActive || !bulk) return;
    bulk.onClear(paths);
  };

  const stageBulkChange = (entry: BulkDraftEntry) => {
    if (!bulkActive || !bulk) return;
    bulk.onStage(entry);
  };

  const handleTitleChange = (title: string) => {
    if (readOnly) return;
    if (bulkActive) {
      stageBulkChange({
        path: BULK_NODE_TITLE_PATH,
        op: "set",
        value: title,
        kind: "nodeTitle",
      });
      return;
    }
    onTitleChange(title);
  };

  const handleTextChange = (text: string) => {
    if (readOnly) return;
    if (bulkActive) {
      stageBulkChange({
        path: BULK_NODE_TEXT_PATH,
        op: "set",
        value: text,
        kind: "nodeText",
      });
      return;
    }
    if (!editorVersionRef.current) {
      onNodePropChange("editorVersion", "2");
      editorVersionRef.current = true;
    }
    onTextChange(text);
  };

  const handleNodeTypeChange = (chapterTypeValue: string) => {
    if (readOnly) return;
    if (bulkActive) {
      stageBulkChange({
        path: BULK_NODE_TYPE_PATH,
        op: "set",
        value: chapterTypeValue,
        kind: "propStringArray",
      });
      return;
    }
    onNodeTypeChange(chapterTypeValue);
  };

  const handleNodePropChange = (path: string, value: unknown) => {
    if (readOnly) return;
    if (bulkActive) {
      stageBulkChange({
        path,
        op: "set",
        value,
        kind: "propPath",
      });
      return;
    }
    onNodePropChange(path, value);
  };

  const stageBulkPropChange = (path: string, value: unknown) => {
    if (!bulkActive) return;
    stageBulkChange({
      path,
      op: "set",
      value,
      kind: "propPath",
    });
  };

  const handleNodePropLiveChange = (path: string, value: unknown) => {
    if (readOnly) return;
    if (bulkActive) {
      stageBulkPropChange(path, value);
      return;
    }
    setNodePropPath(node.nodeId, path, value, { transient: true });
  };

  const handleNodePropCommit = (path: string, value: unknown) => {
    if (readOnly) return;
    if (bulkActive) {
      stageBulkPropChange(path, value);
      return;
    }
    markDirty();
  };

  const handleNodePropsChange = (updates: Record<string, unknown>) => {
    if (readOnly) return;
    if (bulkActive) return;
    onNodePropsChange(updates);
  };

  const choicesDisabledReason = bulkActive
    ? "Bulk edit disabled: select a single node to edit choices."
    : undefined;

  const handleLinkSelect = (linkId: number) => {
    if (readOnly) return;
    if (bulkActive || !onSelectLink) return;
    onSelectLink(linkId);
  };

  const {
    handleLiveInteractionStart,
    handleLiveInteractionEnd,
    handlePreviewInteractionStart,
    handlePreviewInteractionEnd,
    handlePreviewCommit,
    handlePreviewColorLiveChange,
    handleColorScrubStart,
    handleColorScrubEnd,
  } = useLivePreview({
    readOnly,
    bulkActive,
    nodeId: node.nodeId,
    setNodePropPath,
    markDirty,
    pushHistorySnapshot,
    beginLiveUpdate,
    endLiveUpdate,
    beginInteractionLock,
    endInteractionLock,
    onBulkPropChange: stageBulkPropChange,
  });

  const {
    chapterType,
    isRefNode,
    isRandomNode,
    showRouterInspector,
    navigationStyle,
    navigationSettings,
    verticalPosition,
    scrollSpeed,
    textShadow,
    grayscaleEnabled,
    blurAmount,
    hideVisitedEnabled,
    statisticsEnabled,
    navTextSize,
    audioVolume,
    audioLoopEnabled,
    audioFadeIn,
    audioFadeOut,
    extraAudioBehavior,
    videoLoopEnabled,
    videoAudioBehavior,
    orderedOutgoingLinks,
    marginLeft,
    marginRight,
    conditionsColor,
    conditionsAlpha,
    fontOptions,
    fontSelectValue,
    needsLegacyOption,
    missingUploadedFont,
    legacyFontLabel,
    sceneColors,
  } = useNodeProps({ node, bulkDraft, outgoingLinks, fontList });

  const media = useNodeMedia({
    node,
    editSlug,
    bulkActive,
    bulkDraft,
    onNodeImageUrlChange,
    onNodePropsChange: handleNodePropsChange,
  });

  const hasNavigationSetting = (token: string) =>
    navigationSettings.some(
      (entry) => entry.toLowerCase() === token.toLowerCase()
    );

  const updateNavigationSetting = (token: string, enabled: boolean) => {
    const normalizedToken = token.toLowerCase();
    const next = navigationSettings.filter(
      (entry) => entry.toLowerCase() !== normalizedToken
    );
    if (enabled) {
      next.push(token);
    }
    handleNodePropChange("playerNavigation.settings", next);
  };

  return (
    <InspectorShell
      title={
        bulkActive
          ? `Bulk edit (${bulk?.selectedNodeCount ?? 0} nodes selected)`
          : "Node settings"
      }
      meta={bulkActive ? null : `#${node.nodeId}`}
    >
      {bulkActive && bulk ? (
        <BulkEditBanner
          bulk={bulk}
          readOnly={readOnly}
          hasStagedChanges={hasStagedChanges}
          stagedCount={stagedCount}
        />
      ) : null}
      {showRouterInspector ? (
        <RouterInspector
          readOnly={readOnly}
          isBulkFieldStaged={isBulkFieldStaged}
          clearBulkPaths={clearBulkPaths}
          titleValue={titleValue}
          handleTitleChange={handleTitleChange}
          isRandomNode={isRandomNode}
          textValue={textValue}
          handleTextChange={handleTextChange}
          orderedOutgoingLinks={orderedOutgoingLinks}
          selectedLinkId={selectedLinkId}
          handleLinkSelect={handleLinkSelect}
          choicesDisabledReason={choicesDisabledReason}
        />
      ) : (
        <InspectorTabs
          activeTab={activeTab}
          onTabChange={onTabChange}
          readOnly={readOnly}
          bulkActive={bulkActive}
          isBulkFieldStaged={isBulkFieldStaged}
          clearBulkPaths={clearBulkPaths}
          titleValue={titleValue}
          textValue={textValue}
          handleTitleChange={handleTitleChange}
          handleTextChange={handleTextChange}
          isRefNode={isRefNode}
          fontList={fontList}
          textShadow={textShadow}
          textShadowOptions={textShadowOptions}
          fontSelectValue={fontSelectValue}
          fontOptions={fontOptions}
          needsLegacyOption={needsLegacyOption}
          legacyFontLabel={legacyFontLabel}
          missingUploadedFont={missingUploadedFont}
          handleNodePropChange={handleNodePropChange}
          handlePreviewColorLiveChange={handlePreviewColorLiveChange}
          handlePreviewCommit={handlePreviewCommit}
          handleNodePropLiveChange={handleNodePropLiveChange}
          handleNodePropCommit={handleNodePropCommit}
          handlePreviewInteractionStart={handlePreviewInteractionStart}
          handlePreviewInteractionEnd={handlePreviewInteractionEnd}
          handleLiveInteractionStart={handleLiveInteractionStart}
          handleLiveInteractionEnd={handleLiveInteractionEnd}
          handleColorScrubStart={handleColorScrubStart}
          handleColorScrubEnd={handleColorScrubEnd}
          sceneColors={sceneColors}
          videoLoopEnabled={videoLoopEnabled}
          videoAudioBehavior={videoAudioBehavior}
          videoAudioOptions={videoAudioOptions}
          audioLoopEnabled={audioLoopEnabled}
          audioFadeIn={audioFadeIn}
          audioFadeOut={audioFadeOut}
          extraAudioBehavior={extraAudioBehavior}
          fadeOptions={fadeOptions}
          extraAudioOptions={extraAudioOptions}
          grayscaleEnabled={grayscaleEnabled}
          blurAmount={blurAmount}
          scrollSpeed={scrollSpeed}
          verticalPosition={verticalPosition}
          navigationStyle={navigationStyle}
          audioVolume={audioVolume}
          marginLeft={marginLeft}
          marginRight={marginRight}
          hasNavigationSetting={hasNavigationSetting}
          updateNavigationSetting={updateNavigationSetting}
          orderedOutgoingLinks={orderedOutgoingLinks}
          selectedLinkId={selectedLinkId}
          handleLinkSelect={handleLinkSelect}
          choicesDisabledReason={choicesDisabledReason}
          navTextSize={navTextSize}
          chapterType={chapterType}
          handleNodeTypeChange={handleNodeTypeChange}
          hideVisitedEnabled={hideVisitedEnabled}
          conditionsColor={conditionsColor}
          conditionsAlpha={conditionsAlpha}
          statisticsEnabled={statisticsEnabled}
          {...media}
        />
      )}
    </InspectorShell>
  );
}
