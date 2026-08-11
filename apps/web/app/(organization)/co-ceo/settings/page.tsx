"use client";

import { OrgSettingsView } from "@/components/organization/settings/org-settings-view";

export default function COCEOSettingsPage() {
	return <OrgSettingsView userRole="CO-CEO" basePath="/co-ceo" />;
}
