import { chapterTypeOptions, BULK_NODE_TYPE_PATH } from "../../../constants";
import { BulkField } from "../../BulkField";
import { CollapsibleSection } from "../../CollapsibleSection";
import { ColorAlphaField, SelectField, ToggleRow } from "../fields";

export function LogicTab({
  readOnly,
  isBulkFieldStaged,
  clearBulkPaths,
  chapterType,
  handleNodeTypeChange,
  hideVisitedEnabled,
  conditionsColor,
  conditionsAlpha,
  statisticsEnabled,
  handleNodePropChange,
  handleNodePropLiveChange,
  handleNodePropCommit,
  handleLiveInteractionStart,
  handleLiveInteractionEnd,
  handleColorScrubStart,
  handleColorScrubEnd,
}: {
  readOnly: boolean;
  isBulkFieldStaged: (paths: string | string[]) => boolean;
  clearBulkPaths: (paths: string | string[]) => void;
  chapterType: string;
  handleNodeTypeChange: (chapterType: string) => void;
  hideVisitedEnabled: boolean;
  conditionsColor: string;
  conditionsAlpha: number;
  statisticsEnabled: boolean;
  handleNodePropChange: (path: string, value: unknown) => void;
  handleNodePropLiveChange: (path: string, value: unknown) => void;
  handleNodePropCommit: (path: string, value: unknown) => void;
  handleLiveInteractionStart: () => void;
  handleLiveInteractionEnd: () => void;
  handleColorScrubStart: () => void;
  handleColorScrubEnd: () => void;
}) {
  return (
    <fieldset disabled={readOnly} className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
        <CollapsibleSection title="Node type" sectionKey="editor.node.logic.type">
          <BulkField
            active={isBulkFieldStaged(BULK_NODE_TYPE_PATH)}
            onClear={() => clearBulkPaths(BULK_NODE_TYPE_PATH)}
          >
            <SelectField
              label="Type"
              value={chapterType}
              onChange={handleNodeTypeChange}
              options={chapterTypeOptions}
            />
          </BulkField>
        </CollapsibleSection>
        <CollapsibleSection
          title="Conditions"
          sectionKey="editor.node.logic.conditions"
        >
          <div className="space-y-4">
            <BulkField
              active={isBulkFieldStaged("node_conditions")}
              onClear={() => clearBulkPaths("node_conditions")}
            >
              <ToggleRow
                label="Hide visited"
                checked={hideVisitedEnabled}
                onToggle={(next) =>
                  handleNodePropChange("node_conditions", [
                    next ? "hide_visited" : "",
                  ])
                }
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
        <CollapsibleSection
          title="Tracking"
          sectionKey="editor.node.logic.tracking"
        >
          <div className="space-y-4">
            <BulkField
              active={isBulkFieldStaged("node_statistics")}
              onClear={() => clearBulkPaths("node_statistics")}
            >
              <ToggleRow
                label="Statistics tracking"
                checked={statisticsEnabled}
                onToggle={(next) =>
                  handleNodePropChange("node_statistics", [next ? "on" : ""])
                }
              />
            </BulkField>
            <BulkField
              active={isBulkFieldStaged("node_conditions")}
              onClear={() => clearBulkPaths("node_conditions")}
            >
              <ToggleRow
                label="Node variable"
                checked={hideVisitedEnabled}
                onToggle={(next) =>
                  handleNodePropChange("node_conditions", [
                    next ? "hide_visited" : "",
                  ])
                }
              />
            </BulkField>
          </div>
        </CollapsibleSection>
      </div>
    </fieldset>
  );
}
