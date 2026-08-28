"use client";

import React from "react";
import { OrganizationDashboard } from "@/components/organization/organization-dashboard";

export default function CoCeoDashboardPage() {
  return <OrganizationDashboard userRole="CO-CEO" basePath="/co-ceo" />;
}
