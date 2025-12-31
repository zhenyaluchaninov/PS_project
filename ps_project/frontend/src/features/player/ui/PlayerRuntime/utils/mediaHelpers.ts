import type { AdventureModel, NodeModel } from "@/domain/models";
import { resolveVideoSource } from "@/features/player/engine/playerEngine";
import { booleanFromTokens, pickFirstString, readRawProp, tokenize } from "./propsParser";

export const resolveUploadCandidates = (
  adventureSlug: string | null | undefined,
  adventureViewSlug: string | null | undefined,
  rawValue: string | null
) => {
  if (!rawValue) return [];
  const value = rawValue.trim();
  const candidates: string[] = [];

  const push = (url: string | null | undefined) => {
    if (!url) return;
    if (!candidates.includes(url)) candidates.push(url);
  };

  if (/^https?:\/\//i.test(value)) {
    push(value);
    return candidates;
  }

  if (value.startsWith("/upload/")) {
    push(value);
  } else if (value.startsWith("/")) {
    push(value);
  } else {
    const trimmedFile = value.replace(/^\/+/, "");
    const slug = adventureSlug || adventureViewSlug || "";
    if (slug) {
      push(`/upload/${slug}/${trimmedFile}`);
    }
    if (adventureViewSlug && adventureViewSlug !== slug) {
      push(`/upload/${adventureViewSlug}/${trimmedFile}`);
    }
    push(`/upload/${trimmedFile}`);
  }

  push(value);

  return candidates;
};

export const resolveSubtitleCandidates = (
  adventureSlug: string | null | undefined,
  adventureViewSlug: string | null | undefined,
  rawValue: string | null
) => resolveUploadCandidates(adventureSlug, adventureViewSlug, rawValue);

export const resolveAudioCandidates = (
  adventureSlug: string | null | undefined,
  adventureViewSlug: string | null | undefined,
  rawValue: string | null
) => resolveUploadCandidates(adventureSlug, adventureViewSlug, rawValue);

export const getRawSubtitlesValue = (node?: NodeModel | null) => {
  if (!node) return null;
  if (node.props && "subtitlesUrl" in node.props && node.props.subtitlesUrl) {
    return node.props.subtitlesUrl;
  }
  const raw = node.rawProps as Record<string, unknown> | null | undefined;
  const rawValue = raw?.["subtitles_url"] ?? raw?.["subtitlesUrl"];
  return typeof rawValue === "string" ? rawValue : null;
};

export const isVideoUrl = (value?: string | null): boolean =>
  typeof value === "string" && value.toLowerCase().includes(".mp4");

export const resolveNodeImageUrl = (
  node?: NodeModel | null,
  adventure?: AdventureModel | null
): string | null => {
  if (!node) return null;
  const propsRecord = node.props as Record<string, unknown> | null | undefined;
  const rawCandidate =
    node.image?.url ??
    pickFirstString(readRawProp(node.rawProps, ["image_url", "imageUrl"])) ??
    pickFirstString(readRawProp(propsRecord, ["image_url", "imageUrl"]));
  if (!rawCandidate) return null;
  const candidates = resolveUploadCandidates(
    adventure?.slug,
    adventure?.viewSlug,
    rawCandidate
  );
  return candidates[0] ?? rawCandidate;
};

export const resolveNodeVideoSource = (
  node?: NodeModel | null,
  imageUrl?: string | null
): string | null => {
  if (imageUrl && isVideoUrl(imageUrl)) return imageUrl;
  return resolveVideoSource(node);
};

export const applyMediaOverscan = (root: HTMLElement) => {
  const computed = window.getComputedStyle(root);
  const blurValue = Number.parseFloat(
    computed.getPropertyValue("--player-media-blur")
  );
  const blur = Number.isFinite(blurValue) ? blurValue : 0;
  if (blur <= 0) {
    root.style.setProperty("--player-media-scale-x", "1");
    root.style.setProperty("--player-media-scale-y", "1");
    return;
  }

  const rect = root.getBoundingClientRect();
  const width = rect.width || 1;
  const height = rect.height || 1;
  const padding = blur * 2;
  const scaleX = Math.max(1, 1 + (padding * 2) / width);
  const scaleY = Math.max(1, 1 + (padding * 2) / height);

  root.style.setProperty("--player-media-scale-x", scaleX.toFixed(4));
  root.style.setProperty("--player-media-scale-y", scaleY.toFixed(4));
};

export const getVideoLoopSetting = (node?: NodeModel | null): boolean => {
  const rawProps = node?.rawProps as Record<string, unknown> | null | undefined;
  const value = readRawProp(rawProps, ["settings_videoLoop", "videoLoop"]);
  if (value === undefined) return true;
  return booleanFromTokens(value);
};

export const getVideoAudioSetting = (
  node?: NodeModel | null
): "off" | "off_mobile" | "" => {
  const rawProps = node?.rawProps as Record<string, unknown> | null | undefined;
  const tokens = tokenize(readRawProp(rawProps, ["settings_videoAudio", "videoAudio"]));
  const value = tokens[0]?.toLowerCase() ?? "";
  return value === "off" || value === "off_mobile" ? value : "";
};
