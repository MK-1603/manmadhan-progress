"use client";

import React from "react";

interface OrganizationLogoProps {
  logoUrl?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  fallbackInitials?: string;
}

export function OrganizationLogo({
  logoUrl,
  name,
  size = "md",
  className = "",
  fallbackInitials = "MM",
}: OrganizationLogoProps) {
  const sizeMap = {
    xs: "w-4 h-4 rounded text-[9px]",
    sm: "w-6 h-6 rounded-md text-[10px]",
    md: "w-9 h-9 rounded-lg text-xs",
    lg: "w-14 h-14 rounded-xl text-base",
    xl: "w-20 h-20 rounded-2xl text-2xl",
  };

  const currentSizeClass = sizeMap[size] || sizeMap.md;

  if (logoUrl) {
    return (
      <div
        className={`relative overflow-hidden bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0 shadow-2xs ${currentSizeClass} ${className}`}
      >
        <img
          src={logoUrl}
          alt={name || "Organization Logo"}
          className="w-full h-full object-contain p-1"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative bg-gold/15 text-gold font-black flex items-center justify-center shrink-0 border border-gold/40 shadow-2xs select-none ${currentSizeClass} ${className}`}
    >
      <span>{fallbackInitials}</span>
    </div>
  );
}

export default OrganizationLogo;
