import { AUDIO_VOLUME_MAX, AUDIO_VOLUME_MIN, BLUR_MAX, BLUR_MIN, MARGIN_MAX, MARGIN_MIN, SCROLL_SPEED_MAX, SCROLL_SPEED_MIN, navigationStyleOptions, verticalPositionOptions } from "../constants";
import { clampNumber } from "../utils/formatters";
import { BulkField } from "../../BulkField";
import { CollapsibleSection } from "../../CollapsibleSection";
import type { SceneColors } from "../hooks/useNodeProps";
import {
  ColorAlphaField,
  ColorOnlyField,
  RangeField,
  SelectField,
  ToggleRow,
} from "../fields";

export function StyleTab({
  readOnly,
  isBulkFieldStaged,
  clearBulkPaths,
  sceneColors,
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
  handleNodePropChange,
  handleNodePropLiveChange,
  handleNodePropCommit,
  handlePreviewColorLiveChange,
  handlePreviewCommit,
  handlePreviewInteractionStart,
  handlePreviewInteractionEnd,
  handleLiveInteractionStart,
  handleLiveInteractionEnd,
  handleColorScrubStart,
  handleColorScrubEnd,
}: {
  readOnly: boolean;
  isBulkFieldStaged: (paths: string | string[]) => boolean;
  clearBulkPaths: (paths: string | string[]) => void;
  sceneColors: SceneColors;
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
  handleNodePropChange: (path: string, value: unknown) => void;
  handleNodePropLiveChange: (path: string, value: unknown) => void;
  handleNodePropCommit: (path: string, value: unknown) => void;
  handlePreviewColorLiveChange: (
    path: string,
    color: string,
    alpha?: number
  ) => void;
  handlePreviewCommit: (path: string, value: unknown) => void;
  handlePreviewInteractionStart: () => void;
  handlePreviewInteractionEnd: () => void;
  handleLiveInteractionStart: () => void;
  handleLiveInteractionEnd: () => void;
  handleColorScrubStart: () => void;
  handleColorScrubEnd: () => void;
}) {
  return (
    <fieldset disabled={readOnly} className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
        <CollapsibleSection
          title="Background"
          sectionKey="editor.node.style.background"
        >
          <div className="space-y-4">
            <BulkField
              active={isBulkFieldStaged("color_background")}
              onClear={() => clearBulkPaths("color_background")}
            >
              <ColorOnlyField
                label="Background"
                value={sceneColors.background}
                onLiveChange={(value) =>
                  handlePreviewColorLiveChange("color_background", value)
                }
                onCommit={(value) =>
                  handlePreviewCommit("color_background", value)
                }
                onInteractionStart={handlePreviewInteractionStart}
                onInteractionEnd={handlePreviewInteractionEnd}
                onScrubStart={handleColorScrubStart}
                onScrubEnd={handleColorScrubEnd}
              />
            </BulkField>
            <BulkField
              active={isBulkFieldStaged([
                "color_foreground",
                "alpha_foreground",
              ])}
              onClear={() =>
                clearBulkPaths(["color_foreground", "alpha_foreground"])
              }
            >
              <ColorAlphaField
                label="Foreground overlay"
                colorValue={sceneColors.foreground}
                alphaValue={sceneColors.foregroundAlpha}
                onColorLiveChange={(value) =>
                  handlePreviewColorLiveChange(
                    "color_foreground",
                    value,
                    sceneColors.foregroundAlpha
                  )
                }
                onColorCommit={(value) =>
                  handlePreviewCommit("color_foreground", value)
                }
                onAlphaLiveChange={(value) =>
                  handleNodePropLiveChange("alpha_foreground", String(value))
                }
                onAlphaCommit={(value) =>
                  handleNodePropCommit("alpha_foreground", String(value))
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
              active={isBulkFieldStaged("settings_grayscale")}
              onClear={() => clearBulkPaths("settings_grayscale")}
            >
              <ToggleRow
                label="Grayscale"
                checked={grayscaleEnabled}
                onToggle={(next) =>
                  handleNodePropChange("settings_grayscale", [next ? "on" : ""])
                }
              />
            </BulkField>

            <BulkField
              active={isBulkFieldStaged("color_blur")}
              onClear={() => clearBulkPaths("color_blur")}
            >
              <RangeField
                label="Blur"
                value={blurAmount}
                min={BLUR_MIN}
                max={BLUR_MAX}
                step={1}
                allowBeyondMax
                onLiveChange={(next) =>
                  handleNodePropLiveChange("color_blur", String(next))
                }
                onCommit={(next) =>
                  handleNodePropCommit("color_blur", String(next))
                }
                onInteractionStart={handleLiveInteractionStart}
                onInteractionEnd={handleLiveInteractionEnd}
              />
            </BulkField>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Layout" sectionKey="editor.node.style.layout">
          <div className="space-y-4">
            <BulkField
              active={isBulkFieldStaged("settings_scrollSpeed")}
              onClear={() => clearBulkPaths("settings_scrollSpeed")}
            >
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Scroll speed
                </label>
                <input
                  type="number"
                  min={SCROLL_SPEED_MIN}
                  max={SCROLL_SPEED_MAX}
                  step={0.05}
                  value={scrollSpeed}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (!Number.isFinite(next)) return;
                    const clamped = clampNumber(
                      next,
                      SCROLL_SPEED_MIN,
                      SCROLL_SPEED_MAX
                    );
                    handleNodePropChange("settings_scrollSpeed", [
                      String(clamped),
                    ]);
                  }}
                  className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                />
              </div>
            </BulkField>

            <BulkField
              active={isBulkFieldStaged("player.verticalPosition")}
              onClear={() => clearBulkPaths("player.verticalPosition")}
            >
              <SelectField
                label="Vertical position"
                value={verticalPosition}
                onChange={(next) =>
                  handleNodePropChange("player.verticalPosition", [next])
                }
                options={verticalPositionOptions}
              />
            </BulkField>

            <div className="space-y-3">
              <BulkField
                active={isBulkFieldStaged("player_container_marginleft")}
                onClear={() => clearBulkPaths("player_container_marginleft")}
              >
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    Left margin
                  </label>
                  <input
                    type="number"
                    min={MARGIN_MIN}
                    max={MARGIN_MAX}
                    step={1}
                    value={marginLeft}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (!Number.isFinite(next)) return;
                      const clamped = clampNumber(next, MARGIN_MIN, MARGIN_MAX);
                      handleNodePropChange(
                        "player_container_marginleft",
                        String(clamped)
                      );
                    }}
                    className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                  />
                </div>
              </BulkField>
              <BulkField
                active={isBulkFieldStaged("player_container_marginright")}
                onClear={() => clearBulkPaths("player_container_marginright")}
              >
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    Right margin
                  </label>
                  <input
                    type="number"
                    min={MARGIN_MIN}
                    max={MARGIN_MAX}
                    step={1}
                    value={marginRight}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (!Number.isFinite(next)) return;
                      const clamped = clampNumber(next, MARGIN_MIN, MARGIN_MAX);
                      handleNodePropChange(
                        "player_container_marginright",
                        String(clamped)
                      );
                    }}
                    className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                  />
                </div>
              </BulkField>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Navigation"
          sectionKey="editor.node.style.navigation"
        >
          <div className="space-y-4">
            <BulkField
              active={isBulkFieldStaged("background.navigation_style")}
              onClear={() => clearBulkPaths("background.navigation_style")}
            >
              <SelectField
                label="Navigation style"
                value={navigationStyle}
                onChange={(next) =>
                  handleNodePropChange("background.navigation_style", [next])
                }
                options={navigationStyleOptions}
              />
            </BulkField>

            <BulkField
              active={isBulkFieldStaged("playerNavigation.settings")}
              onClear={() => clearBulkPaths("playerNavigation.settings")}
            >
              <div className="space-y-3">
                <ToggleRow
                  label="Show current node button"
                  checked={hasNavigationSetting("show-current-node")}
                  onToggle={(next) =>
                    updateNavigationSetting("show-current-node", next)
                  }
                />
                <ToggleRow
                  label="Navigation opaque"
                  checked={hasNavigationSetting("navigation-opaque")}
                  onToggle={(next) =>
                    updateNavigationSetting("navigation-opaque", next)
                  }
                />
              </div>
            </BulkField>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Audio" sectionKey="editor.node.style.audio">
          <div className="space-y-4">
            <BulkField
              active={isBulkFieldStaged("audio_volume")}
              onClear={() => clearBulkPaths("audio_volume")}
            >
              <RangeField
                label="Audio volume"
                value={audioVolume}
                min={AUDIO_VOLUME_MIN}
                max={AUDIO_VOLUME_MAX}
                step={1}
                onLiveChange={(next) =>
                  handleNodePropLiveChange("audio_volume", String(next))
                }
                onCommit={(next) =>
                  handleNodePropCommit("audio_volume", String(next))
                }
                onInteractionStart={handleLiveInteractionStart}
                onInteractionEnd={handleLiveInteractionEnd}
              />
            </BulkField>
          </div>
        </CollapsibleSection>
      </div>
    </fieldset>
  );
}
