"use client";

import { OrgProfileView } from "@/components/organization/org-profile-view";

export default function CEOProfilePage() {
  return <OrgProfileView userRole="CEO" basePath="/ceo" />;
}
