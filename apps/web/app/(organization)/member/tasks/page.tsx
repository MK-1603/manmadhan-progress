"use client";

import React from "react";
import { TaskWorkspace } from "@/components/tasks/task-workspace";

export default function MemberTasksPage() {
  return <TaskWorkspace userRole="MEMBER" basePath="/member" />;
}
