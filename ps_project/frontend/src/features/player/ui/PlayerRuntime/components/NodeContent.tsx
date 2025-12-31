import { LegacyContent } from "@/features/ui-core/components/LegacyContent";

export function NodeContent({
  nodeText,
  allowMarkdown,
}: {
  nodeText: string;
  allowMarkdown: boolean;
}) {
  const prose = nodeText ? (
    <LegacyContent
      value={nodeText}
      allowMarkdown={allowMarkdown}
      className="ps-player__prose"
    />
  ) : null;

  return <div className="space-y-3">{prose}</div>;
}
