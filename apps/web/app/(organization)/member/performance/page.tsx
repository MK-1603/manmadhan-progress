"use client";

import React from "react";
import { AccessRestricted } from "@/components/ui/access-restricted";

export default function MemberPerformancePage() {
  return (
    <AccessRestricted
      title="Access Restricted"
      description="Organization Performance Analytics is restricted to leadership personnel."
      dashboardHref="/member/dashboard"
    />
  );
}
