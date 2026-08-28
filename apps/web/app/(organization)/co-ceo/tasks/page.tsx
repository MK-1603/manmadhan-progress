"use client";

import React from "react";
import { TaskWorkspace } from "@/components/tasks/task-workspace";

export default function CoCeoTasksPage() {
  return <TaskWorkspace userRole="CO-CEO" basePath="/co-ceo" />;
}
