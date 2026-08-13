"use client";

import { AutomationBuilderView } from "@/components/automation/automation-builder-view";

type Role = "CEO" | "CO-CEO" | "MEMBER";

export function OrganizationAutomationView({ role }: { role: Role }) {
  return <AutomationBuilderView workspaceType="organization" role={role} />;
}
