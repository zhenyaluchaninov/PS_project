import { BULK_NODE_TEXT_PATH, BULK_NODE_TITLE_PATH } from "../../constants";
import { BulkField } from "../BulkField";
import { CollapsibleSection } from "../CollapsibleSection";
import { ReorderList } from "./fields";

export function RouterInspector({
  readOnly,
  isBulkFieldStaged,
  clearBulkPaths,
  titleValue,
  handleTitleChange,
  isRandomNode,
  textValue,
  handleTextChange,
  orderedOutgoingLinks,
  selectedLinkId,
  handleLinkSelect,
  choicesDisabledReason,
}: {
  readOnly: boolean;
  isBulkFieldStaged: (paths: string | string[]) => boolean;
  clearBulkPaths: (paths: string | string[]) => void;
  titleValue: string;
  handleTitleChange: (title: string) => void;
  isRandomNode: boolean;
  textValue: string;
  handleTextChange: (text: string) => void;
  orderedOutgoingLinks: Array<{ linkId: number; targetId: number; label: string }>;
  selectedLinkId?: number | null;
  handleLinkSelect?: (linkId: number) => void;
  choicesDisabledReason?: string;
}) {
  return (
    <fieldset disabled={readOnly} className="space-y-4">
      <BulkField
        active={isBulkFieldStaged(BULK_NODE_TITLE_PATH)}
        onClear={() => clearBulkPaths(BULK_NODE_TITLE_PATH)}
      >
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
            Node name
          </label>
          <input
            value={titleValue}
            onChange={(event) => handleTitleChange(event.target.value)}
            placeholder="Untitled node"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
          />
        </div>
      </BulkField>

      {isRandomNode ? (
        <>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--muted)]">
            Random nodes do not render in the player; they immediately redirect via
            their outgoing links (prefer unvisited).
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
            <CollapsibleSection
              title="Outgoing links"
              defaultOpen
              sectionKey="editor.node.router.links"
            >
              <BulkField
                active={isBulkFieldStaged("ordered_link_ids")}
                disabledReason={choicesDisabledReason}
                onClear={() => clearBulkPaths("ordered_link_ids")}
              >
                {orderedOutgoingLinks.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">
                    No outgoing links yet.
                  </p>
                ) : (
                  <ReorderList
                    items={orderedOutgoingLinks}
                    selectedId={selectedLinkId}
                    onSelect={handleLinkSelect}
                    enableReorder={false}
                  />
                )}
              </BulkField>
            </CollapsibleSection>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--muted)]">
            This node opens a link. Content and styling are not rendered.
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
            <CollapsibleSection
              title="URL"
              defaultOpen
              sectionKey="editor.node.ref.url"
            >
              <BulkField
                active={isBulkFieldStaged(BULK_NODE_TEXT_PATH)}
                onClear={() => clearBulkPaths(BULK_NODE_TEXT_PATH)}
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                    URL
                  </label>
                  <input
                    value={textValue}
                    onChange={(event) => handleTextChange(event.target.value)}
                    placeholder="https://example.com"
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-muted)]"
                  />
                </div>
              </BulkField>
            </CollapsibleSection>
          </div>
        </>
      )}
    </fieldset>
  );
}
