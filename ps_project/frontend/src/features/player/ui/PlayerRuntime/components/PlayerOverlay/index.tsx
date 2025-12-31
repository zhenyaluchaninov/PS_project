import type { MutableRefObject } from "react";
import {
  ArrowLeft,
  Home,
  Menu as MenuIcon,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type {
  NavPlacement,
  NavStyle,
} from "@/features/player/utils/navigationUtils";
import type { MenuShortcutItem } from "../../types";
import { OverlayButton } from "./OverlayButton";
import { OverlayShortcutRow } from "./OverlayShortcutRow";
import { OverlayToggleRow } from "./OverlayToggleRow";

export function PlayerOverlay({
  canGoBack,
  canGoHome,
  showBackButton,
  showHomeButton,
  showMenuButton,
  showSoundButton,
  homeLabel,
  menuShortcuts,
  menuOpen,
  highContrast,
  hideBackground,
  soundEnabled,
  statisticsEnabled,
  statisticsDisabled,
  statisticsDisabledReason,
  navigationStyle,
  navPlacement,
  gameNodeId,
  viewportActiveNodeId,
  scrollytellActive,
  onBack,
  onHome,
  onToggleMenu,
  onCloseMenu,
  onToggleHighContrast,
  onToggleHideBackground,
  onToggleSound,
  onToggleStatistics,
  onShortcut,
  menuRef,
  showDebug,
}: {
  canGoBack: boolean;
  canGoHome: boolean;
  showBackButton: boolean;
  showHomeButton: boolean;
  showMenuButton: boolean;
  showSoundButton: boolean;
  homeLabel?: string;
  menuShortcuts: MenuShortcutItem[];
  menuOpen: boolean;
  highContrast: boolean;
  hideBackground: boolean;
  soundEnabled: boolean;
  statisticsEnabled: boolean;
  statisticsDisabled: boolean;
  statisticsDisabledReason?: string | null;
  navigationStyle: NavStyle;
  navPlacement: NavPlacement;
  gameNodeId: number | null;
  viewportActiveNodeId: number | null;
  scrollytellActive: boolean;
  onBack: () => void;
  onHome: () => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onToggleHighContrast: () => void;
  onToggleHideBackground: () => void;
  onToggleSound: () => void;
  onToggleStatistics: () => void;
  onShortcut: (nodeId: number) => void;
  menuRef: MutableRefObject<HTMLDivElement | null>;
  showDebug: boolean;
}) {
  const showLeftGroup = showBackButton;
  const showRightGroup = showHomeButton || showSoundButton || showMenuButton;

  return (
    <div className="ps-overlay" data-menu-open={menuOpen ? "true" : undefined}>
      {showLeftGroup || showRightGroup ? (
        <div className="ps-overlay__bar">
          {showLeftGroup ? (
            <div className="ps-overlay__group ps-overlay__group--left">
              {showBackButton ? (
                <OverlayButton
                  label="Back"
                  icon={<ArrowLeft aria-hidden />}
                  disabled={!canGoBack}
                  onClick={onBack}
                  iconOnly
                />
              ) : null}
            </div>
          ) : null}
          {showRightGroup ? (
            <div className="ps-overlay__group ps-overlay__group--right ps-overlay__group--stack">
              {showHomeButton ? (
                <OverlayButton
                  label={homeLabel ? `Home: ${homeLabel}` : "Home"}
                  icon={<Home aria-hidden />}
                  disabled={!canGoHome}
                  onClick={onHome}
                  iconOnly
                />
              ) : null}
              {showSoundButton ? (
                <OverlayButton
                  label={soundEnabled ? "Sound on" : "Sound muted"}
                  icon={soundEnabled ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
                  onClick={onToggleSound}
                  active={soundEnabled}
                  ariaPressed={soundEnabled}
                  iconOnly
                />
              ) : null}
              {showMenuButton ? (
                <OverlayButton
                  label={menuOpen ? "Close menu" : "Open menu"}
                  icon={menuOpen ? <X aria-hidden /> : <MenuIcon aria-hidden />}
                  onClick={menuOpen ? onCloseMenu : onToggleMenu}
                  active={menuOpen}
                  ariaExpanded={menuOpen}
                  iconOnly
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {menuOpen && showMenuButton ? (
        <>
          <div className="ps-overlay__backdrop" onClick={onCloseMenu} />
          <div
            className="ps-overlay__panel"
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Player menu"
          >
            <div className="ps-overlay__panel-header">
              <span className="ps-overlay__panel-title">Settings</span>
              <button
                type="button"
                className="ps-overlay__panel-close"
                onClick={onCloseMenu}
                aria-label="Close menu"
              >
                <X aria-hidden />
              </button>
            </div>

            <div className="ps-overlay__panel-body">
              {menuShortcuts.length ? (
                <>
                  <span className="ps-overlay__panel-title">Shortcuts</span>
                  {menuShortcuts.map((shortcut, index) => (
                    <OverlayShortcutRow
                      key={`${shortcut.nodeId}-${index}`}
                      label={shortcut.label}
                      nodeId={shortcut.nodeId}
                      onClick={() => onShortcut(shortcut.nodeId)}
                    />
                  ))}
                </>
              ) : null}
              <OverlayToggleRow
                label="High contrast"
                description="Stronger contrast for text and UI"
                value={highContrast}
                onToggle={onToggleHighContrast}
              />
              <OverlayToggleRow
                label="Hide background"
                description="Disable background images or videos"
                value={hideBackground}
                onToggle={onToggleHideBackground}
              />
              <OverlayToggleRow
                label="Sound"
                description="Mute or enable music and effects"
                value={soundEnabled}
                onToggle={onToggleSound}
              />
              <OverlayToggleRow
                label="Statistics tracking"
                description={statisticsDisabledReason ?? "Send node visit data"}
                value={statisticsEnabled}
                onToggle={onToggleStatistics}
                disabled={statisticsDisabled}
              />
            </div>

            {showDebug ? (
              <div className="ps-overlay__debug">
                <p className="ps-overlay__debug-title">Debug</p>
                <p className="ps-overlay__debug-row">
                  HC {highContrast ? "on" : "off"} ‚ú BG{" "}
                  {hideBackground ? "hidden" : "visible"} ‚ú Sound{" "}
                  {soundEnabled ? "on" : "muted"}
                </p>
                <p className="ps-overlay__debug-row">
                  Nav {navigationStyle}
                  {navPlacement === "bottom" ? " ‚ú bottom" : ""}
                </p>
                <p className="ps-overlay__debug-row">
                  Game {gameNodeId ?? "?"} - Viewport {viewportActiveNodeId ?? "?"}
                </p>
                <p className="ps-overlay__debug-row">
                  Scrollytell{" "}
                  {scrollytellActive
                    ? "tracking on"
                    : "tracking off (nav style not scrollytell)"}
                </p>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
