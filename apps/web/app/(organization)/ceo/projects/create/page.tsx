"use client";

import React from "react";
import { ProjectCreationWorkspace } from "@/components/projects/project-creation-workspace";

export default function CEOProjectCreatePage() {
  return <ProjectCreationWorkspace userRole="CEO" basePath="/ceo" />;
}
