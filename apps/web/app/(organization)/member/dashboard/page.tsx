"use client";

import React from "react";
import { OrganizationDashboard } from "@/components/organization/organization-dashboard";

export default function MemberDashboardPage() {
  return <OrganizationDashboard userRole="MEMBER" basePath="/member" />;
}
