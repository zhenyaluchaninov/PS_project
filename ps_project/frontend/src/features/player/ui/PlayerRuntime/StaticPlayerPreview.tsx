"use client";

import { useMemo, useRef } from "react";
import type { AdventureModel, NodeModel } from "@/domain/models";
import { PlayerLayout } from "@/features/ui-core/components/PlayerLayout";
import { buildPropsStyle } from "@/features/ui-core/props";
import { cn } from "@/lib/utils";
import { buildNavigationConfig } from "../../utils/navigationUtils";
import { buildNodeById, resolveNodeKind } from "../../utils/nodeUtils";
import { NavigationArea, NodeContent, PlayerOverlay } from "./components";
import { useLoadAdventureFonts } from "./hooks/useLoadAdventureFonts";
import { useMediaOverscan } from "./hooks/useMediaOverscan";
import { buildNavigationModel } from "./navigation/buildNavigationModel";
import { getNavigationLinksForNode } from "./navigation/helpers";
import type { NavigationModel } from "./navigation/types";
import type { MenuShortcutItem } from "./types";
import { buildLegacyContent } from "./utils/contentHelpers";
import { resolveNodeImageUrl, resolveNodeVideoSource } from "./utils/mediaHelpers";
import { readMenuOptions, readMenuShortcuts } from "./utils/menuHelpers";
import { parsePropsInput } from "./utils/propsParser";

