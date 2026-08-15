"use client";

import React from "react";
import { AppSidebar } from "@/components/navigation/app-sidebar";

export function OrgSidebar({
  role,
  base,
}: {
  role?: "CEO" | "CO-CEO" | "MEMBER";
  base?: string;
}) {
  return <AppSidebar forcedRole={role} forcedWorkspace="organization" />;
}

export default OrgSidebar;
