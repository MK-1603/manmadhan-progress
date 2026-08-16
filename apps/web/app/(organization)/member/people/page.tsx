"use client";

import React from "react";
import { AccessRestricted } from "@/components/ui/access-restricted";

export default function MemberPeoplePage() {
  return (
    <AccessRestricted
      title="Access Restricted"
      description="You don't have permission to access the organization People management page."
      dashboardHref="/member/dashboard"
    />
  );
}
