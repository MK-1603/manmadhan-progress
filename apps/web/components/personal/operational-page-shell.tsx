"use client";

import React from "react";

interface OperationalPageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function OperationalPageShell({ children, className = "" }: OperationalPageShellProps) {
  return (
    <div className={`w-full min-h-full flex flex-col p-4 sm:p-6 md:p-8 space-y-6 ${className}`}>
      {children}
    </div>
  );
}
