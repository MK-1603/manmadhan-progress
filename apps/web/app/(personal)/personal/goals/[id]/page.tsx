import { EntityDetail } from "@/components/personal/entity-detail";
export default async function GoalDetail({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <EntityDetail title="Goal Detail" endpoint={`/personal/goals/${id}`} />; }
