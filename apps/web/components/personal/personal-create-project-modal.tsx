"use client";

import React, { useState } from "react";
import { CreateProjectModal } from "@/components/organization/create-project-modal";

interface PersonalCreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project?: any) => void;
}

export function PersonalCreateProjectModal({
  isOpen,
  onClose,
  onSuccess,
}: PersonalCreateProjectModalProps) {
  return (
    <CreateProjectModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
