"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AdventureModel } from "@/domain/models";
import { parseAdventureDto } from "@/domain/mappers";
import { PlayerRuntime } from "@/features/player/ui/PlayerRuntime";
import {
  selectPlayerAdventure,
  selectPlayerMode,
  selectPlayerStatus,
  usePlayerStore,
} from "@/features/player/state/playerStore";
import { resolveNodeKind } from "@/features/player/engine/playerEngine";
import { Button } from "@/features/ui-core/primitives";
import { PageShell } from "@/features/ui-core/PageShell";
import { Panel } from "@/features/ui-core/Panel";

const readNumberParam = (params: URLSearchParams | null | undefined, key: string) => {
  if (!params) return null;
  const raw = params.get(key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const getDefaultStartNodeId = (adventure?: AdventureModel | null) => {
  if (!adventure?.nodes?.length) return null;
  const startNode =
    adventure.nodes.find((node) => resolveNodeKind(node) === "start") ??
    adventure.nodes[0];
  return startNode?.nodeId ?? null;
};

export default function StandalonePlayerPage() {
  const searchParams = useSearchParams();
  const status = usePlayerStore(selectPlayerStatus);
  const adventure = usePlayerStore(selectPlayerAdventure);
  const mode = usePlayerStore(selectPlayerMode);
  const loadFromAdventure = usePlayerStore((s) => s.loadFromAdventure);
  const reset = usePlayerStore((s) => s.reset);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    reset();
    return () => reset();
  }, [reset]);

  const handleFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const raw = await file.text();
        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(raw);
        } catch {
          throw new Error("Invalid JSON file.");
        }
        const parsed = parseAdventureDto(parsedJson);
        if (!parsed.ok) {
          throw new Error("Invalid adventure JSON payload.");
        }
        loadFromAdventure(parsed.data, "standalone");
        setFileName(file.name);
      } catch (err) {
        reset();
        setFileName(null);
        setLoadError(err instanceof Error ? err.message : "Failed to load file.");
      } finally {
        setIsLoading(false);
      }
    },
    [loadFromAdventure, reset]
  );

  const handlePickFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void handleFile(file);
      }
      event.target.value = "";
    },
    [handleFile]
  );

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const showPlayer = status === "ready" && Boolean(adventure) && mode === "standalone";
  const nodeIdOverride = useMemo(
    () => readNumberParam(searchParams, "nodeId") ?? readNumberParam(searchParams, "nodeid"),
    [searchParams]
  );
  const startNodeId = useMemo(() => {
    const defaultStart = getDefaultStartNodeId(adventure);
    if (!nodeIdOverride || !adventure?.nodes?.length) return defaultStart;
    const exists = adventure.nodes.some((node) => node.nodeId === nodeIdOverride);
    return exists ? nodeIdOverride : defaultStart;
  }, [adventure, nodeIdOverride]);

  if (!showPlayer) {
    return (
      <PageShell>
        <Panel title="Standalone player">
          <div className="space-y-3 text-sm">
            <p className="text-[var(--muted)]">
              Load an adventure JSON file to run the player without any API calls.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={openFilePicker} size="sm" disabled={isLoading}>
                {isLoading ? "Loading..." : "Choose file"}
              </Button>
              {fileName ? <span className="text-xs opacity-80">{fileName}</span> : null}
            </div>
            {loadError ? (
              <p className="text-sm text-red-200">Error: {loadError}</p>
            ) : null}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            onChange={handlePickFile}
            hidden
          />
        </Panel>
      </PageShell>
    );
  }

  return (
    <>
      <PlayerRuntime />
      <div className="pointer-events-none fixed right-10 bottom-6 z-50 max-w-[320px] rounded-xl bg-black/60 p-3 text-xs text-white shadow-lg backdrop-blur">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">
          Standalone
        </p>
        <p className="mt-2 font-semibold">
          Loaded: {adventure?.title || "Untitled adventure"}
        </p>
        <p className="opacity-80">Nodes: {adventure?.nodes.length ?? 0}</p>
        <p className="opacity-80">
          Start: node {startNodeId ?? "?"}
          {nodeIdOverride ? " (override)" : ""}
        </p>
        <div className="pointer-events-auto mt-3">
          <Button onClick={openFilePicker} size="sm" variant="secondary">
            Load another file
          </Button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        onChange={handlePickFile}
        hidden
      />
    </>
  );
}
