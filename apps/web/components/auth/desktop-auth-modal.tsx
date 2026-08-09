"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { X } from "lucide-react";
import { AuthForm } from "./auth-form";

const benefits = [
  ["Private Workspace", "A secure environment built for your execution patterns."],
  ["Enterprise Security", "Protected authentication and secure session states."],
  ["Velocity & Focus", "Accelerate progress with clean, data-driven workflows."]
] as const;

export function DesktopAuthModal({ onCancel, onComplete }: { onCancel: () => void, onComplete: () => void }) {
  return (
    <motion.section
      role="dialog"
      aria-modal="true"
      aria-labelledby="desktop-auth-title"
      initial={{ opacity: 0, scale: 0.95, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="relative grid max-h-[90vh] w-full grid-cols-[42%_58%] overflow-hidden rounded-[32px] bg-card text-foreground shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_32px_100px_rgba(0,0,0,0.8)]"
    >
      {/* Left Branding Column */}
      <div className="relative p-8 sm:p-10 flex flex-col justify-between overflow-hidden bg-slate-950">
        
        {/* AI Background Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none"></div>
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-violet-600/30 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-blue-600/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Image
                src="/ios/iTunesArtwork@1x.png"
                alt="ManMadhan Progress"
                width={48}
                height={48}
                className="relative rounded-2xl shadow-2xl"
              />
            </div>
            <div>
              <p className="text-base font-bold text-white tracking-tight">
                ManMadhan Progress
              </p>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-violet-400 mt-0.5">
                Execution OS
              </p>
            </div>
          </div>

          <div className="mt-10">
            <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
              Welcome Back
            </h1>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-400 font-medium max-w-sm">
              Your intelligent workspace designed for meaningful execution, predictive planning, and measurable progress.
            </p>

            <div className="mt-8 space-y-1.5">
              {benefits.map(([title, description], index) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.1, duration: 0.4 }}
                  className="group flex flex-col gap-1 rounded-xl p-3 hover:bg-white/[0.03] transition-colors"
                >
                  <p className="text-[13px] font-semibold text-slate-200 tracking-tight">{title}</p>
                  <p className="text-[11px] leading-relaxed text-slate-400 font-medium">{description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-slate-500 pt-6 border-t border-white/10 mt-8">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            System Online
          </span>
          <span className="text-violet-400/80">Intelligent Workspace</span>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="relative min-h-0 flex flex-col justify-start md:justify-center overflow-hidden p-8 sm:p-10">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close authentication"
          className="absolute right-5 top-5 rounded-full border border-border p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="w-full max-w-[440px] mx-auto pt-2 text-center">
          <div className="text-left w-full">
            <AuthForm onComplete={onComplete} />
          </div>
        </div>
      </div>
    </motion.section>
  );
}
