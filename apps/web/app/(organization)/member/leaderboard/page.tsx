"use client";

import React from "react";
import { AccessRestricted } from "@/components/ui/access-restricted";

export default function MemberLeaderboardPage() {
  return (
    <AccessRestricted
      title="Access Restricted"
      description="Organization Leaderboard is restricted to leadership personnel."
      dashboardHref="/member/dashboard"
    />
  );
}
