"use client";

import { use } from "react";
import { OrgPromptDetailView } from "@/components/organization/prompts/org-prompt-detail-view";

export default function CEOPromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const resolvedParams = use(params);
	return <OrgPromptDetailView promptId={resolvedParams.id} basePath="/ceo" />;
}
