"use client";

import React from "react";
import { GlobalSheet } from "./global-sheet";

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveModal({
  isOpen,
  onClose,
  children,
  className = "",
}: ResponsiveModalProps) {
  return (
    <GlobalSheet
      open={isOpen}
      onClose={onClose}
      showHandle={true}
      showClose={false}
      desktopMode="modal"
      className={className}
      snapPoints={["auto", "medium", "full"]}
      defaultSnapPoint="auto"
    >
      {children}
    </GlobalSheet>
  );
}

