import { EntityDetail } from "@/components/personal/entity-detail";
export default async function TaskDetail({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <EntityDetail title="Task Detail" endpoint={`/tasks/${id}`} />; }
