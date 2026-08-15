"use client";

import { OrgProfileView } from "@/components/organization/org-profile-view";

export default function MemberOrgProfilePage() {
  return <OrgProfileView userRole="MEMBER" basePath="/member" />;
}
