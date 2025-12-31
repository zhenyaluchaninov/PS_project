export function OverlayShortcutRow({
  label,
  nodeId,
  onClick,
}: {
  label: string;
  nodeId: number;
  onClick: () => void;
}) {
  return (
    <button type="button" className="ps-overlay__toggle" onClick={onClick}>
      <span className="ps-overlay__toggle-text">
        <span className="ps-overlay__toggle-label">{label}</span>
        <span className="ps-overlay__toggle-desc">Node #{nodeId}</span>
      </span>
      <span className="ps-overlay__pill ps-overlay__pill--on">Go</span>
    </button>
  );
}
