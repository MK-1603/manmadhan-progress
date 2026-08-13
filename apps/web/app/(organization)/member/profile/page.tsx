"use client";

import { OrgProfileView } from "@/components/organization/org-profile-view";

export default function MemberProfilePage() {
  return <OrgProfileView userRole="MEMBER" basePath="/member" />;
}
