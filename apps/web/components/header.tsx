"use client";

import React from "react";
import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";
import { GetStartedButton } from "./get-started-button";

/**
 * DESKTOP HEADER VIEW (1440px+)
 * Compact, sleek desktop header layout with proportioned logo.
 */
function DesktopHeader() {
  return (
    <nav
      aria-label="Desktop Navigation"
      className="w-full px-6 lg:px-10 hidden xl:flex items-center justify-between h-16"
    >
      {/* LEFT: Compact Logo (36px) + Divider + Brand Name + Tagline */}
      <div className="flex items-center gap-4">
        <div className="relative h-[36px] w-[36px] flex-shrink-0 overflow-hidden rounded-lg">
          <img
            src="https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png"
            alt="ManMadhan Progress Desktop Logo"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-white/15" aria-hidden="true" />

        <div className="flex flex-col justify-center leading-tight">
          <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
            ManMadhan Progress
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-normal tracking-normal pt-0.5">
            <span>Plan Better. Focus Deeper.</span>
            <span className="text-[#C89B3C] dark:text-[#D4AF37] font-semibold">Achieve Greater.</span>
          </span>
        </div>
      </div>

      <div className="flex-1" />

      {/* RIGHT: Theme Toggle + CTA Button */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <GetStartedButton />
      </div>
    </nav>
  );
}

/**
 * TABLET HEADER VIEW (768px - 1439px)
 * Isolated layout for tablet displays.
 */
function TabletHeader() {
  return (
    <nav
      aria-label="Tablet Navigation"
      className="w-full px-6 hidden md:flex xl:hidden items-center justify-between h-16"
    >
      {/* LEFT: Logo (36px) + Divider + Brand Name + Tagline */}
      <div className="flex items-center gap-3.5">
        <div className="relative h-[36px] w-[36px] flex-shrink-0 overflow-hidden rounded-lg">
          <img
            src="https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png"
            alt="ManMadhan Progress Tablet Logo"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-white/15" aria-hidden="true" />

        <div className="flex flex-col justify-center leading-tight">
          <span className="font-bold text-sm md:text-base tracking-tight text-slate-900 dark:text-white">
            ManMadhan Progress
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] md:text-xs text-slate-500 dark:text-slate-400 font-normal tracking-normal pt-0.5">
            <span>Plan Better. Focus Deeper.</span>
            <span className="text-[#C89B3C] dark:text-[#D4AF37] font-semibold">Achieve Greater.</span>
          </span>
        </div>
      </div>

      <div className="flex-1" />

      {/* RIGHT: Theme Toggle + CTA Button */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <GetStartedButton />
      </div>
    </nav>
  );
}

/**
 * MOBILE HEADER VIEW (<768px)
 * Isolated layout for mobile displays.
 */
function MobileHeader() {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="w-full px-4 flex md:hidden items-center justify-between h-14"
    >
      {/* LEFT: Mobile Logo (32px) + Brand Name + Mobile Tag */}
      <div className="flex items-center gap-2.5">
        <div className="relative h-[32px] w-[32px] flex-shrink-0 overflow-hidden rounded-md">
          <img
            src="https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png"
            alt="ManMadhan Progress Mobile Logo"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex flex-col justify-center leading-tight">
          <span className="font-bold text-xs sm:text-sm tracking-tight text-slate-900 dark:text-white">
            ManMadhan Progress
          </span>
          <span className="text-[10px] text-[#C89B3C] dark:text-[#D4AF37] font-semibold tracking-wide pt-0.5">
            Plan. Execute. Grow.
          </span>
        </div>
      </div>

      <div className="flex-1" />

      {/* The welcome screen owns the mobile actions; keep this header focused on identity. */}
    </nav>
  );
}

/**
 * MAIN HEADER COMPONENT
 * Renders dedicated Desktop, Tablet, and Mobile sub-views.
 */
export function Header() {
  return (
    <header className="hidden md:block sticky top-0 z-50 w-full bg-white/95 dark:bg-[#07090E]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 transition-colors duration-200">
      <DesktopHeader />
      <TabletHeader />
    </header>
  );
}
