import type { AdventureModel, NodeModel } from "@/domain/models";
import type { AudioSourceConfig } from "@/features/player/media/audioEngine";
import { booleanFromTokens, pickFirstString, readRawProp, tokenize } from "./propsParser";
import { resolveAudioCandidates } from "./mediaHelpers";

export const clampVolume = (value: number, fallback = 1) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, 0), 1);
};

export const normalizeAudioVolume = (value: unknown): number => {
  if (value === undefined || value === null) return 1;
  const primary = Array.isArray(value) ? value[0] : value;
  const numeric = Number(primary);
  if (!Number.isFinite(numeric)) return 1;
  const hasDecimal =
    typeof primary === "string" ? primary.includes(".") : !Number.isInteger(numeric);
  // Sliders emit integers (0-100). Treat integers as percentage values.
  if (numeric >= 0 && numeric <= 1 && hasDecimal) {
    return clampVolume(numeric);
  }
  if (numeric >= 0 && numeric <= 100) {
    return clampVolume(numeric / 100);
  }
  return clampVolume(numeric / 100);
};

export const coerceSeconds = (value: unknown): number | null => {
  if (value === undefined || value === null) return null;
  const primary = Array.isArray(value) ? value[0] : value;
  const numeric = Number(primary);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, numeric);
};

export const buildAudioSourceConfig = (
  node?: NodeModel | null,
  adventure?: AdventureModel | null
): AudioSourceConfig | null => {
  if (!node) return null;
  const rawProps = node.rawProps as Record<string, unknown> | null | undefined;
  const mainRaw =
    pickFirstString(readRawProp(rawProps, ["audio_url", "audioUrl"])) ??
    pickFirstString((node.props as Record<string, unknown> | null | undefined)?.["audioUrl"]);
  const altRaw =
    pickFirstString(readRawProp(rawProps, ["audio_url_alt", "audioUrlAlt"])) ??
    pickFirstString((node.props as Record<string, unknown> | null | undefined)?.["audioUrlAlt"]);
  const volumeRaw =
    readRawProp(rawProps, ["audio_volume", "audioVolume"]) ??
    (node.props as Record<string, unknown> | null | undefined)?.["audioVolume"];
  const fadeIn = coerceSeconds(readRawProp(rawProps, ["settings_audioFadeIn", "audioFadeIn"]));
  const fadeOut = coerceSeconds(readRawProp(rawProps, ["settings_audioFadeOut", "audioFadeOut"]));
  const loop = booleanFromTokens(readRawProp(rawProps, ["settings_audioLoop", "audioLoop"]));
  const extraAudioTokens = tokenize(readRawProp(rawProps, ["settings_extraAudio", "extraAudio"])).map(
    (token) => token.toLowerCase()
  );
  const altBehavior: AudioSourceConfig["altBehavior"] = extraAudioTokens.includes("play_once")
    ? "play_once"
    : "always";

  return {
    nodeId: node.nodeId ?? null,
    mainCandidates: resolveAudioCandidates(adventure?.slug, adventure?.viewSlug, mainRaw),
    altCandidates: resolveAudioCandidates(adventure?.slug, adventure?.viewSlug, altRaw),
    volume: normalizeAudioVolume(volumeRaw),
    fadeInSeconds: fadeIn ?? undefined,
    fadeOutSeconds: fadeOut ?? undefined,
    loop,
    altBehavior,
  };
};
