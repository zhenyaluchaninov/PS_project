import { useEffect, useRef, useState } from "react";
import {
  createAudioEngine,
  type AudioDebugSnapshot,
  type AudioEngine,
  type AudioSourceConfig,
} from "@/features/player/media/audioEngine";

type UseAudioEngineParams = {
  debugMedia: boolean;
  soundEnabled: boolean;
  canAutoplay: boolean;
  documentVisible: boolean;
  audioSource: AudioSourceConfig | null;
  adventureSlug?: string | null;
};

export const useAudioEngine = ({
  debugMedia,
  soundEnabled,
  canAutoplay,
  documentVisible,
  audioSource,
  adventureSlug,
}: UseAudioEngineParams) => {
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const [audioDebug, setAudioDebug] = useState<AudioDebugSnapshot | null>(null);

  useEffect(() => {
    const engine = createAudioEngine();
    audioEngineRef.current = engine;
    return () => {
      engine.dispose();
      audioEngineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    engine.setDebugListener(debugMedia ? setAudioDebug : undefined);
    if (!debugMedia) {
      setAudioDebug(null);
    } else {
      setAudioDebug(engine.getDebugState());
    }
  }, [debugMedia]);

  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    engine.reset();
  }, [adventureSlug]);

  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    engine.setPlaybackState({
      soundEnabled,
      canAutoplay,
      isDocumentVisible: documentVisible,
    });
  }, [documentVisible, soundEnabled, canAutoplay]);

  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    engine.setSource(audioSource);
    if (audioSource) {
      engine.preload([...audioSource.mainCandidates, ...audioSource.altCandidates]);
    }
  }, [audioSource]);

  return { audioDebug };
};
