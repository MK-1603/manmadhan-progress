"use client";

import { CreateProjectModal as OrgCreateProjectModal } from "@/components/organization/create-project-modal";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project?: any) => void;
  defaultAssigneeId?: string | null;
  defaultAssigneeName?: string | null;
}

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  return <OrgCreateProjectModal isOpen={isOpen} onClose={onClose} onSuccess={onSuccess} />;
}
