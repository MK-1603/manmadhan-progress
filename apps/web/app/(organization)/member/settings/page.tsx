"use client";

import { OrgSettingsView } from "@/components/organization/settings/org-settings-view";

export default function MemberSettingsPage() {
	return <OrgSettingsView userRole="MEMBER" basePath="/member" />;
}
