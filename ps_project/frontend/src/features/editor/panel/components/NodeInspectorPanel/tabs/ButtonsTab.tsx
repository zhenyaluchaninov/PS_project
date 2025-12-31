import { NAV_TEXT_SIZE_MAX, NAV_TEXT_SIZE_MIN } from "../constants";
import { BulkField } from "../../BulkField";
import { CollapsibleSection } from "../../CollapsibleSection";
import type { SceneColors } from "../hooks/useNodeProps";
import { ColorAlphaField, RangeField, ReorderList, SelectField } from "../fields";

export function ButtonsTab({
  readOnly,
  isBulkFieldStaged,
  clearBulkPaths,
  orderedOutgoingLinks,
  selectedLinkId,
  handleLinkSelect,
  handleNodePropChange,
  choicesDisabledReason,
  sceneColors,
  navTextSize,
  conditionsBehavior,
  conditionsColor,
  conditionsAlpha,
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
}: {
  readOnly: boolean;
  isBulkFieldStaged: (paths: string | string[]) => boolean;
  clearBulkPaths: (paths: string | string[]) => void;
  orderedOutgoingLinks: Array<{ linkId: number; targetId: number; label: string }>;
  selectedLinkId?: number | null;
  handleLinkSelect?: (linkId: number) => void;
  handleNodePropChange: (path: string, value: unknown) => void;
  choicesDisabledReason?: string;
  sceneColors: SceneColors;
  navTextSize: number;
  conditionsBehavior: string;
  conditionsColor: string;
  conditionsAlpha: number;
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
}) {
  return (
    <fieldset disabled={readOnly} className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
        <CollapsibleSection
          title="Choices"
          sectionKey="editor.node.buttons.choices"
        >
          <BulkField
            active={isBulkFieldStaged("ordered_link_ids")}
            disabledReason={choicesDisabledReason}
            onClear={() => clearBulkPaths("ordered_link_ids")}
          >
            {orderedOutgoingLinks.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No choices yet.</p>
            ) : (
              <ReorderList
                items={orderedOutgoingLinks}
                selectedId={selectedLinkId}
                onSelect={handleLinkSelect}
                onReorder={(next) =>
                  handleNodePropChange(
                    "ordered_link_ids",
                    next.map((link) => String(link.linkId))
                  )
                }
              />
            )}
          </BulkField>
        </CollapsibleSection>
        <CollapsibleSection
          title="Button appearance"
          sectionKey="editor.node.buttons.appearance"
        >
          <div className="space-y-4">
            <BulkField
              active={isBulkFieldStaged([
                "color_buttontext",
                "alpha_buttontext",
              ])}
              onClear={() =>
                clearBulkPaths(["color_buttontext", "alpha_buttontext"])
              }
            >
              <ColorAlphaField
                label="Button text"
                colorValue={sceneColors.buttonText}
                alphaValue={sceneColors.buttonTextAlpha}
                onColorLiveChange={(value) =>
                  handlePreviewColorLiveChange(
                    "color_buttontext",
                    value,
                    sceneColors.buttonTextAlpha
                  )
                }
                onColorCommit={(value) =>
                  handlePreviewCommit("color_buttontext", value)
                }
                onAlphaLiveChange={(value) =>
                  handleNodePropLiveChange("alpha_buttontext", String(value))
                }
                onAlphaCommit={(value) =>
                  handleNodePropCommit("alpha_buttontext", String(value))
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
                "color_buttonbackground",
                "alpha_buttonbackground",
              ])}
              onClear={() =>
                clearBulkPaths(["color_buttonbackground", "alpha_buttonbackground"])
              }
            >
              <ColorAlphaField
                label="Button background"
                colorValue={sceneColors.buttonBackground}
                alphaValue={sceneColors.buttonBackgroundAlpha}
                onColorLiveChange={(value) =>
                  handlePreviewColorLiveChange(
                    "color_buttonbackground",
                    value,
                    sceneColors.buttonBackgroundAlpha
                  )
                }
                onColorCommit={(value) =>
                  handlePreviewCommit("color_buttonbackground", value)
                }
                onAlphaLiveChange={(value) =>
                  handleNodePropLiveChange(
                    "alpha_buttonbackground",
                    String(value)
                  )
                }
                onAlphaCommit={(value) =>
                  handleNodePropCommit(
                    "alpha_buttonbackground",
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
            <BulkField
              active={isBulkFieldStaged("playerNavigation_textSize")}
              onClear={() => clearBulkPaths("playerNavigation_textSize")}
            >
              <RangeField
                label="Navigation buttons font size"
                value={navTextSize}
                min={NAV_TEXT_SIZE_MIN}
                max={NAV_TEXT_SIZE_MAX}
                step={1}
                onLiveChange={(next) =>
                  handleNodePropLiveChange("playerNavigation_textSize", [
                    String(next),
                  ])
                }
                onCommit={(next) =>
                  handleNodePropCommit("playerNavigation_textSize", [String(next)])
                }
                onInteractionStart={handleLiveInteractionStart}
                onInteractionEnd={handleLiveInteractionEnd}
              />
            </BulkField>
          </div>
        </CollapsibleSection>
        <CollapsibleSection
          title="Conditioned appearance"
          sectionKey="editor.node.buttons.conditioned"
        >
          <p className="mb-3 text-xs text-[var(--muted)]">
            How buttons look when their target is hidden or link conditions aren't met
          </p>
          <div className="space-y-4">
            <BulkField
              active={isBulkFieldStaged("type_nodeconditions")}
              onClear={() => clearBulkPaths("type_nodeconditions")}
            >
              <SelectField
                label="Conditioned button behavior"
                value={conditionsBehavior}
                onChange={(value) =>
                  handleNodePropChange("type_nodeconditions", [value])
                }
                options={[
                  { value: "hide", label: "Hide button" },
                  { value: "transparency", label: "Dim button" },
                ]}
                widthClassName="w-56"
              />
            </BulkField>
            <BulkField
              active={isBulkFieldStaged([
                "color_nodeconditions",
                "alpha_nodeconditions",
              ])}
              onClear={() =>
                clearBulkPaths(["color_nodeconditions", "alpha_nodeconditions"])
              }
            >
              <ColorAlphaField
                label="Condition color"
                colorValue={conditionsColor}
                alphaValue={conditionsAlpha}
                onColorLiveChange={(value) =>
                  handleNodePropLiveChange("color_nodeconditions", value)
                }
                onColorCommit={(value) =>
                  handleNodePropCommit("color_nodeconditions", value)
                }
                onAlphaLiveChange={(value) =>
                  handleNodePropLiveChange(
                    "alpha_nodeconditions",
                    String(value)
                  )
                }
                onAlphaCommit={(value) =>
                  handleNodePropCommit(
                    "alpha_nodeconditions",
                    String(value)
                  )
                }
                onColorInteractionStart={handleLiveInteractionStart}
                onColorInteractionEnd={handleLiveInteractionEnd}
                onAlphaInteractionStart={handleLiveInteractionStart}
                onAlphaInteractionEnd={handleLiveInteractionEnd}
                onColorScrubStart={handleColorScrubStart}
                onColorScrubEnd={handleColorScrubEnd}
              />
            </BulkField>
          </div>
        </CollapsibleSection>
      </div>
    </fieldset>
  );
}
