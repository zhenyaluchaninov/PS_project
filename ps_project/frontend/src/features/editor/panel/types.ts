export type BulkDraftOp = "set" | "unset";

export type BulkDraftKind =
  | "nodeTitle"
  | "nodeText"
  | "propPath"
  | "propStringArray"
  | "legacyAnimation";

export type BulkDraftEntry = {
  path: string;
  op: BulkDraftOp;
  value: unknown;
  kind: BulkDraftKind;
};

export type BulkDraft = Record<string, BulkDraftEntry>;

export type BulkEditConfig = {
  active: boolean;
  selectedNodeCount: number;
  selectedLinkCount: number;
  draft: BulkDraft;
  notice?: string | null;
  onStage: (entry: BulkDraftEntry) => void;
  onClear: (paths: string | string[]) => void;
  onDiscardAll: () => void;
  onRequestApply: () => void;
};
