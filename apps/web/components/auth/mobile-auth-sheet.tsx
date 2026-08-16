"use client";

import React from "react";
import Image from "next/image";
import { AuthForm } from "./auth-form";
import { useAuth } from "./auth-context";
import { GlobalSheet } from "@/components/ui/global-sheet";

export function MobileAuthSheet({
  open,
  onCancel,
  onComplete,
  children
}: {
  open: boolean;
  onCancel: () => void;
  onComplete: () => void;
  children?: React.ReactNode;
}) {
  const { authState } = useAuth();

  const getCloseLabel = () => {
    if (
      authState === "FORGOT_PASSWORD" ||
      authState === "RESET_SENT" ||
      authState === "RESET_PASSWORD"
    ) {
      return "Close account recovery";
    }
    if (authState === "OTP_VERIFICATION") {
      return "Close verification";
    }
    return "Close authentication";
  };

  const titleHeader = (
    <div className="flex items-center gap-3">
      <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 flex-shrink-0 flex items-center justify-center shadow-xs">
        <Image
          src="/ios/iTunesArtwork@1x.png"
          alt="ManMadhan Progress Logo"
          width={24}
          height={24}
          priority
          className="rounded"
        />
      </div>
      <div className="flex flex-col justify-center text-left">
        <span
          id="mobile-auth-title"
          className="font-bold text-sm text-foreground dark:text-[#F3FFF0] tracking-tight leading-tight"
        >
          ManMadhan Progress
        </span>
        <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider leading-tight mt-0.5 font-semibold">
          <span className="text-[#D4AF37]">V1</span>
          <span className="text-[#626A75]">&middot;</span>
          <span className="text-[#8E949E]">EXECUTION OS</span>
        </div>
      </div>
    </div>
  );

  return (
    <GlobalSheet
      open={open}
      onClose={onCancel}
      title={titleHeader}
      closeLabel={getCloseLabel()}
      snapPoints={["auto"]}
      defaultSnapPoint="auto"
      desktopMode="sheet"
      desktopMaxWidth="max-w-md"
    >
      <div className="flex flex-col justify-start select-text w-full">
        <AuthForm onComplete={onComplete} isMobile={true} />
        {children}
      </div>
    </GlobalSheet>
  );
}
