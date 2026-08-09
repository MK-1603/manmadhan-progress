import React from "react";
import { MobileWelcome } from "@/components/mobile-welcome/MobileWelcome";

export const metadata = {
  title: "Welcome — ManMadhan Progress",
  description: "Plan. Execute. Grow. Your unified execution operating system.",
};

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-[#040508] flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
      {/* Container Wrapper - Native 100dvh on mobile, Device mockup frame on desktop */}
      <div className="w-full sm:w-[410px] md:w-[430px] sm:h-[880px] sm:max-h-[92vh] sm:rounded-[48px] sm:border-[8px] sm:border-[#1E2330] sm:shadow-[0_25px_80px_rgba(0,0,0,0.9)] sm:shadow-amber-500/[0.05] overflow-hidden relative">
        <MobileWelcome />
      </div>
    </div>
  );
}