export function StaticPlayerPreview({
  adventure,
  node,
  className,
}: {
  adventure: AdventureModel;
  node: NodeModel;
  className?: string;
}) {
  const playerRootRef = useRef<HTMLDivElement | null>(null);
  const adventureProps = adventure.props as Record<string, unknown> | null | undefined;
  const mergedNodeProps = useMemo(
    () => ({
      ...parsePropsInput(node.rawProps),
      ...parsePropsInput(node.props),
    }),
    [node.rawProps, node.props]
  );

  const propsResult = useMemo(
    () =>
      buildPropsStyle({
        adventureProps: adventure.props ?? undefined,
        nodeProps: mergedNodeProps,
      }),
    [adventure.props, mergedNodeProps]
  );

  const { style: propsStyle, flags, dataProps, layout, media, typography } = propsResult;
  useMediaOverscan(playerRootRef, media.filter);
  const legacyContent = useMemo(
    () => buildLegacyContent(node, mergedNodeProps),
    [node, mergedNodeProps]
  );

  useLoadAdventureFonts(adventure.props?.fontList);

  const menuOptions = useMemo(() => readMenuOptions(adventureProps ?? null), [adventureProps]);
  const menuShortcuts = useMemo(() => readMenuShortcuts(adventureProps ?? null), [adventureProps]);
  const menuButtons = useMemo(
    () => ({
      back: menuOptions.includes("back"),
      home: menuOptions.includes("home"),
      menu: menuOptions.includes("menu"),
      sound: menuOptions.includes("sound"),
    }),
    [menuOptions]
  );
  const homeShortcut = menuShortcuts[0];
  const homeTargetId = homeShortcut?.nodeId ?? null;
  const homeLabel = homeShortcut?.text?.trim() ?? "";
  const menuShortcutItems = useMemo(() => {
    const items = menuShortcuts.slice(1).map((shortcut, index) => ({
      nodeId: shortcut.nodeId,
      label:
        shortcut.text?.trim() ||
        (shortcut.nodeId != null ? `Node #${shortcut.nodeId}` : `Shortcut ${index + 1}`),
    }));
    return items.filter(
      (shortcut): shortcut is MenuShortcutItem => shortcut.nodeId != null
    );
  }, [menuShortcuts]);

  const navigationConfig = useMemo(
    () => buildNavigationConfig(mergedNodeProps),
    [mergedNodeProps]
  );

  const nodeById = useMemo(() => buildNodeById(adventure.nodes), [adventure.nodes]);

  const navigationLinks = useMemo(
    () => getNavigationLinksForNode(node.nodeId, adventure.links),
    [adventure.links, node.nodeId]
  );

  const visitedNodes = useMemo(() => new Set<number>(), []);

  const navigationModel = useMemo<NavigationModel>(() => {
    return buildNavigationModel({
      currentNode: node,
      currentNodeId: node.nodeId,
      currentNodeProps: mergedNodeProps,
      navigationLinks,
      navigationConfig,
      getNodeById: (nodeId) => (nodeId != null ? nodeById.get(nodeId) : undefined),
      visitedNodes,
    });
  }, [
    mergedNodeProps,
    navigationConfig.hideVisited,
    navigationConfig.orderedIds,
    navigationConfig.showCurrent,
    navigationConfig.skipCount,
    navigationConfig.style,
    node.nodeId,
    nodeById,
    navigationLinks,
    visitedNodes,
  ]);

  const nodeKind = useMemo(() => resolveNodeKind(node), [node]);
  const isVideoNode = nodeKind === "video";

  const playerClassName = cn(
    "ps-player--embedded",
    "ps-player--legacy-skin",
    "ps-player--static",
    `ps-player--nav-${navigationConfig.style}`,
    navigationConfig.placement === "bottom" ? "ps-player--nav-bottom" : "",
    className
  );

  const resolvedImageUrl = resolveNodeImageUrl(node, adventure);
  const videoSource = resolveNodeVideoSource(node, resolvedImageUrl);
  const backgroundImage = videoSource ? null : resolvedImageUrl;
  const backgroundVideo = videoSource
    ? {
        src: videoSource,
        muted: true,
        controls: false,
        loop: false,
        autoPlay: false,
        preload: "metadata" as const,
      }
    : undefined;

  const contentDataProps = [
    dataProps.player_container,
    dataProps.inner_container,
    dataProps.text_block,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const canGoHome = homeTargetId != null && homeTargetId !== node.nodeId;
  const menuRef = useRef<HTMLDivElement | null>(null);

  const overlayContent = (
    <div className="ps-overlay-shell space-y-2">
      <PlayerOverlay
        canGoBack={false}
        canGoHome={canGoHome}
        showBackButton={false}
        showHomeButton={menuButtons.home}
        showMenuButton={menuButtons.menu}
        showSoundButton={menuButtons.sound}
        homeLabel={homeLabel}
        menuShortcuts={menuShortcutItems}
        menuOpen={false}
        highContrast={flags.highContrast}
        hideBackground={flags.hideBackground}
        soundEnabled
        statisticsEnabled={false}
        statisticsDisabled
        statisticsDisabledReason={null}
        navigationStyle={navigationConfig.style}
        navPlacement={navigationConfig.placement}
        gameNodeId={node.nodeId ?? null}
        viewportActiveNodeId={node.nodeId ?? null}
        scrollytellActive={false}
        onBack={() => undefined}
        onHome={() => undefined}
        onToggleMenu={() => undefined}
        onCloseMenu={() => undefined}
        onToggleHighContrast={() => undefined}
        onToggleHideBackground={() => undefined}
        onToggleSound={() => undefined}
        onToggleStatistics={() => undefined}
        onShortcut={() => undefined}
        menuRef={menuRef}
        showDebug={false}
      />
    </div>
  );

  return (
    <PlayerLayout
      className={playerClassName}
      style={propsStyle}
      overlayColor={flags.hideBackground ? null : typography.overlayColor ?? undefined}
      highContrast={flags.highContrast}
      backgroundImage={backgroundImage}
      backgroundVideo={backgroundVideo}
      hideBackground={flags.hideBackground}
      mediaFilter={media.filter}
      objectFit={media.objectFit}
      backgroundPosition={media.backgroundPosition}
      backgroundSize={media.backgroundSize}
      rootRef={playerRootRef}
      dataProps={{
        background: dataProps.background,
        backgroundImage: dataProps.background_image,
        player: dataProps.player,
        content: contentDataProps,
      }}
      layout={{
        verticalAlign: layout.verticalAlign,
        containerWidthVw: layout.containerWidthVw,
        containerMarginsVw: layout.containerMarginsVw,
        textAlign: layout.textAlign,
      }}
      overlay={overlayContent}
    >
      <>
        <div className="ps-player__text">
          <div className="ps-player__card">
            <NodeContent
              nodeText={legacyContent.value}
              allowMarkdown={legacyContent.allowMarkdown}
            />
          </div>
        </div>
        <div className="ps-player__nav">
          <NavigationArea
            navStyle={navigationConfig.style}
            navPlacement={navigationConfig.placement}
            swipeMode={navigationConfig.swipeMode}
            buttons={navigationModel.buttons}
            primaryLinkId={navigationModel.primaryLinkId}
            showLeftArrow={navigationConfig.style === "leftright"}
            showRightArrow={
              navigationConfig.style === "leftright" || navigationConfig.style === "right"
            }
            showDownArrow={false}
            interactionDisabled
            onChooseLink={() => undefined}
            onBack={() => undefined}
            disableBack
          />
        </div>
      </>
    </PlayerLayout>
  );
}
