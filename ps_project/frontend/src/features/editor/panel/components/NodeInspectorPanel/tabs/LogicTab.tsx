import { chapterTypeOptions, BULK_NODE_TYPE_PATH } from "../../../constants";
import { BulkField } from "../../BulkField";
import { CollapsibleSection } from "../../CollapsibleSection";
import { SelectField, ToggleRow } from "../fields";

export function LogicTab({
  readOnly,
  isBulkFieldStaged,
  clearBulkPaths,
  chapterType,
  handleNodeTypeChange,
  hideVisitedEnabled,
  nodeConditions,
  statisticsEnabled,
  handleNodePropChange,
}: {
  readOnly: boolean;
  isBulkFieldStaged: (paths: string | string[]) => boolean;
  clearBulkPaths: (paths: string | string[]) => void;
  chapterType: string;
  handleNodeTypeChange: (chapterType: string) => void;
  hideVisitedEnabled: boolean;
  nodeConditions: string[];
  statisticsEnabled: boolean;
  handleNodePropChange: (path: string, value: unknown) => void;
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
                onToggle={(next) => {
                  const remaining = nodeConditions.filter(
                    (token) =>
                      token.trim().length > 0 &&
                      token.toLowerCase() !== "hide_visited"
                  );
                  const nextConditions = next
                    ? [...remaining, "hide_visited"]
                    : remaining;
                  handleNodePropChange("node_conditions", nextConditions);
                }}
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
          </div>
        </CollapsibleSection>
      </div>
    </fieldset>
  );
}
