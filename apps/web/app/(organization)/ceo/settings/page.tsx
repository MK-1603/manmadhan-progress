"use client";

import { OrgSettingsView } from "@/components/organization/settings/org-settings-view";

export default function CEOSettingsPage() {
	return <OrgSettingsView userRole="CEO" basePath="/ceo" />;
}
