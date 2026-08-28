"use client";

import React from "react";
import { TaskWorkspace } from "@/components/tasks/task-workspace";

export default function CEOTasksPage() {
  return <TaskWorkspace userRole="CEO" basePath="/ceo" />;
}
