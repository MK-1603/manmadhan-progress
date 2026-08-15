"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck, CheckCircle2, ArrowRight, Loader2, KeyRound, Eye, EyeOff, Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";

// ── Hook: Visual Viewport Height for Mobile Keyboard Awareness ──
function useVisualViewportHeight() {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const handleResize = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      }
    };

    window.visualViewport.addEventListener("resize", handleResize);
    window.visualViewport.addEventListener("scroll", handleResize);
    handleResize();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
        window.visualViewport.removeEventListener("scroll", handleResize);
      }
    };
  }, []);

  return viewportHeight;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const visualViewportHeight = useVisualViewportHeight();

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmInputRef = useRef<HTMLInputElement>(null);

  // ── 1. Validate Token on Mount ──
  useEffect(() => {
    if (!token) {
      setValidating(false);
      setTokenValid(false);
      setTokenError("No password reset token was provided. Please request a new link.");
      return;
    }

    let isMounted = true;
    async function verifyToken() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";
        const res = await fetch(`${apiBase}/auth/verify-reset-token?token=${encodeURIComponent(token!)}`);
        const data = await res.json();

        if (!isMounted) return;

        if (res.ok && data.success && data.valid) {
          setTokenValid(true);
          setUserEmail(data.email || "");
        } else {
          setTokenValid(false);
          setTokenError(data.error || "Password reset link is invalid or expired.");
        }
      } catch (err) {
        if (isMounted) {
          setTokenValid(false);
          setTokenError("We couldn't verify this reset link. Please check your connection and try again.");
        }
      } finally {
        if (isMounted) setValidating(false);
      }
    }

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // ── 2. Handle Success 3-Second Auto Redirect ──
  useEffect(() => {
    if (!success) return;

    setPassword("");
    setConfirmPassword("");

    // Clean URL query parameters
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.pathname);
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.replace("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [success, router]);

  // ── 3. Handle Submit Password Reset ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setSubmitError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";
      const res = await fetch(`${apiBase}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setSubmitError(data.error || "Failed to reset password. Please try again.");
      }
    } catch (err) {
      setSubmitError("Connection error. Failed to reach server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  };

  const rules = [
    { id: "min", label: "Minimum 8 characters", valid: password.length >= 8 },
    { id: "match", label: "Passwords match", valid: password.length > 0 && password === confirmPassword },
    { id: "prev", label: "Different from your previous password", valid: true, isNeutral: true },
  ];

  return (
    <div className="min-h-screen bg-[#F4F4F5] dark:bg-[#09090B] flex items-center justify-center p-0 md:p-8 lg:p-12 selection:bg-[#D9A514]/30 selection:text-[#D9A514]">
      
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* ── DESKTOP & TABLET LAYOUT (>= 768px): TRUE LEFT + RIGHT SPLIT ── */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="hidden md:flex w-full max-w-[1140px] min-h-[640px] bg-white dark:bg-[#18181B] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex-row">
        
        {/* LEFT BRAND PANEL (42% Width) */}
        <div className="w-[42%] bg-[#111318] text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#D9A514]" />
          <div className="space-y-6">
            <div className="flex items-center gap-3.5">
              <img
                src="https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png"
                alt="ManMadhan Progress Logo"
                className="w-12 h-12 rounded-xl shadow-md border border-zinc-700/60 object-cover"
              />
              <div>
                <h1 className="font-extrabold tracking-tight text-xl text-white leading-tight">
                  ManMadhan Progress
                </h1>
                <p className="text-[10px] font-extrabold tracking-[0.22em] uppercase text-[#D9A514]">
                  TRACK. FOCUS. ACHIEVE.
                </p>
              </div>
            </div>
            <div className="pt-8 space-y-4">
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-zinc-100 leading-tight">
                Where work becomes visible.
                <span className="block text-[#D9A514] font-extrabold mt-1">Where progress becomes measurable.</span>
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed pt-2 font-normal">
                Securely re-establish your master password to continue monitoring organization goals, milestone deadlines, and team focus.
              </p>
            </div>
          </div>

          <div className="pt-10 border-t border-zinc-800/80 mt-auto flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-[#D9A514]/10 border border-[#D9A514]/20 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-[#D9A514]" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-200 uppercase tracking-wider">PRIVATE BY DESIGN</p>
              <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">Your account and workspace data remain protected with enterprise-grade encryption.</p>
            </div>
          </div>
        </div>

        {/* RIGHT RESET FORM PANEL (58% Width) */}
        <div className="w-[58%] p-8 lg:p-12 flex flex-col justify-center bg-white dark:bg-[#18181B]">
          <div className="w-full max-w-[480px] mx-auto">
            {validating && (
              <div className="py-16 text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-[#D9A514] mx-auto" />
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Verifying password reset security token…
                </p>
              </div>
            )}

            {!validating && !tokenValid && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-6 space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500">
                    PASSWORD RESET
                  </p>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    Reset Link Expired or Invalid
                  </h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                    {tokenError || "This password reset link was valid for 15 minutes and is no longer available."}
                  </p>
                </div>
                <div className="pt-4">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-semibold text-sm transition-all shadow-sm w-full gap-2"
                  >
                    Request a New Reset Link <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            )}

            {!validating && tokenValid && success && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6 space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">
                    SUCCESS
                  </p>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    Password Updated
                  </h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Your master password has been changed securely.
                  </p>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 pt-1">
                    Redirecting to login in {countdown} second{countdown === 1 ? "" : "s"}…
                  </p>
                </div>
                <div className="pt-4">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm transition-all shadow-sm w-full gap-2"
                  >
                    Go to Login <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            )}

            {!validating && tokenValid && !success && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="mb-6 space-y-1">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#D9A514]">
                    ACCOUNT RECOVERY
                  </p>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Create New Password
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-1">
                    Establish a new password for <strong className="text-zinc-800 dark:text-zinc-200">{userEmail}</strong>.
                  </p>
                </div>

                {submitError && (
                  <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
                    {submitError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-[#D9A514] text-sm text-zinc-900 dark:text-zinc-100 transition-all"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Confirm Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-[#D9A514] text-sm text-zinc-900 dark:text-zinc-100 transition-all"
                      placeholder="Confirm new password"
                    />
                  </div>

                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 space-y-2">
                    <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Password Requirements
                    </p>
                    {rules.map((rule, idx) => {
                      const isPass = !rule.isNeutral && rule.valid;
                      return (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${isPass ? "bg-emerald-500 text-white font-bold" : "border border-zinc-300 dark:border-zinc-700 text-zinc-400"}`}>
                            {isPass ? "✓" : "○"}
                          </div>
                          <span className={isPass ? "text-zinc-900 dark:text-zinc-100 font-medium" : "text-zinc-500 dark:text-zinc-400"}>
                            {rule.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || password.length < 8 || password !== confirmPassword}
                    className="w-full h-12 rounded-xl bg-[#111827] hover:bg-zinc-800 text-white font-semibold text-sm flex items-center justify-center transition-all disabled:opacity-50 shadow-sm gap-2 cursor-pointer"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin text-[#D9A514]" /> : "Reset Password →"}
                  </button>
                </form>

                <div className="mt-8 pt-5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                  <Link href="/login" className="hover:text-zinc-900 dark:hover:text-zinc-200 font-semibold transition-colors flex items-center gap-1">
                    ← Back to Login
                  </Link>
                  <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
                    <KeyRound className="w-3.5 h-3.5 text-[#D9A514]" /> 15-Min Link Expiry
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* ── MOBILE LAYOUT (< 768px): KEYBOARD-AWARE BOTTOM SHEET ───────── */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="block md:hidden min-h-screen w-full bg-[#080A0D] relative">
        {/* Mobile Header Branding */}
        <header className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png"
              alt="ManMadhan Progress Logo"
              className="w-9 h-9 rounded-xl shadow-md border border-zinc-700/60 object-cover"
            />
            <div>
              <h1 className="font-extrabold tracking-tight text-base text-white leading-tight">
                ManMadhan Progress
              </h1>
              <p className="text-[9px] font-extrabold tracking-[0.2em] uppercase text-[#D9A514]">
                TRACK. FOCUS. ACHIEVE.
              </p>
            </div>
          </div>
          <Link href="/login" className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors">
            Login
          </Link>
        </header>

        {/* Dynamic Fixed Bottom Sheet */}
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 bg-[#111318] text-white rounded-t-[28px] border-t border-zinc-800 shadow-2xl flex flex-col transition-all duration-200"
          style={{
            maxHeight: visualViewportHeight ? `${visualViewportHeight - 60}px` : "88dvh",
            paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
          }}
        >
          {/* Visual Drag Handle */}
          <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-zinc-700" />
          </div>

          {/* Scrollable Sheet Content */}
          <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6 overscroll-contain">
            {validating && (
              <div className="py-12 text-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#D9A514] mx-auto" />
                <p className="text-xs font-medium text-zinc-400">
                  Verifying password reset security token…
                </p>
              </div>
            )}

            {!validating && !tokenValid && (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500">
                    ACCOUNT RECOVERY
                  </p>
                  <h2 className="text-xl font-bold text-zinc-100">
                    Reset Link Expired or Invalid
                  </h2>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {tokenError || "This password reset link was valid for 15 minutes and is no longer available."}
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-[#D9A514] text-zinc-950 font-bold text-sm w-full gap-2 mt-4"
                >
                  Request a New Reset Link <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {!validating && tokenValid && success && (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">
                    SUCCESS
                  </p>
                  <h2 className="text-xl font-bold text-zinc-100">
                    Password Updated
                  </h2>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Your master password has been changed securely.
                  </p>
                  <p className="text-xs font-medium text-zinc-400 pt-1">
                    Redirecting to login in {countdown} second{countdown === 1 ? "" : "s"}…
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-zinc-100 text-zinc-900 font-bold text-sm w-full gap-2 mt-4"
                >
                  Go to Login <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {!validating && tokenValid && !success && (
              <div>
                <div className="mb-4 space-y-1">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#D9A514]">
                    ACCOUNT RECOVERY
                  </p>
                  <h2 className="text-xl font-bold tracking-tight text-zinc-100">
                    Create New Password
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Establish a new password for <strong className="text-zinc-200">{userEmail}</strong>.
                  </p>
                </div>

                {submitError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                    {submitError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-200">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        ref={passwordInputRef}
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={handleInputFocus}
                        className="w-full h-12 px-4 rounded-xl border border-zinc-800 bg-zinc-900 focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-[#D9A514] text-sm text-zinc-100 transition-all"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-200">
                      Confirm Password
                    </label>
                    <input
                      ref={confirmInputRef}
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={handleInputFocus}
                      className="w-full h-12 px-4 rounded-xl border border-zinc-800 bg-zinc-900 focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-[#D9A514] text-sm text-zinc-100 transition-all"
                      placeholder="Confirm new password"
                    />
                  </div>

                  <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80 space-y-1.5">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Password Requirements
                    </p>
                    {rules.map((rule, idx) => {
                      const isPass = !rule.isNeutral && rule.valid;
                      return (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${isPass ? "bg-emerald-500 text-white font-bold" : "border border-zinc-700 text-zinc-500"}`}>
                            {isPass ? "✓" : "○"}
                          </div>
                          <span className={isPass ? "text-zinc-100 font-medium" : "text-zinc-400"}>
                            {rule.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || password.length < 8 || password !== confirmPassword}
                    className="w-full h-12 rounded-xl bg-[#D9A514] hover:bg-[#E8B623] text-zinc-950 font-bold text-sm flex items-center justify-center transition-all disabled:opacity-50 shadow-sm gap-2 cursor-pointer"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin text-zinc-950" /> : "Reset Password →"}
                  </button>
                </form>

                <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                  <Link href="/login" className="hover:text-zinc-200 font-semibold transition-colors flex items-center gap-1">
                    ← Back to Login
                  </Link>
                  <span className="flex items-center gap-1.5 text-zinc-500 font-medium">
                    <KeyRound className="w-3.5 h-3.5 text-[#D9A514]" /> 15-Min Link Expiry
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F4F4F5] dark:bg-[#09090B] flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#D9A514]" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
