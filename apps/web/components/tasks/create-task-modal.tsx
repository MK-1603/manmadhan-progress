"use client";

import React from "react";
import { TaskCreateModal } from "@/components/organization/task-create-modal";
import { useAuth } from "@/components/auth/auth-context";

export function renderNeatTextWithMentions(text: string | null | undefined) {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9._-]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          const isMe = part.toLowerCase() === "@me";
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-bold ${
                isMe
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-[#C9A52A]/20 text-[#C9A52A] border border-[#C9A52A]/30"
              }`}
            >
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
}

export interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (task?: any) => void;
  onCreated?: () => void;
  defaultProjectId?: string | null;
  defaultMilestoneId?: string | null;
  defaultAssigneeId?: string | null;
  defaultAssigneeName?: string | null;
  defaultAssigneeRole?: string | null;
  role?: "CEO" | "CO-CEO" | "MEMBER";
  isPersonalWorkspace?: boolean;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onSuccess,
  onCreated,
  defaultProjectId,
  defaultMilestoneId,
  role = "CO-CEO",
  isPersonalWorkspace = false,
}: CreateTaskModalProps) {
  const { user } = useAuth();
  const effectiveRole = (role || user?.role || "CO-CEO").toUpperCase() as "CEO" | "CO-CEO" | "MEMBER";

  const handleCreated = () => {
    if (onCreated) onCreated();
    if (onSuccess) onSuccess();
  };

  return (
    <TaskCreateModal
      isOpen={isOpen}
      onClose={onClose}
      onCreated={handleCreated}
      role={effectiveRole}
      projectId={defaultProjectId || undefined}
      milestoneId={defaultMilestoneId || undefined}
      isPersonalWorkspace={isPersonalWorkspace}
    />
  );
}
