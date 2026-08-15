"use client";

import { OrgProfileView } from "@/components/organization/org-profile-view";

export default function CEOOrgProfilePage() {
  return <OrgProfileView userRole="CEO" basePath="/ceo" />;
}
