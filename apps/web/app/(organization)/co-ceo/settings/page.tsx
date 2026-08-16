"use client";

import React from "react";
import { AccessRestricted } from "@/components/ui/access-restricted";

export default function CoCeoSettingsPage() {
  return (
    <AccessRestricted
      title="Access Restricted"
      description="Organization Settings and Owner Controls are restricted to the Organization CEO."
      dashboardHref="/co-ceo/dashboard"
    />
  );
}
