import { type ChangeEvent, type RefObject } from "react";
import { Button } from "@/features/ui-core/primitives/button";
import { cn } from "@/lib/utils";
import {
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  Music,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { BULK_NODE_TEXT_PATH, BULK_NODE_TITLE_PATH } from "../../../constants";
import { BulkField } from "../../BulkField";
import { CollapsibleSection } from "../../CollapsibleSection";
import { RichTextEditor } from "../../RichTextEditor";
import type { SceneColors } from "../hooks/useNodeProps";
import {
  ColorAlphaField,
  SelectField,
  ToggleRow,
  type SelectFieldOption,
} from "../fields";

function MediaActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant = "outline",
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "secondary" | "outline" | "ghost";
  tone?: "default" | "danger";
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "h-8 w-8 p-0",
        tone === "danger"
          ? "text-[var(--danger)] hover:text-[var(--danger)]"
          : ""
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}

function MediaFileRow({
  value,
  emptyLabel,
  uploadLabel,
  deleteLabel,
  onUpload,
  onDelete,
  uploadDisabled = false,
  deleteDisabled = false,
  status,
  helperText,
}: {
  value: string;
  emptyLabel: string;
  uploadLabel: string;
  deleteLabel: string;
  onUpload?: () => void;
  onDelete?: () => void;
  uploadDisabled?: boolean;
  deleteDisabled?: boolean;
  status?: "uploading" | "deleting";
  helperText?: string;
}) {
  const displayValue = value.trim();
  const resolvedUploadDisabled = uploadDisabled || !onUpload;
  const resolvedDeleteDisabled = deleteDisabled || !onDelete;
  const statusLabel =
    status === "uploading"
      ? "Uploading..."
      : status === "deleting"
        ? "Removing..."
        : "";

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <input
          type="text"
          value={displayValue}
          placeholder={emptyLabel}
          readOnly
          aria-label={displayValue || emptyLabel}
          title={displayValue || emptyLabel}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
        />
        <div className="flex items-center gap-2">
          <MediaActionButton
            icon={Upload}
            label={uploadLabel}
            onClick={onUpload}
            disabled={resolvedUploadDisabled}
          />
          <MediaActionButton
            icon={Trash2}
            label={deleteLabel}
            onClick={onDelete}
            disabled={resolvedDeleteDisabled}
            variant="outline"
            tone="danger"
          />
        </div>
      </div>
      {statusLabel ? (
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          <span>{statusLabel}</span>
        </div>
      ) : null}
      {helperText ? (
        <p className="text-xs text-[var(--muted)]">{helperText}</p>
      ) : null}
    </div>
  );
}

