import { PlayerRoute } from "@/features/player/ui/PlayerRoute";

type PreviewPageProps = {
  params: { slug: string };
};

export default function PreviewPage({ params }: PreviewPageProps) {
  return <PlayerRoute slug={params.slug} mode="preview" />;
}
