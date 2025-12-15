import { PlayerRoute } from "@/features/player/ui/PlayerRoute";

type PlayerPageProps = {
  params: { viewSlug: string };
};

export default function PlayerPage({ params }: PlayerPageProps) {
  return <PlayerRoute slug={params.viewSlug} mode="play" />;
}
