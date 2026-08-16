"use client";

import React from "react";
import { AccessRestricted } from "@/components/ui/access-restricted";

export default function MemberGraphPage() {
  return (
    <AccessRestricted
      title="Access Restricted"
      description="Organization Graph is restricted to leadership personnel."
      dashboardHref="/member/dashboard"
    />
  );
}