export function ContentTab({
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
}: {
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
}) {
  const fontSelectOptions: SelectFieldOption[] = [
    { value: "", label: "Default", key: "default" },
    ...fontOptions,
    ...(needsLegacyOption
      ? [
          {
            value: fontSelectValue,
            label: `Current: ${legacyFontLabel}`,
            key: `current-${fontSelectValue}`,
          },
        ]
      : []),
  ];
  const videoAudioSelectOptions = videoAudioOptions.map((option) => ({
    ...option,
    key: option.value || "default",
  }));
  const fadeSelectOptions = fadeOptions.map((option) => ({
    ...option,
    key: option.value || "default",
  }));
  const extraAudioSelectOptions = extraAudioOptions.map((option) => ({
    ...option,
    key: option.value || "default",
  }));

  return (
    <fieldset disabled={readOnly} className="space-y-4">
      <BulkField
        active={isBulkFieldStaged(BULK_NODE_TITLE_PATH)}
        onClear={() => clearBulkPaths(BULK_NODE_TITLE_PATH)}
      >
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
            Node name
          </label>
          <input
            value={titleValue}
            onChange={(event) => handleTitleChange(event.target.value)}
            placeholder="Untitled node"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
          />
        </div>
      </BulkField>

      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
        <CollapsibleSection
          title="Text"
          titleIcon={<FileText className="h-4 w-4" />}
          sectionKey="editor.node.content.text"
        >
          <div className="space-y-3">
            {isRefNode ? (
              <BulkField
                active={isBulkFieldStaged(BULK_NODE_TEXT_PATH)}
                onClear={() => clearBulkPaths(BULK_NODE_TEXT_PATH)}
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                    Reference URL
                  </label>
                  <input
                    value={textValue}
                    onChange={(event) => handleTextChange(event.target.value)}
                    placeholder="https://example.com"
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                  />
                  <p className="text-xs text-[var(--muted)]">
                    Reference nodes open the first URL found in `node.text`.
                  </p>
                </div>
              </BulkField>
            ) : (
              <>
                <BulkField
                  active={isBulkFieldStaged(BULK_NODE_TEXT_PATH)}
                  onClear={() => clearBulkPaths(BULK_NODE_TEXT_PATH)}
                >
                  <RichTextEditor
                    value={textValue}
                    onChange={handleTextChange}
                    placeholder="Write the node content..."
                    readOnly={readOnly}
                    fontList={fontList}
                  />
                </BulkField>
                <div className="space-y-4 pt-2">
                  <BulkField
                    active={isBulkFieldStaged("outer_container.textShadow")}
                    onClear={() =>
                      clearBulkPaths("outer_container.textShadow")
                    }
                  >
                    <SelectField
                      label="Text shadow"
                      value={textShadow}
                      onChange={(next) =>
                        handleNodePropChange("outer_container.textShadow", [next])
                      }
                      options={textShadowOptions}
                    />
                  </BulkField>
                  <BulkField
                    active={isBulkFieldStaged("background.font")}
                    onClear={() => clearBulkPaths("background.font")}
                  >
                    <SelectField
                      label="Font (player buttons/menu)"
                      value={fontSelectValue}
                      onChange={(next) =>
                        handleNodePropChange("background.font", [next])
                      }
                      options={fontSelectOptions}
                      widthClassName="w-56"
                    />
                  </BulkField>
                  <BulkField
                    active={isBulkFieldStaged(["color_text", "alpha_text"])}
                    onClear={() =>
                      clearBulkPaths(["color_text", "alpha_text"])
                    }
                  >
                    <ColorAlphaField
                      label="Text"
                      colorValue={sceneColors.text}
                      alphaValue={sceneColors.textAlpha}
                      onColorLiveChange={(value) =>
                        handlePreviewColorLiveChange(
                          "color_text",
                          value,
                          sceneColors.textAlpha
                        )
                      }
                      onColorCommit={(value) =>
                        handlePreviewCommit("color_text", value)
                      }
                      onAlphaLiveChange={(value) =>
                        handleNodePropLiveChange("alpha_text", String(value))
                      }
                      onAlphaCommit={(value) =>
                        handleNodePropCommit("alpha_text", String(value))
                      }
                      onColorInteractionStart={handlePreviewInteractionStart}
                      onColorInteractionEnd={handlePreviewInteractionEnd}
                      onAlphaInteractionStart={handleLiveInteractionStart}
                      onAlphaInteractionEnd={handleLiveInteractionEnd}
                      onColorScrubStart={handleColorScrubStart}
                      onColorScrubEnd={handleColorScrubEnd}
                    />
                  </BulkField>
                  <BulkField
                    active={isBulkFieldStaged([
                      "color_textbackground",
                      "alpha_textbackground",
                    ])}
                    onClear={() =>
                      clearBulkPaths([
                        "color_textbackground",
                        "alpha_textbackground",
                      ])
                    }
                  >
                    <ColorAlphaField
                      label="Text background"
                      colorValue={sceneColors.textBackground}
                      alphaValue={sceneColors.textBackgroundAlpha}
                      onColorLiveChange={(value) =>
                        handlePreviewColorLiveChange(
                          "color_textbackground",
                          value,
                          sceneColors.textBackgroundAlpha
                        )
                      }
                      onColorCommit={(value) =>
                        handlePreviewCommit("color_textbackground", value)
                      }
                      onAlphaLiveChange={(value) =>
                        handleNodePropLiveChange(
                          "alpha_textbackground",
                          String(value)
                        )
                      }
                      onAlphaCommit={(value) =>
                        handleNodePropCommit(
                          "alpha_textbackground",
                          String(value)
                        )
                      }
                      onColorInteractionStart={handlePreviewInteractionStart}
                      onColorInteractionEnd={handlePreviewInteractionEnd}
                      onAlphaInteractionStart={handleLiveInteractionStart}
                      onAlphaInteractionEnd={handleLiveInteractionEnd}
                      onColorScrubStart={handleColorScrubStart}
                      onColorScrubEnd={handleColorScrubEnd}
                    />
                  </BulkField>
                </div>
              </>
            )}
          </div>
        </CollapsibleSection>
        <CollapsibleSection
          title="Image"
          titleIcon={<ImageIcon className="h-4 w-4" />}
          sectionKey="editor.node.content.image"
        >
          <BulkField active={false} disabledReason={mediaDisabledReason}>
            <div className="space-y-3">
              <MediaFileRow
                value={imageLabel}
                emptyLabel="No image background set"
                onUpload={handleMediaUploadClick}
                onDelete={handleMediaRemove}
                uploadDisabled={mediaBusy || bulkActive}
                deleteDisabled={mediaBusy || bulkActive || !imageLabel}
                uploadLabel="Upload image or video"
                deleteLabel="Remove background image"
                status={
                  mediaUploading
                    ? "uploading"
                    : mediaDeleting
                      ? "deleting"
                      : undefined
                }
              />
              {mediaIsVideo && mediaUrl ? (
                <p className="text-xs text-[var(--muted)]">
                  A video background is active. Uploading an image will replace it.
                </p>
              ) : null}
              {!mediaIsVideo && mediaUrl ? (
                <img
                  src={mediaUrl}
                  alt="Background image preview"
                  className="h-32 w-full rounded-md border border-[var(--border)] object-cover"
                />
              ) : null}
            </div>
          </BulkField>
        </CollapsibleSection>
        <CollapsibleSection
          title="Video"
          titleIcon={<Film className="h-4 w-4" />}
          sectionKey="editor.node.content.video"
        >
          <BulkField active={false} disabledReason={mediaDisabledReason}>
            <div className="space-y-3">
              <MediaFileRow
                value={videoLabel}
                emptyLabel="No video background set"
                onUpload={handleMediaUploadClick}
                onDelete={handleMediaRemove}
                uploadDisabled={mediaBusy || bulkActive}
                deleteDisabled={mediaBusy || bulkActive || !videoLabel}
                uploadLabel="Upload image or video"
                deleteLabel="Remove background video"
                status={
                  mediaUploading
                    ? "uploading"
                    : mediaDeleting
                      ? "deleting"
                      : undefined
                }
              />
              {!mediaIsVideo && mediaUrl ? (
                <p className="text-xs text-[var(--muted)]">
                  An image background is active. Uploading a video will replace it.
                </p>
              ) : null}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Subtitles (.vtt)
                </p>
                <MediaFileRow
                  value={subtitlesLabel}
                  emptyLabel="No subtitles set"
                  onUpload={handleSubtitlesUploadClick}
                  onDelete={handleSubtitlesRemove}
                  uploadDisabled={subtitlesBusy || bulkActive || !mediaIsVideo}
                  deleteDisabled={
                    subtitlesBusy ||
                    bulkActive ||
                    !mediaIsVideo ||
                    !subtitlesLabel
                  }
                  uploadLabel="Upload subtitles"
                  deleteLabel="Remove subtitles"
                  status={
                    subtitlesUploading
                      ? "uploading"
                      : subtitlesDeleting
                        ? "deleting"
                        : undefined
                  }
                  helperText={subtitlesDisabledReason}
                />
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Playback options
                </p>
                <div className="mt-3 space-y-3">
                  <BulkField
                    active={isBulkFieldStaged("settings_videoLoop")}
                    onClear={() => clearBulkPaths("settings_videoLoop")}
                  >
                    <ToggleRow
                      label="Loop video"
                      checked={videoLoopEnabled}
                      onToggle={(next) =>
                        handleNodePropChange("settings_videoLoop", [
                          next ? "true" : "false",
                        ])
                      }
                    />
                  </BulkField>
                  <BulkField
                    active={isBulkFieldStaged("settings_videoAudio")}
                    onClear={() => clearBulkPaths("settings_videoAudio")}
                  >
                    <SelectField
                      label="Video audio"
                      value={videoAudioBehavior}
                      onChange={(next) =>
                        handleNodePropChange("settings_videoAudio", [next])
                      }
                      options={videoAudioSelectOptions}
                    />
                    {missingUploadedFont ? (
                      <p className="mt-2 text-xs text-[var(--warning)]">
                        Missing uploaded font.
                      </p>
                    ) : null}
                  </BulkField>
                </div>
              </div>
            </div>
          </BulkField>
        </CollapsibleSection>
        <CollapsibleSection
          title="Audio"
          titleIcon={<Music className="h-4 w-4" />}
          sectionKey="editor.node.content.audio-media"
        >
          <BulkField active={false} disabledReason={audioDisabledReason}>
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Main audio
                </p>
                <MediaFileRow
                  value={audioLabel}
                  emptyLabel="No audio set"
                  onUpload={handleAudioMainUploadClick}
                  onDelete={handleAudioMainRemove}
                  uploadDisabled={audioMainBusy || bulkActive}
                  deleteDisabled={audioMainBusy || bulkActive || !audioLabel}
                  uploadLabel="Upload main audio"
                  deleteLabel="Remove main audio"
                  status={
                    audioMainUploading
                      ? "uploading"
                      : audioMainDeleting
                        ? "deleting"
                        : undefined
                  }
                />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Alternate audio
                </p>
                <MediaFileRow
                  value={audioAltLabel}
                  emptyLabel="No audio set"
                  onUpload={handleAudioAltUploadClick}
                  onDelete={handleAudioAltRemove}
                  uploadDisabled={audioAltBusy || bulkActive}
                  deleteDisabled={audioAltBusy || bulkActive || !audioAltLabel}
                  uploadLabel="Upload alternate audio"
                  deleteLabel="Remove alternate audio"
                  status={
                    audioAltUploading
                      ? "uploading"
                      : audioAltDeleting
                        ? "deleting"
                        : undefined
                  }
                />
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Playback options
                </p>
                <div className="mt-3 space-y-3">
                  <BulkField
                    active={isBulkFieldStaged("settings_audioLoop")}
                    onClear={() => clearBulkPaths("settings_audioLoop")}
                  >
                    <ToggleRow
                      label="Loop audio"
                      checked={audioLoopEnabled}
                      onToggle={(next) =>
                        handleNodePropChange("settings_audioLoop", [
                          next ? "true" : "false",
                        ])
                      }
                    />
                  </BulkField>
                  <BulkField
                    active={isBulkFieldStaged("settings_audioFadeIn")}
                    onClear={() => clearBulkPaths("settings_audioFadeIn")}
                  >
                    <SelectField
                      label="Audio fade-in"
                      value={audioFadeIn}
                      onChange={(next) =>
                        handleNodePropChange("settings_audioFadeIn", [next])
                      }
                      options={fadeSelectOptions}
                    />
                  </BulkField>
                  <BulkField
                    active={isBulkFieldStaged("settings_audioFadeOut")}
                    onClear={() => clearBulkPaths("settings_audioFadeOut")}
                  >
                    <SelectField
                      label="Audio fade-out"
                      value={audioFadeOut}
                      onChange={(next) =>
                        handleNodePropChange("settings_audioFadeOut", [next])
                      }
                      options={fadeSelectOptions}
                    />
                  </BulkField>
                  <BulkField
                    active={isBulkFieldStaged("settings_extraAudio")}
                    onClear={() => clearBulkPaths("settings_extraAudio")}
                  >
                    <SelectField
                      label="Extra audio behavior"
                      value={extraAudioBehavior}
                      onChange={(next) =>
                        handleNodePropChange("settings_extraAudio", [next])
                      }
                      options={extraAudioSelectOptions}
                    />
                  </BulkField>
                </div>
              </div>
            </div>
          </BulkField>
        </CollapsibleSection>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleMediaInputChange}
          className="sr-only"
        />
        <input
          ref={audioMainInputRef}
          type="file"
          accept="audio/*"
          onChange={handleAudioMainInputChange}
          className="sr-only"
        />
        <input
          ref={audioAltInputRef}
          type="file"
          accept="audio/*"
          onChange={handleAudioAltInputChange}
          className="sr-only"
        />
        <input
          ref={subtitlesInputRef}
          type="file"
          accept=".vtt,text/vtt"
          onChange={handleSubtitlesInputChange}
          className="sr-only"
        />
      </div>
    </fieldset>
  );
}
