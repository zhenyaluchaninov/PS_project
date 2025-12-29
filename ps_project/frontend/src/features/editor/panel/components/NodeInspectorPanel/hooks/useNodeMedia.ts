import { useRef, useState, type ChangeEvent } from "react";
import type { NodeModel } from "@/domain/models";
import { uploadMedia, deleteMedia } from "@/features/state/api/media";
import { toastError } from "@/features/ui-core/toast";
import type { BulkDraft } from "../../types";
import {
  getMediaBasename,
  getMediaLabel,
  isVideoMedia,
} from "../utils/formatters";
import { getMediaPropString } from "../utils/propReaders";

export const useNodeMedia = ({
  node,
  editSlug,
  bulkActive,
  bulkDraft,
  onNodeImageUrlChange,
  onNodePropsChange,
}: {
  node: NodeModel;
  editSlug?: string;
  bulkActive: boolean;
  bulkDraft: BulkDraft;
  onNodeImageUrlChange: (url: string | null) => void;
  onNodePropsChange: (updates: Record<string, unknown>) => void;
}) => {
  const setMediaPropValue = (
    snakeKey: string,
    camelKey: string,
    value: string | null
  ) => {
    onNodePropsChange({
      [snakeKey]: value,
      [camelKey]: value,
    });
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaDeleting, setMediaDeleting] = useState(false);
  const mediaUrl = node.image.url ?? null;
  const mediaBasename = mediaUrl ? getMediaBasename(mediaUrl) : "";
  const mediaIsVideo = isVideoMedia(mediaUrl);
  const mediaLabel = getMediaLabel(mediaUrl);
  const imageLabel = mediaIsVideo ? "" : mediaLabel;
  const videoLabel = mediaIsVideo ? mediaLabel : "";
  const subtitlesUrl = getMediaPropString(
    node,
    ["subtitles_url", "subtitlesUrl"],
    bulkDraft
  );
  const subtitlesLabel = getMediaLabel(subtitlesUrl);
  const audioUrl = getMediaPropString(node, ["audio_url", "audioUrl"], bulkDraft);
  const audioLabel = getMediaLabel(audioUrl);
  const audioAltUrl = getMediaPropString(
    node,
    ["audio_url_alt", "audioUrlAlt"],
    bulkDraft
  );
  const audioAltLabel = getMediaLabel(audioAltUrl);
  const mediaBusy = mediaUploading || mediaDeleting;
  const mediaDisabledReason = bulkActive
    ? "Bulk edit disabled: background media is per-node."
    : undefined;
  const audioDisabledReason = bulkActive
    ? "Bulk edit disabled: audio media is per-node."
    : undefined;
  const subtitlesDisabledReason = !mediaIsVideo
    ? "Subtitles require a video background (.mp4)."
    : undefined;
  const [audioMainUploading, setAudioMainUploading] = useState(false);
  const [audioMainDeleting, setAudioMainDeleting] = useState(false);
  const [audioAltUploading, setAudioAltUploading] = useState(false);
  const [audioAltDeleting, setAudioAltDeleting] = useState(false);
  const [subtitlesUploading, setSubtitlesUploading] = useState(false);
  const [subtitlesDeleting, setSubtitlesDeleting] = useState(false);
  const audioMainBusy = audioMainUploading || audioMainDeleting;
  const audioAltBusy = audioAltUploading || audioAltDeleting;
  const subtitlesBusy = subtitlesUploading || subtitlesDeleting;
  const audioMainInputRef = useRef<HTMLInputElement | null>(null);
  const audioAltInputRef = useRef<HTMLInputElement | null>(null);
  const subtitlesInputRef = useRef<HTMLInputElement | null>(null);

  const handleMediaUploadClick = () => {
    if (mediaBusy || bulkActive) return;
    fileInputRef.current?.click();
  };

  const handleMediaInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (bulkActive) {
      event.currentTarget.value = "";
      return;
    }
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!editSlug) {
      toastError("Media upload failed", "Missing adventure slug.");
      return;
    }
    setMediaUploading(true);
    try {
      const result = await uploadMedia(editSlug, file);
      if (!result?.url) {
        throw new Error("Upload did not return a URL.");
      }
      onNodeImageUrlChange(result.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toastError("Media upload failed", message);
    } finally {
      setMediaUploading(false);
    }
  };

  const handleMediaRemove = async () => {
    if (mediaBusy || bulkActive) return;
    if (!mediaUrl) return;
    if (!editSlug) {
      toastError("Media delete failed", "Missing adventure slug.");
      return;
    }
    if (!mediaBasename) {
      toastError("Media delete failed", "Could not resolve media filename.");
      return;
    }
    setMediaDeleting(true);
    try {
      await deleteMedia(editSlug, mediaBasename);
      onNodeImageUrlChange(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toastError("Media delete failed", message);
    } finally {
      setMediaDeleting(false);
    }
  };

  const handlePropMediaUpload = async (
    file: File,
    setBusy: (next: boolean) => void,
    onSuccess: (url: string) => void,
    errorTitle: string
  ) => {
    if (!editSlug) {
      toastError(errorTitle, "Missing adventure slug.");
      return;
    }
    setBusy(true);
    try {
      const result = await uploadMedia(editSlug, file);
      if (!result?.url) {
        throw new Error("Upload did not return a URL.");
      }
      onSuccess(result.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toastError(errorTitle, message);
    } finally {
      setBusy(false);
    }
  };

  const handlePropMediaDelete = async (
    url: string | null,
    setBusy: (next: boolean) => void,
    onSuccess: () => void,
    errorTitle: string
  ) => {
    if (!editSlug) {
      toastError(errorTitle, "Missing adventure slug.");
      return;
    }
    if (!url) return;
    const basename = getMediaBasename(url);
    if (!basename) {
      toastError(errorTitle, "Could not resolve media filename.");
      return;
    }
    setBusy(true);
    try {
      await deleteMedia(editSlug, basename);
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toastError(errorTitle, message);
    } finally {
      setBusy(false);
    }
  };

  const handleAudioMainUploadClick = () => {
    if (audioMainBusy || bulkActive) return;
    audioMainInputRef.current?.click();
  };

  const handleAudioAltUploadClick = () => {
    if (audioAltBusy || bulkActive) return;
    audioAltInputRef.current?.click();
  };

  const handleSubtitlesUploadClick = () => {
    if (subtitlesBusy || bulkActive || !mediaIsVideo) return;
    subtitlesInputRef.current?.click();
  };

  const handleAudioMainInputChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    if (bulkActive) {
      event.currentTarget.value = "";
      return;
    }
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    await handlePropMediaUpload(
      file,
      setAudioMainUploading,
      (url) => setMediaPropValue("audio_url", "audioUrl", url),
      "Audio upload failed"
    );
  };

  const handleAudioAltInputChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    if (bulkActive) {
      event.currentTarget.value = "";
      return;
    }
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    await handlePropMediaUpload(
      file,
      setAudioAltUploading,
      (url) => setMediaPropValue("audio_url_alt", "audioUrlAlt", url),
      "Alternate audio upload failed"
    );
  };

  const handleSubtitlesInputChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    if (bulkActive || !mediaIsVideo) {
      event.currentTarget.value = "";
      return;
    }
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    await handlePropMediaUpload(
      file,
      setSubtitlesUploading,
      (url) => setMediaPropValue("subtitles_url", "subtitlesUrl", url),
      "Subtitles upload failed"
    );
  };

  const handleAudioMainRemove = async () => {
    if (audioMainBusy || bulkActive) return;
    await handlePropMediaDelete(
      audioUrl,
      setAudioMainDeleting,
      () => setMediaPropValue("audio_url", "audioUrl", null),
      "Audio delete failed"
    );
  };

  const handleAudioAltRemove = async () => {
    if (audioAltBusy || bulkActive) return;
    await handlePropMediaDelete(
      audioAltUrl,
      setAudioAltDeleting,
      () => setMediaPropValue("audio_url_alt", "audioUrlAlt", null),
      "Alternate audio delete failed"
    );
  };

  const handleSubtitlesRemove = async () => {
    if (subtitlesBusy || bulkActive || !mediaIsVideo) return;
    await handlePropMediaDelete(
      subtitlesUrl,
      setSubtitlesDeleting,
      () => setMediaPropValue("subtitles_url", "subtitlesUrl", null),
      "Subtitles delete failed"
    );
  };

  return {
    fileInputRef,
    audioMainInputRef,
    audioAltInputRef,
    subtitlesInputRef,
    mediaUrl,
    mediaIsVideo,
    imageLabel,
    videoLabel,
    subtitlesLabel,
    audioLabel,
    audioAltLabel,
    mediaBusy,
    mediaUploading,
    mediaDeleting,
    audioMainBusy,
    audioMainUploading,
    audioMainDeleting,
    audioAltBusy,
    audioAltUploading,
    audioAltDeleting,
    subtitlesBusy,
    subtitlesUploading,
    subtitlesDeleting,
    mediaDisabledReason,
    audioDisabledReason,
    subtitlesDisabledReason,
    handleMediaUploadClick,
    handleMediaInputChange,
    handleMediaRemove,
    handleAudioMainUploadClick,
    handleAudioMainInputChange,
    handleAudioMainRemove,
    handleAudioAltUploadClick,
    handleAudioAltInputChange,
    handleAudioAltRemove,
    handleSubtitlesUploadClick,
    handleSubtitlesInputChange,
    handleSubtitlesRemove,
  };
};
