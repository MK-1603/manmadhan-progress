"use client";

import React, { ReactNode } from "react";

interface MobilePressableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  haptic?: boolean;
  className?: string;
  disabled?: boolean;
}

export function MobilePressable({
  children,
  onClick,
  haptic = false,
  className = "",
  disabled = false,
  ...props
}: MobilePressableProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (haptic && typeof window !== "undefined" && window.navigator?.vibrate) {
      try {
        window.navigator.vibrate(10);
      } catch (_) {}
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`transition-transform duration-100 active:scale-[0.97] active:opacity-90 touch-manipulation select-none ${
        disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
