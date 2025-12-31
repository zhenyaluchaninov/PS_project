import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NodeModel } from "@/domain/models";
import { trackNodeVisit } from "@/features/state/api/adventures";
import type { StatsDebugState } from "../types";
import { booleanFromTokens, readRawProp } from "../utils/propsParser";

const isStatisticsEnabledForNode = (node?: NodeModel | null): boolean => {
  if (!node?.rawProps) return false;
  return booleanFromTokens(
    readRawProp(node.rawProps, ["node_statistics", "nodeStatistics", "node-statistics"])
  );
};

type UseStatsTrackingParams = {
  adventureSlug?: string | null;
  currentNode?: NodeModel | null;
  statisticsAllowed: boolean;
  statisticsEnabled: boolean;
};

export const useStatsTracking = ({
  adventureSlug,
  currentNode,
  statisticsAllowed,
  statisticsEnabled,
}: UseStatsTrackingParams) => {
  const statsSessionRef = useRef<{ adventureSlug: string | null; seen: Set<number> }>(
    {
      adventureSlug: null,
      seen: new Set(),
    }
  );
  const lastNodeKeyRef = useRef<string | null>(null);
  const [statsDebug, setStatsDebug] = useState<StatsDebugState>(() => ({
    lastAttempt: null,
    sent: 0,
    deduped: 0,
    skippedDisabled: 0,
    errors: 0,
  }));

  const nodeStatisticsEnabled = useMemo(
    () => isStatisticsEnabledForNode(currentNode),
    [currentNode?.rawProps]
  );

  const bumpStatsDebug = useCallback(
    (
      kind: "sent" | "deduped" | "skipped" | "error",
      lastAttempt?: StatsDebugState["lastAttempt"]
    ) => {
      setStatsDebug((prev) => {
        const next = { ...prev, lastAttempt: lastAttempt ?? prev.lastAttempt };
        if (kind === "sent") {
          next.sent = prev.sent + 1;
        } else if (kind === "deduped") {
          next.deduped = prev.deduped + 1;
        } else if (kind === "skipped") {
          next.skippedDisabled = prev.skippedDisabled + 1;
        } else {
          next.errors = prev.errors + 1;
        }
        return next;
      });
    },
    []
  );

  useEffect(() => {
    const slug = adventureSlug ?? null;
    if (statsSessionRef.current.adventureSlug === slug) return;
    statsSessionRef.current = { adventureSlug: slug, seen: new Set() };
    lastNodeKeyRef.current = null;
    setStatsDebug({
      lastAttempt: null,
      sent: 0,
      deduped: 0,
      skippedDisabled: 0,
      errors: 0,
    });
  }, [adventureSlug]);

  useEffect(() => {
    const nodeId = currentNode?.nodeId;
    const slug = adventureSlug ?? null;
    if (nodeId == null || !Number.isFinite(nodeId) || !slug) return;

    const nodeKey = `${slug}:${nodeId}`;
    if (lastNodeKeyRef.current === nodeKey) return;
    lastNodeKeyRef.current = nodeKey;

    const lastAttempt = { nodeId, adventureSlug: slug };

    if (!statisticsAllowed || !statisticsEnabled || !nodeStatisticsEnabled) {
      bumpStatsDebug("skipped", lastAttempt);
      return;
    }

    const session = statsSessionRef.current;
    if (session.seen.has(nodeId)) {
      bumpStatsDebug("deduped", lastAttempt);
      return;
    }

    session.seen.add(nodeId);
    bumpStatsDebug("sent", lastAttempt);
    void trackNodeVisit(slug, nodeId).catch(() => {
      bumpStatsDebug("error");
    });
  }, [
    adventureSlug,
    bumpStatsDebug,
    currentNode?.nodeId,
    nodeStatisticsEnabled,
    statisticsAllowed,
    statisticsEnabled,
  ]);

  return { statsDebug, nodeStatisticsEnabled };
};
