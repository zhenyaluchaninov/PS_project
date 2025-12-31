import { type ChangeEvent, type RefObject, useRef } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/features/ui-core/primitives/tabs";
import type { EditorNodeInspectorTab } from "../../state/types";
import { tabOptions } from "../../../constants";
import type { SceneColors } from "../hooks/useNodeProps";
import type { SelectFieldOption } from "../fields";
import { AnimTab, type AnimMixedState } from "./AnimTab";
import { ButtonsTab } from "./ButtonsTab";
import { ContentTab } from "./ContentTab";
import { LogicTab } from "./LogicTab";
import { StyleTab } from "./StyleTab";

export function InspectorTabs({
  activeTab,
  onTabChange,
  readOnly,
  bulkActive,
  isBulkFieldStaged,
  clearBulkPaths,
  titleValue,
  textValue,
  handleTitleChange,
  handleTextChange,
  isRefNode,
  fontList,
  textShadow,
  textShadowOptions,
  fontSelectValue,
  fontOptions,
  needsLegacyOption,
  legacyFontLabel,
  missingUploadedFont,
  handleNodePropChange,
  handlePreviewColorLiveChange,
  handlePreviewCommit,
  handleNodePropLiveChange,
  handleNodePropCommit,
  handlePreviewInteractionStart,
  handlePreviewInteractionEnd,
  handleLiveInteractionStart,
  handleLiveInteractionEnd,
  handleColorScrubStart,
  handleColorScrubEnd,
  sceneColors,
  mediaDisabledReason,
  audioDisabledReason,
  mediaBusy,
  mediaUploading,
  mediaDeleting,
  mediaIsVideo,
  mediaUrl,
  imageLabel,
  videoLabel,
  fileInputRef,
  handleMediaUploadClick,
  handleMediaRemove,
  handleMediaInputChange,
  subtitlesLabel,
  subtitlesBusy,
  subtitlesUploading,
  subtitlesDeleting,
  subtitlesDisabledReason,
  subtitlesInputRef,
  handleSubtitlesUploadClick,
  handleSubtitlesRemove,
  handleSubtitlesInputChange,
  audioLabel,
  audioAltLabel,
  audioMainBusy,
  audioMainUploading,
  audioMainDeleting,
  audioAltBusy,
  audioAltUploading,
  audioAltDeleting,
  audioMainInputRef,
  audioAltInputRef,
  handleAudioMainUploadClick,
  handleAudioMainRemove,
  handleAudioMainInputChange,
  handleAudioAltUploadClick,
  handleAudioAltRemove,
  handleAudioAltInputChange,
  videoLoopEnabled,
  videoAudioBehavior,
  videoAudioOptions,
  audioLoopEnabled,
  audioFadeIn,
  audioFadeOut,
  extraAudioBehavior,
  fadeOptions,
  extraAudioOptions,
  grayscaleEnabled,
  blurAmount,
  scrollSpeed,
  verticalPosition,
  navigationStyle,
  audioVolume,
  marginLeft,
  marginRight,
  hasNavigationSetting,
  updateNavigationSetting,
  orderedOutgoingLinks,
  selectedLinkId,
  handleLinkSelect,
  choicesDisabledReason,
  navTextSize,
  chapterType,
  handleNodeTypeChange,
  hideVisitedEnabled,
  nodeConditions,
  conditionsBehavior,
  conditionsColor,
  conditionsAlpha,
  statisticsEnabled,
  animationMode,
  animationDelay,
  navigationDelay,
  backgroundFade,
  animMixed,
  handleAnimationModeChange,
}: {
  activeTab: EditorNodeInspectorTab;
  onTabChange: (tab: EditorNodeInspectorTab) => void;
  readOnly: boolean;
  bulkActive: boolean;
  isBulkFieldStaged: (paths: string | string[]) => boolean;
  clearBulkPaths: (paths: string | string[]) => void;
  titleValue: string;
  textValue: string;
  handleTitleChange: (title: string) => void;
  handleTextChange: (text: string) => void;
  isRefNode: boolean;
  fontList?: string[];
  textShadow: string;
  textShadowOptions: SelectFieldOption[];
  fontSelectValue: string;
  fontOptions: SelectFieldOption[];
  needsLegacyOption: boolean;
  legacyFontLabel: string;
  missingUploadedFont: boolean;
  handleNodePropChange: (path: string, value: unknown) => void;
  handlePreviewColorLiveChange: (
    path: string,
    color: string,
    alpha?: number
  ) => void;
  handlePreviewCommit: (path: string, value: unknown) => void;
  handleNodePropLiveChange: (path: string, value: unknown) => void;
  handleNodePropCommit: (path: string, value: unknown) => void;
  handlePreviewInteractionStart: () => void;
  handlePreviewInteractionEnd: () => void;
  handleLiveInteractionStart: () => void;
  handleLiveInteractionEnd: () => void;
  handleColorScrubStart: () => void;
  handleColorScrubEnd: () => void;
  sceneColors: SceneColors;
  mediaDisabledReason?: string;
  audioDisabledReason?: string;
  mediaBusy: boolean;
  mediaUploading: boolean;
  mediaDeleting: boolean;
  mediaIsVideo: boolean;
  mediaUrl: string | null;
  imageLabel: string;
  videoLabel: string;
  fileInputRef: RefObject<HTMLInputElement>;
  handleMediaUploadClick: () => void;
  handleMediaRemove: () => void;
  handleMediaInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  subtitlesLabel: string;
  subtitlesBusy: boolean;
  subtitlesUploading: boolean;
  subtitlesDeleting: boolean;
  subtitlesDisabledReason?: string;
  subtitlesInputRef: RefObject<HTMLInputElement>;
  handleSubtitlesUploadClick: () => void;
  handleSubtitlesRemove: () => void;
  handleSubtitlesInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  audioLabel: string;
  audioAltLabel: string;
  audioMainBusy: boolean;
  audioMainUploading: boolean;
  audioMainDeleting: boolean;
  audioAltBusy: boolean;
  audioAltUploading: boolean;
  audioAltDeleting: boolean;
  audioMainInputRef: RefObject<HTMLInputElement>;
  audioAltInputRef: RefObject<HTMLInputElement>;
  handleAudioMainUploadClick: () => void;
  handleAudioMainRemove: () => void;
  handleAudioMainInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleAudioAltUploadClick: () => void;
  handleAudioAltRemove: () => void;
  handleAudioAltInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  videoLoopEnabled: boolean;
  videoAudioBehavior: string;
  videoAudioOptions: SelectFieldOption[];
  audioLoopEnabled: boolean;
  audioFadeIn: string;
  audioFadeOut: string;
  extraAudioBehavior: string;
  fadeOptions: SelectFieldOption[];
  extraAudioOptions: SelectFieldOption[];
  grayscaleEnabled: boolean;
  blurAmount: number;
  scrollSpeed: number;
  verticalPosition: string;
  navigationStyle: string;
  audioVolume: number;
  marginLeft: number;
  marginRight: number;
  hasNavigationSetting: (token: string) => boolean;
  updateNavigationSetting: (token: string, enabled: boolean) => void;
  orderedOutgoingLinks: Array<{ linkId: number; targetId: number; label: string }>;
  selectedLinkId?: number | null;
  handleLinkSelect?: (linkId: number) => void;
  choicesDisabledReason?: string;
  navTextSize: number;
  chapterType: string;
  handleNodeTypeChange: (chapterType: string) => void;
  hideVisitedEnabled: boolean;
  nodeConditions: string[];
  conditionsBehavior: string;
  conditionsColor: string;
  conditionsAlpha: number;
  statisticsEnabled: boolean;
  animationMode: string;
  animationDelay: number;
  navigationDelay: number;
  backgroundFade: number;
  animMixed?: AnimMixedState;
  handleAnimationModeChange: (value: string) => void;
}) {
  const tabListRef = useRef<HTMLDivElement | null>(null);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as EditorNodeInspectorTab)}
    >
      <TabsList
        ref={tabListRef}
        className="w-full flex-nowrap justify-start overflow-x-auto overflow-y-hidden"
        onWheel={(event) => {
          const list = tabListRef.current;
          if (!list) return;
          if (list.scrollWidth <= list.clientWidth) return;
          const delta =
            Math.abs(event.deltaX) > Math.abs(event.deltaY)
              ? event.deltaX
              : event.deltaY;
          if (delta === 0) return;
          event.preventDefault();
          list.scrollLeft += delta;
        }}
      >
        {tabOptions.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="flex-none whitespace-nowrap px-4"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="content">
        <ContentTab
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
          mediaDisabledReason={mediaDisabledReason}
          audioDisabledReason={audioDisabledReason}
          mediaBusy={mediaBusy}
          mediaUploading={mediaUploading}
          mediaDeleting={mediaDeleting}
          mediaIsVideo={mediaIsVideo}
          mediaUrl={mediaUrl}
          imageLabel={imageLabel}
          videoLabel={videoLabel}
          fileInputRef={fileInputRef}
          handleMediaUploadClick={handleMediaUploadClick}
          handleMediaRemove={handleMediaRemove}
          handleMediaInputChange={handleMediaInputChange}
          subtitlesLabel={subtitlesLabel}
          subtitlesBusy={subtitlesBusy}
          subtitlesUploading={subtitlesUploading}
          subtitlesDeleting={subtitlesDeleting}
          subtitlesDisabledReason={subtitlesDisabledReason}
          subtitlesInputRef={subtitlesInputRef}
          handleSubtitlesUploadClick={handleSubtitlesUploadClick}
          handleSubtitlesRemove={handleSubtitlesRemove}
          handleSubtitlesInputChange={handleSubtitlesInputChange}
          audioLabel={audioLabel}
          audioAltLabel={audioAltLabel}
          audioMainBusy={audioMainBusy}
          audioMainUploading={audioMainUploading}
          audioMainDeleting={audioMainDeleting}
          audioAltBusy={audioAltBusy}
          audioAltUploading={audioAltUploading}
          audioAltDeleting={audioAltDeleting}
          audioMainInputRef={audioMainInputRef}
          audioAltInputRef={audioAltInputRef}
          handleAudioMainUploadClick={handleAudioMainUploadClick}
          handleAudioMainRemove={handleAudioMainRemove}
          handleAudioMainInputChange={handleAudioMainInputChange}
          handleAudioAltUploadClick={handleAudioAltUploadClick}
          handleAudioAltRemove={handleAudioAltRemove}
          handleAudioAltInputChange={handleAudioAltInputChange}
          videoLoopEnabled={videoLoopEnabled}
          videoAudioBehavior={videoAudioBehavior}
          videoAudioOptions={videoAudioOptions}
          audioLoopEnabled={audioLoopEnabled}
          audioFadeIn={audioFadeIn}
          audioFadeOut={audioFadeOut}
          extraAudioBehavior={extraAudioBehavior}
          fadeOptions={fadeOptions}
          extraAudioOptions={extraAudioOptions}
        />
      </TabsContent>

      <TabsContent value="style">
        <StyleTab
          readOnly={readOnly}
          isBulkFieldStaged={isBulkFieldStaged}
          clearBulkPaths={clearBulkPaths}
          sceneColors={sceneColors}
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
          handleNodePropChange={handleNodePropChange}
          handleNodePropLiveChange={handleNodePropLiveChange}
          handleNodePropCommit={handleNodePropCommit}
          handlePreviewColorLiveChange={handlePreviewColorLiveChange}
          handlePreviewCommit={handlePreviewCommit}
          handlePreviewInteractionStart={handlePreviewInteractionStart}
          handlePreviewInteractionEnd={handlePreviewInteractionEnd}
          handleLiveInteractionStart={handleLiveInteractionStart}
          handleLiveInteractionEnd={handleLiveInteractionEnd}
          handleColorScrubStart={handleColorScrubStart}
          handleColorScrubEnd={handleColorScrubEnd}
        />
      </TabsContent>

      <TabsContent value="anim">
        <AnimTab
          readOnly={readOnly}
          bulkActive={bulkActive}
          isBulkFieldStaged={isBulkFieldStaged}
          clearBulkPaths={clearBulkPaths}
          animationMode={animationMode}
          animationDelay={animationDelay}
          navigationDelay={navigationDelay}
          backgroundFade={backgroundFade}
          animMixed={animMixed}
          onAnimationModeChange={handleAnimationModeChange}
          handleNodePropChange={handleNodePropChange}
        />
      </TabsContent>

      <TabsContent value="buttons">
        <ButtonsTab
          readOnly={readOnly}
          isBulkFieldStaged={isBulkFieldStaged}
          clearBulkPaths={clearBulkPaths}
          orderedOutgoingLinks={orderedOutgoingLinks}
          selectedLinkId={selectedLinkId}
          handleLinkSelect={handleLinkSelect}
          handleNodePropChange={handleNodePropChange}
          choicesDisabledReason={choicesDisabledReason}
          sceneColors={sceneColors}
          navTextSize={navTextSize}
          conditionsBehavior={conditionsBehavior}
          conditionsColor={conditionsColor}
          conditionsAlpha={conditionsAlpha}
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
        />
      </TabsContent>

      <TabsContent value="logic">
        <LogicTab
          readOnly={readOnly}
          isBulkFieldStaged={isBulkFieldStaged}
          clearBulkPaths={clearBulkPaths}
          chapterType={chapterType}
          handleNodeTypeChange={handleNodeTypeChange}
          hideVisitedEnabled={hideVisitedEnabled}
          nodeConditions={nodeConditions}
          statisticsEnabled={statisticsEnabled}
          handleNodePropChange={handleNodePropChange}
        />
      </TabsContent>
    </Tabs>
  );
}
