"use client";

import React, { ReactNode } from "react";
import { GlobalSheet, SheetSnapPoint } from "./global-sheet";

interface MobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footerActions?: ReactNode;
  snapPoint?: SheetSnapPoint;
}

export function MobileSheet({
  isOpen,
  onClose,
  title,
  children,
  footerActions,
  snapPoint = "auto",
}: MobileSheetProps) {
  return (
    <GlobalSheet
      open={isOpen}
      onClose={onClose}
      title={title}
      footerActions={footerActions}
      defaultSnapPoint={snapPoint}
      snapPoints={["auto", "medium", "full"]}
      desktopMode="sheet"
    >
      {children}
    </GlobalSheet>
  );
}

