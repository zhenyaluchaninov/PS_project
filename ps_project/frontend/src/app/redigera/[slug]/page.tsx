import { EditorRoute } from "@/features/editor/ui/EditorRoute";

type EditorPageProps = {
  params: { slug: string };
};

export default function EditorPage({ params }: EditorPageProps) {
  return <EditorRoute editSlug={params.slug} />;
}
