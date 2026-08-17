"use client";

import React from "react";

export interface FocusIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number;
}

export function FocusIcon({
  className = "w-4 h-4",
  size,
  strokeWidth = 1.75,
  ...props
}: FocusIconProps) {
  const dimension = size || undefined;
  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {/* Central Execution Core Dot */}
      <circle cx="12" cy="12" r="2.25" fill="currentColor" stroke="none" />
      {/* Precision Execution Orbit Ring */}
      <circle cx="12" cy="12" r="6.5" strokeWidth={strokeWidth} />
      {/* Four Precision Directional Cardinal Micro-Ticks */}
      <path strokeWidth={strokeWidth} d="M12 2.25v2.25 M12 19.5v2.25 M2.25 12h2.25 M19.5 12h2.25" />
    </svg>
  );
}

export const Focus = FocusIcon;
export default FocusIcon;
