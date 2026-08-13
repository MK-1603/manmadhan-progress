"use client";

import React, { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Lock, Sparkles, ArrowLeft, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { AuthForm } from "@/components/auth/auth-form";

const FEATURES = [
  { title: "Private Execution OS", desc: "Isolated personal and organization workspace data boundaries." },
  { title: "Enterprise Security", desc: "AES-256 token encryption and role-based access control." },
  { title: "Automated Workflows", desc: "WHEN ➔ IF ➔ DO rules for focus logging, tasks, and governance." },
];

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const redirectUrl = searchParams.get("redirect") || "/personal/dashboard";
  const rawError = searchParams.get("error") || "";
  const initialError =
    rawError === "Unauthorized"
      ? ""
      : rawError === "SessionExpired"
      ? "Your session has expired. Please sign in again."
      : rawError;

  return (
    <div className="min-h-screen w-full bg-background flex flex-col justify-between p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* BACKGROUND DECORATION */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-[120px] pointer-events-none" />

      {/* TOP NAV BAR */}
      <header className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-between pb-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <Image src="/ios/iTunesArtwork@1x.png" alt="ManMadhan Progress" width={28} height={28} className="rounded-md" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-foreground tracking-tight">ManMadhan Progress</span>
            <span className="text-[10px] font-mono font-bold uppercase text-gold tracking-widest">V1 Execution OS</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle Appearance"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-gold" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </header>

      {/* MAIN LOGIN GRID CONTAINER */}
      <main className="relative z-10 w-full max-w-6xl mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-6">

        {/* LEFT BRANDING & VALUE PROP (5 Cols) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="lg:col-span-5 flex flex-col gap-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-bold w-fit">
            <ShieldCheck className="w-4 h-4" />
            <span>Encrypted Authentication</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
              Sign in to your <span className="text-gold">Execution OS</span>
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Access your personal workspace, deep work timer, task pipeline, and organization governance center.
            </p>
          </div>

          {/* FEATURE PILLS */}
          <div className="space-y-3 pt-2">
            {FEATURES.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (idx + 1), duration: 0.4 }}
                className="p-3.5 rounded-xl bg-card border border-border/80 flex items-start gap-3 shadow-sm hover:border-gold/40 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-gold/10 flex items-center justify-center text-gold shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground">{item.title}</span>
                  <span className="text-[11px] text-muted-foreground">{item.desc}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* RIGHT AUTH FORM CARD (7 Cols) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="lg:col-span-7 w-full rounded-3xl bg-card border border-border shadow-2xl overflow-hidden p-6 sm:p-8"
        >
          {initialError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
              {initialError}
            </div>
          )}

          <AuthForm
            onComplete={() => router.push(redirectUrl)}
          />
        </motion.div>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-between text-xs text-muted-foreground pt-6 border-t border-border/60">
        <span>&copy; 2026 ManMadhan Progress. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Home Page
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center text-gold font-bold">
        Loading Login Portal...
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
