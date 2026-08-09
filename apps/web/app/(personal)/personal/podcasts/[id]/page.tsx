import { EntityDetail } from "@/components/personal/entity-detail";
export default async function PodcastDetail({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <EntityDetail title="Podcast Detail" endpoint={`/learning/podcasts/${id}`} />; }
