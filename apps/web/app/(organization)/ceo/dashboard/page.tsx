"use client";

import React from "react";
import { OrganizationDashboard } from "@/components/organization/organization-dashboard";

export default function CEODashboardPage() {
  return <OrganizationDashboard userRole="CEO" basePath="/ceo" />;
}
