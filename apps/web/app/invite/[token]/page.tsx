"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { Loader2, Check, ArrowRight, ArrowLeft, Shield, Building, Clock, CheckCircle2, User, Search, ChevronDown, Eye, EyeOff, Edit2, X, Sun, Moon, UserCheck } from "lucide-react";
import apiClient from "../../../lib/api-client";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import { ThemeToggle } from "../../../components/theme-toggle";

// Custom Timezone Dropdown supporting Light/Dark Themes & Upward Floating Overlay
function CleanTimezoneDropdown({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const shouldReduceMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const isLight = mounted && resolvedTheme === "light";

  const allTzs = useMemo(() => {
    let list: string[] = [];
    try {
      if (typeof Intl !== "undefined" && (Intl as any).supportedValuesOf) {
        list = (Intl as any).supportedValuesOf("timeZone");
      }
    } catch (e) {}

    if (!list || list.length === 0) {
      list = [
        "Asia/Kolkata",
        "UTC",
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "Europe/London",
        "Europe/Paris",
        "Europe/Berlin",
        "Asia/Dubai",
        "Asia/Singapore",
        "Asia/Tokyo",
        "Australia/Sydney",
      ];
    }

    const now = new Date();
    const formatted = list.map((tz) => {
      let offsetStr = "";
      try {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          timeZoneName: "shortOffset",
        });
        const parts = formatter.formatToParts(now);
        const tzPart = parts.find((p) => p.type === "timeZoneName");
        if (tzPart) {
          offsetStr = tzPart.value.replace("GMT", "GMT");
        }
      } catch (e) {
        offsetStr = "GMT";
      }

      const isIndia = tz === "Asia/Kolkata" || tz === "Asia/Calcutta";

      return {
        value: tz,
        label: isIndia
          ? "(GMT+05:30) Asia/Kolkata — India Standard Time (IST)"
          : offsetStr ? `(${offsetStr}) ${tz}` : tz,
        isIndia,
      };
    });

    return formatted.sort((a, b) => {
      if (a.isIndia) return -1;
      if (b.isIndia) return 1;
      return a.label.localeCompare(b.label);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return allTzs;
    const s = search.toLowerCase();
    return allTzs.filter(t => t.label.toLowerCase().includes(s) || t.value.toLowerCase().includes(s));
  }, [allTzs, search]);

  const currentTzObj = allTzs.find(t => t.value === value || (t.isIndia && (value === "Asia/Kolkata" || value === "Asia/Calcutta"))) || { value, label: value, isIndia: false };

  return (
    <div className="relative w-full space-y-1.5">
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={shouldReduceMotion ? {} : { y: -1 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.985, y: 1 }}
        transition={{ duration: 0.12 }}
        className={`w-full h-11 border px-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between transition-all cursor-pointer shadow-sm ${
          isLight
            ? "bg-[#FFFFFF] border-[#E4E4E7] hover:border-[#D4AF37] focus:border-[#D4AF37] text-[#18181B]"
            : "bg-[#171717] lg:bg-[#090909] border-[#2A2A2A] lg:border-[#222222] hover:border-[#D4AF37] focus:border-[#D4AF37] text-[#F5F5F5]"
        }`}
      >
        <span className="truncate flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
          <span className="truncate">{currentTzObj.label}</span>
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#D4AF37]" : isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute left-0 right-0 bottom-full mb-2 border rounded-xl p-2.5 space-y-2 z-50 origin-bottom ${
              isLight
                ? "bg-[#FFFFFF] border-[#E4E4E7] shadow-[0_16px_36px_rgba(0,0,0,0.12)] text-[#18181B]"
                : "bg-[#151515] border-[#333333] shadow-[0_16px_36px_rgba(0,0,0,0.85)] text-[#F5F5F5]"
            }`}
          >
            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute left-3 top-3 ${isLight ? "text-[#9CA3AF]" : "text-[#71717A]"}`} />
              <input
                type="text"
                autoFocus
                placeholder="Search timezones (e.g. India, Kolkata, London, New York)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full h-9 border pl-8 pr-3 rounded-lg text-xs outline-none transition-all ${
                  isLight
                    ? "bg-[#F8F9FA] border-[#E4E4E7] focus:border-[#D4AF37] text-[#18181B]"
                    : "bg-[#090909] border-[#222222] focus:border-[#D4AF37] text-[#F5F5F5]"
                }`}
              />
            </div>

            <div className="max-h-[140px] overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-[#D4D4D8] dark:scrollbar-thumb-[#333333]">
              {filtered.length === 0 ? (
                <div className={`p-2 text-center text-xs ${isLight ? "text-[#71717A]" : "text-[#71717A]"}`}>No matching timezones found</div>
              ) : (
                filtered.map((tz) => {
                  const isSelected = tz.value === value || (tz.isIndia && (value === "Asia/Kolkata" || value === "Asia/Calcutta"));
                  return (
                    <motion.button
                      key={tz.value}
                      type="button"
                      whileHover={shouldReduceMotion ? {} : { x: 2 }}
                      onClick={() => {
                        onChange(tz.value);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-[#D4AF37]/20 text-[#D4AF37] font-semibold border border-[#D4AF37]/40"
                          : tz.isIndia
                          ? "bg-[#D4AF37]/10 font-medium border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20 " + (isLight ? "text-[#18181B]" : "text-[#F5F5F5]")
                          : isLight
                          ? "hover:bg-[#F4F4F5] text-[#52525B] hover:text-[#18181B]"
                          : "hover:bg-[#090909] text-[#A1A1AA] hover:text-[#F5F5F5]"
                      }`}
                    >
                      <span className="truncate flex items-center gap-1.5">
                        {tz.isIndia && <span className="text-xs">🇮🇳</span>}
                        <span className="truncate">{tz.label}</span>
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />}
                    </motion.button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const shouldReduceMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const isLight = mounted && resolvedTheme === "light";
  
  // Onboarding Step State: 0 (Invitation) -> 1 (Password) -> 2 (Profile) -> 3 (Org) -> 4 (Timezone) -> 5 (Review) -> 6 (Completion)
  const [step, setStep] = useState(0);
  const [acceptingState, setAcceptingState] = useState(false);
  const [logoPulse, setLogoPulse] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  // Form Data State
  const [name, setName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    } catch (e) {
      return "Asia/Kolkata";
    }
  });

  // UX & Validation State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [invitation, setInvitation] = useState<any>(null);
  const [validating, setValidating] = useState(true);
  const [assignedRole, setAssignedRole] = useState("MEMBER");

  // Validate Invitation Token on Mount
  useEffect(() => {
    if (!token) return;
    
    const validateToken = async () => {
      try {
        const res = await apiClient.get(`/invitations/${token}`);
        if (res.data.success) {
          const inv = res.data.data;
          setInvitation(inv);
          if (inv.name) setName(inv.name);
          if (inv.batchNumber) setBatchNumber(inv.batchNumber);
          if (inv.role) setAssignedRole(inv.role);
        } else {
          setError("This invitation link is invalid or has expired. Please contact your administrator.");
        }
      } catch (err: any) {
        setError(err?.response?.data?.error || "This invitation link is invalid or has expired.");
      } finally {
        setValidating(false);
      }
    };
    
    validateToken();
  }, [token]);

  // Handle Tactile 3D Accept Invitation Sequence
  const handleAcceptClick = () => {
    if (acceptingState) return;
    setAcceptingState(true);
    setLogoPulse(true);
    
    setTimeout(() => {
      setStep(1);
      setAcceptingState(false);
      setLogoPulse(false);
    }, 550);
  };

  // Step Advancement Trigger with Logo Micro-Pulse
  const handleNextStep = (nextStepNum: number) => {
    setLogoPulse(true);
    setStep(nextStepNum);
    setTimeout(() => setLogoPulse(false), 200);
  };

  // Close Sheet Gracefully
  const handleCloseSheet = () => {
    setIsClosing(true);
    setTimeout(() => {
      router.push("/");
    }, 240);
  };

  // Password Validations
  const isPasswordMinLength = password.length >= 8;
  const isPasswordMatch = password.length > 0 && password === confirmPassword;
  const canProceedPassword = isPasswordMinLength && isPasswordMatch;

  // Profile Validations
  const canProceedProfile = name.trim().length > 0;

  // Handle Account Submission
  const handleCreateAccount = async () => {
    setLoading(true);
    setError("");
    
    try {
      const res = await apiClient.post(`/invitations/${token}/setup`, { 
        password, 
        name,
        batchNumber,
        timezone,
      });

      if (res.data.success) {
        if (res.data.workspaceId) {
          localStorage.setItem("workspaceId", res.data.workspaceId);
        }
        if (res.data.role) {
          setAssignedRole(res.data.role);
        }
        handleNextStep(6);
      } else {
        setError(res.data.error || "Failed to create account. Please try again.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "An unexpected network error occurred while setting up your account.");
    } finally {
      setLoading(false);
    }
  };

  const handleDashboardRedirect = () => {
    setIsClosing(true);
    setTimeout(() => {
      const rolePath = assignedRole.toUpperCase();
      if (rolePath === "CO-CEO") {
        router.push("/co-ceo/dashboard");
      } else if (rolePath === "CEO") {
        router.push("/ceo/dashboard");
      } else {
        router.push("/member/dashboard");
      }
    }, 280);
  };

  // Render Loader during Token Validation
  if (validating) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isLight ? "bg-[#F4F4F5] text-[#18181B]" : "bg-[#050505] text-[#F5F5F5]"}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
          <span className={`text-xs font-medium ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Validating invitation link...</span>
        </div>
      </div>
    );
  }

  // Render Invalid Token Error View
  if (error && !invitation && step === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isLight ? "bg-[#F4F4F5] text-[#18181B]" : "bg-[#050505] text-[#F5F5F5]"}`}>
        <div className={`border p-8 rounded-2xl max-w-[420px] w-full text-center space-y-4 shadow-2xl ${isLight ? "bg-[#FFFFFF] border-[#E4E4E7]" : "bg-[#101010] border-[#222222]"}`}>
          <div className="w-11 h-11 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto text-base font-bold">
            !
          </div>
          <h2 className="text-base font-bold">Invitation Invalid or Expired</h2>
          <p className={`text-xs leading-relaxed ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>{error}</p>
          <div className="pt-2">
            <button 
              onClick={() => router.push("/")}
              className={`w-full h-10 border text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                isLight ? "bg-[#F4F4F5] hover:bg-[#E4E4E7] border-[#E4E4E7] text-[#18181B]" : "bg-[#151515] hover:bg-[#222222] border-[#333333] text-[#F5F5F5]"
              }`}
            >
              Return to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stepsList = [
    { num: 1, label: "Password", text: "Secure your account" },
    { num: 2, label: "Profile", text: "Set up your profile" },
    { num: 3, label: "Workspace", text: "Confirm workspace" },
    { num: 4, label: "Time Zone", text: "Set your time zone" },
    { num: 5, label: "Review", text: "Review and finish" },
  ];

  return (
    <div className={`min-h-screen flex items-center justify-center p-0 lg:p-8 font-sans selection:bg-[#D4AF37]/30 selection:text-[#F5F5F5] relative overflow-hidden transition-colors duration-200 ${
      isLight ? "bg-[#F4F4F5] text-[#18181B]" : "bg-[#050505] text-[#F5F5F5]"
    }`}>
      
      {/* MOBILE DIMMED BACKDROP OVERLAY */}
      <div className={`lg:hidden fixed inset-0 z-10 ${isLight ? "bg-black/30" : "bg-black/60"}`} />

      {/* ============================================================== */}
      {/* DESKTOP POPUP CARD (lg: min-h 580px) / MOBILE BOTTOM SHEET (< lg h-auto max-h 92dvh) */}
      {/* ============================================================== */}
      <motion.div 
        initial={shouldReduceMotion ? { opacity: 0 } : { y: "100%", scale: 0.985, opacity: 0 }}
        animate={isClosing 
          ? (shouldReduceMotion ? { opacity: 0 } : { y: "100%", scale: 0.985, opacity: 0 })
          : { y: "0%", scale: 1, opacity: 1 }
        }
        transition={{ duration: isClosing ? 0.24 : 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{ perspective: 1200 }}
        className={`w-full max-w-[960px] h-auto lg:min-h-[580px] border-t lg:border rounded-t-[24px] lg:rounded-2xl overflow-hidden flex flex-col lg:flex-row fixed bottom-0 left-0 right-0 lg:relative lg:bottom-auto max-h-[92dvh] lg:max-h-none overflow-y-auto lg:overflow-visible z-20 transition-colors duration-200 ${
          isLight
            ? "bg-[#FFFFFF] border-[#E4E4E7] shadow-[0_16px_50px_rgba(0,0,0,0.14)]"
            : "bg-[#111111] border-[#222222] shadow-[0_-8px_30px_rgba(0,0,0,0.45)] lg:shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
        }`}
      >
        
        {/* ========================================================== */}
        {/* MOBILE COMPACT HEADER ([LOGO] ManMadhan Progress   [TOGGLE] [X]) */}
        {/* ========================================================== */}
        <div className={`lg:hidden flex flex-col border-b sticky top-0 z-30 flex-shrink-0 transition-colors duration-200 ${
          isLight ? "border-[#E4E4E7] bg-[#FFFFFF]" : "border-[#222222] bg-[#111111]"
        }`}>
          {/* Top Drag Handle */}
          <div className={`w-10 h-1 rounded-full mx-auto my-2 ${isLight ? "bg-[#E4E4E7]" : "bg-[#333333]"}`} />
          
          {/* Compact Horizontal Row */}
          <div className="px-5 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div 
                animate={logoPulse && !shouldReduceMotion ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                transition={{ duration: 0.18 }}
                className={`relative h-9 w-9 overflow-hidden rounded-xl border flex-shrink-0 ${isLight ? "border-[#E4E4E7]" : "border-[#333333]"}`}
              >
                <Image
                  src="/ios/iTunesArtwork@1x.png"
                  alt="ManMadhan Progress Logo"
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                  priority
                />
              </motion.div>
              <div className="flex flex-col justify-center">
                <span className={`font-bold text-sm tracking-tight leading-tight ${isLight ? "text-[#18181B]" : "text-[#F5F5F5]"}`}>ManMadhan Progress</span>
                <span className={`text-[10px] font-medium tracking-[0.14em] uppercase leading-tight mt-0.5 ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Execution OS</span>
              </div>
            </div>

            {/* Header Right Action Group: Theme Toggle + Circular Close Button */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <motion.button
                onClick={handleCloseSheet}
                whileHover={shouldReduceMotion ? {} : { y: -1, scale: 1.02 }}
                whileTap={shouldReduceMotion ? {} : { y: 1, scale: 0.96 }}
                transition={{ duration: 0.10 }}
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                  isLight
                    ? "border-[#E4E4E7] bg-[#F4F4F5] text-[#71717A] hover:text-[#18181B]"
                    : "border-[#222222] bg-[#151515] text-[#A1A1AA] hover:text-[#F5F5F5]"
                }`}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* DESKTOP LEFT SECTION — BRAND & CONTEXT      */}
        {/* ========================================== */}
        <div className={`hidden lg:flex w-[360px] p-8 xl:p-9 flex-col justify-between flex-shrink-0 border-r transition-colors duration-200 ${
          isLight ? "bg-[#FAFAFA] border-[#E4E4E7]" : "bg-[#0C0C0C] border-[#1F1F1F]"
        }`}>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div 
                  animate={logoPulse && !shouldReduceMotion ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                  transition={{ duration: 0.18 }}
                  className={`relative h-8 w-8 overflow-hidden rounded-lg border flex-shrink-0 ${isLight ? "border-[#E4E4E7]" : "border-[#333333]"}`}
                >
                  <Image
                    src="/ios/iTunesArtwork@1x.png"
                    alt="ManMadhan Progress Logo"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    priority
                  />
                </motion.div>
                <div>
                  <h2 className={`font-bold text-sm tracking-tight ${isLight ? "text-[#18181B]" : "text-[#F5F5F5]"}`}>ManMadhan Progress</h2>
                  <p className={`text-[11px] font-normal ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Execution OS</p>
                </div>
              </div>
              <ThemeToggle />
            </div>

            <div className="space-y-1.5">
              <h1 className={`text-xl sm:text-2xl font-bold tracking-tight leading-snug ${isLight ? "text-[#18181B]" : "text-[#F5F5F5]"}`}>
                Welcome to <br />
                <span className="text-[#D4AF37]">ManMadhan Progress</span>
              </h1>
              <p className={`text-xs leading-relaxed ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>
                Set up your account and join your organization workspace.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {stepsList.map((st) => {
                const isCurrent = step === st.num || (step === 0 && st.num === 1 && acceptingState);
                const isCompleted = step > st.num;

                return (
                  <div key={st.num} className="flex items-center gap-3.5">
                    <motion.div 
                      animate={{
                        scale: isCurrent ? 1.05 : 1,
                      }}
                      transition={{ duration: 0.15 }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors duration-200 ${
                        isCurrent
                          ? "bg-[#D4AF37] text-[#090909] ring-2 ring-[#D4AF37]/30 shadow-sm"
                          : isCompleted
                          ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40"
                          : isLight
                          ? "bg-[#F4F4F5] text-[#9CA3AF] border border-[#E4E4E7]"
                          : "bg-[#151515] text-[#71717A] border border-[#222222]"
                      }`}
                    >
                      {isCompleted ? (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.15 }}>
                          <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
                        </motion.span>
                      ) : `0${st.num}`}
                    </motion.div>
                    <div>
                      <div className={`text-xs font-semibold transition-colors duration-200 ${
                        isCurrent 
                          ? (isLight ? "text-[#18181B]" : "text-[#F5F5F5]") 
                          : isCompleted 
                          ? (isLight ? "text-[#71717A]" : "text-[#A1A1AA]") 
                          : (isLight ? "text-[#A1A1AA]" : "text-[#71717A]")
                      }`}>
                        {st.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`pt-5 border-t space-y-2 ${isLight ? "border-[#E4E4E7]" : "border-[#1C1C1C]"}`}>
            <p className={`text-xs italic leading-relaxed ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>
              "Everything you need to plan, execute and track your work."
            </p>
            <div className={`text-[11px] flex items-center justify-between ${isLight ? "text-[#A1A1AA]" : "text-[#71717A]"}`}>
              <span>Need help? Contact administrator</span>
              <span>&copy; {new Date().getFullYear()}</span>
            </div>
          </div>

        </div>

        {/* ========================================== */}
        {/* RIGHT SECTION — FORM WORKSPACE              */}
        {/* ========================================== */}
        <div className={`flex-1 p-5 lg:p-11 flex flex-col justify-between relative transition-colors duration-200 ${
          isLight ? "bg-[#FFFFFF]" : "bg-[#111111]"
        }`} style={{ perspective: 1200 }}>
          
          <div className="w-full max-w-[440px] mx-auto my-auto text-left">

            {/* Inner Step Transition with Subtle 3D Depth */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.985 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >

                {/* STEP 0: INVITATION SCREEN */}
                {step === 0 && (
                  <div className="pt-2 lg:pt-0">
                    <motion.div 
                      initial={shouldReduceMotion ? {} : { opacity: 0, y: 8, scale: 0.985 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.22 }}
                      className="space-y-1"
                    >
                      <h1 className={`text-xl sm:text-2xl font-bold tracking-tight text-left ${isLight ? "text-[#18181B]" : "text-[#F5F5F5]"}`}>You've been invited to join</h1>
                      <motion.p 
                        initial={shouldReduceMotion ? {} : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.20, delay: 0.04 }}
                        className={`text-xs sm:text-sm text-left ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}
                      >
                        Accept your invitation to begin account setup.
                      </motion.p>
                    </motion.div>

                    {/* Sequential Staggered 3D Information Rows */}
                    <div className="space-y-3 mt-5">
                      <motion.div 
                        initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.20, delay: 0.06 }}
                        whileHover={shouldReduceMotion ? {} : { y: -1 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}
                        className={`h-14 px-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm shadow-sm transition-shadow ${
                          isLight ? "bg-[#F8F9FA] border-[#E4E4E7] text-[#18181B]" : "bg-[#171717] border-[#2A2A2A] text-[#F5F5F5]"
                        }`}
                      >
                        <span className={`font-medium ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Organization</span>
                        <span className="font-semibold">ManMadhan Progress</span>
                      </motion.div>

                      <motion.div 
                        initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.20, delay: 0.10 }}
                        whileHover={shouldReduceMotion ? {} : { y: -1 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}
                        className={`h-14 px-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm shadow-sm transition-shadow ${
                          isLight ? "bg-[#F8F9FA] border-[#E4E4E7] text-[#18181B]" : "bg-[#171717] border-[#2A2A2A] text-[#F5F5F5]"
                        }`}
                      >
                        <span className={`font-medium ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Assigned Role</span>
                        <motion.span 
                          initial={shouldReduceMotion ? {} : { scale: 0.9 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.15, delay: 0.12 }}
                          className={`font-extrabold text-xs uppercase px-3 py-1 rounded-full border ${
                            assignedRole.toUpperCase() === "CEO"
                              ? "bg-gold/15 text-gold border-gold/40"
                              : assignedRole.toUpperCase() === "CO-CEO"
                              ? "bg-purple-500/15 text-purple-400 border-purple-500/40"
                              : "bg-cyan-500/15 text-cyan-400 border-cyan-500/40"
                          }`}
                        >
                          {assignedRole.toUpperCase() === "CO-CEO" ? "CO-CEO (Executive Board)" : assignedRole.toUpperCase() === "CEO" ? "CEO (Workspace Leader)" : "Member"}
                        </motion.span>
                      </motion.div>

                      {/* ASSIGNED CO-CEO SUPERVISOR ROW */}
                      <motion.div 
                        initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.20, delay: 0.12 }}
                        whileHover={shouldReduceMotion ? {} : { y: -1 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}
                        className={`h-14 px-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm shadow-sm transition-shadow ${
                          isLight ? "bg-[#F8F9FA] border-[#E4E4E7] text-[#18181B]" : "bg-[#171717] border-[#2A2A2A] text-[#F5F5F5]"
                        }`}
                      >
                        <span className={`font-medium ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Assigned Supervisor</span>
                        <span className="font-semibold text-purple-400 flex items-center gap-1.5">
                          {invitation?.assignedCoCeoName || invitation?.assignedCoCeoEmail ? (
                            <>
                              <UserCheck className="w-4 h-4 text-gold shrink-0" />
                              <span>{invitation.assignedCoCeoName || invitation.assignedCoCeoEmail}</span>
                            </>
                          ) : (
                            <span className="text-[#D4AF37] font-bold">CEO Direct</span>
                          )}
                        </span>
                      </motion.div>

                      <motion.div 
                        initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.20, delay: 0.14 }}
                        whileHover={shouldReduceMotion ? {} : { y: -1 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}
                        className={`h-14 px-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm shadow-sm transition-shadow ${
                          isLight ? "bg-[#F8F9FA] border-[#E4E4E7] text-[#18181B]" : "bg-[#171717] border-[#2A2A2A] text-[#F5F5F5]"
                        }`}
                      >
                        <span className={`font-medium max-w-[35%] ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Invited Email</span>
                        <span className="font-mono max-w-[60%] truncate text-right">{invitation?.email}</span>
                      </motion.div>
                    </div>

                    {/* RECONSTRUCTED 3D PRIMARY ACTION CTA */}
                    <div className="mt-6">
                      <motion.button
                        type="button"
                        onClick={handleAcceptClick}
                        whileHover={shouldReduceMotion ? {} : { y: -2, scale: 1.01, boxShadow: "0 6px 18px rgba(212,175,55,0.28)" }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.975, y: 2, boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}
                        transition={{ duration: 0.12, ease: "easeInOut" }}
                        className="group w-full h-[52px] bg-[#D4AF37] hover:bg-[#E0BD4F] active:bg-[#BE9A25] text-[#111111] font-semibold text-[15px] rounded-xl transition-all shadow-[0_4px_14px_rgba(212,175,55,0.22)] flex items-center justify-center cursor-pointer select-none border-none outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                      >
                        <AnimatePresence mode="wait">
                          {acceptingState ? (
                            <motion.span
                              key="accepted"
                              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: 2 }}
                              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: [0.7, 1.08, 1], y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.20, ease: "easeOut" }}
                              className="flex items-center justify-center gap-2 text-[#111111] font-semibold"
                            >
                              <Check className="w-5 h-5 text-[#166534] stroke-[2.5]" /> Invitation Accepted
                            </motion.span>
                          ) : (
                            <motion.span
                              key="normal"
                              initial={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center justify-center gap-2"
                            >
                              <span>Accept Invitation</span>
                              <ArrowRight className="w-5 h-5 stroke-[2] transition-transform duration-150 group-hover:translate-x-[3px]" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* STEP 1: MASTER PASSWORD */}
                {step === 1 && (
                  <div className="pt-2 lg:pt-0 space-y-5">
                    <div>
                      <div className="text-xs font-semibold text-[#D4AF37] uppercase mb-1 text-left tracking-wide">
                        STEP 1 OF 5
                      </div>
                      <h1 className={`text-xl sm:text-2xl font-bold tracking-tight leading-tight text-left ${isLight ? "text-[#18181B]" : "text-[#F5F5F5]"}`}>
                        Create your master password
                      </h1>
                      <p className={`text-xs sm:text-sm mt-1.5 leading-normal text-left ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>
                        Create a secure password for your ManMadhan Progress account.
                      </p>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); if (canProceedPassword) handleNextStep(2); }} className="space-y-4 pt-1">
                      <div className="space-y-1.5 text-left">
                        <label className={`text-xs font-medium block ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Master Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            autoFocus
                            placeholder="At least 8 characters"
                            className={`w-full h-12 border focus:border-[#D4AF37] focus:-translate-y-[1px] pl-3.5 pr-11 rounded-xl text-xs sm:text-sm outline-none transition-all duration-150 ${
                              isLight ? "bg-[#FFFFFF] border-[#E4E4E7] text-[#18181B]" : "bg-[#171717] border-[#2A2A2A] text-[#F5F5F5]"
                            }`}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                          <motion.button
                            type="button"
                            whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
                            onClick={() => setShowPassword(!showPassword)}
                            className={`absolute right-3 top-3 transition-colors p-1 ${isLight ? "text-[#9CA3AF] hover:text-[#18181B]" : "text-[#71717A] hover:text-[#F5F5F5]"}`}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </motion.button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-left">
                        <label className={`text-xs font-medium block ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Confirm Master Password</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            placeholder="Re-enter password"
                            className={`w-full h-12 border focus:border-[#D4AF37] focus:-translate-y-[1px] pl-3.5 pr-11 rounded-xl text-xs sm:text-sm outline-none transition-all duration-150 ${
                              isLight ? "bg-[#FFFFFF] border-[#E4E4E7] text-[#18181B]" : "bg-[#171717] border-[#2A2A2A] text-[#F5F5F5]"
                            }`}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                          <motion.button
                            type="button"
                            whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className={`absolute right-3 top-3 transition-colors p-1 ${isLight ? "text-[#9CA3AF] hover:text-[#18181B]" : "text-[#71717A] hover:text-[#F5F5F5]"}`}
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </motion.button>
                        </div>
                      </div>

                      {/* Compact Requirements Box */}
                      <div className={`p-3 border rounded-xl space-y-1.5 text-xs text-left shadow-sm ${
                        isLight ? "bg-[#F8F9FA] border-[#E4E4E7]" : "bg-[#151515] border-[#222222]"
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <motion.div animate={{ scale: isPasswordMinLength ? [0.8, 1] : 1 }}>
                            <Check className={`w-3.5 h-3.5 ${isPasswordMinLength ? "text-[#16A34A]" : "text-[#9CA3AF]"}`} />
                          </motion.div>
                          <span className={isPasswordMinLength ? (isLight ? "text-[#18181B]" : "text-[#F5F5F5]") : (isLight ? "text-[#71717A]" : "text-[#71717A]")}>At least 8 characters long</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <motion.div animate={{ scale: isPasswordMatch ? [0.8, 1] : 1 }}>
                            <Check className={`w-3.5 h-3.5 ${isPasswordMatch ? "text-[#16A34A]" : "text-[#9CA3AF]"}`} />
                          </motion.div>
                          <span className={isPasswordMatch ? (isLight ? "text-[#18181B]" : "text-[#F5F5F5]") : (isLight ? "text-[#71717A]" : "text-[#71717A]")}>Passwords match</span>
                        </div>
                      </div>

                      {/* DESKTOP FORM ACTIONS */}
                      <div className={`hidden lg:flex items-center gap-3 pt-3 border-t ${isLight ? "border-[#E4E4E7]" : "border-[#1F1F1F]"}`}>
                        <motion.button
                          type="button"
                          onClick={() => handleNextStep(0)}
                          whileHover={shouldReduceMotion ? {} : { y: -1 }}
                          whileTap={shouldReduceMotion ? {} : { scale: 0.98, y: 1 }}
                          className={`h-[52px] w-[40%] border text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isLight ? "border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[#71717A]" : "border-[#222222] bg-[#111111] hover:bg-[#151515] text-[#A1A1AA]"
                          }`}
                        >
                          <ArrowLeft className="w-4 h-4" /> Back
                        </motion.button>
                        <motion.button
                          type="submit"
                          disabled={!canProceedPassword}
                          whileHover={shouldReduceMotion || !canProceedPassword ? {} : { y: -2, scale: 1.01 }}
                          whileTap={shouldReduceMotion || !canProceedPassword ? {} : { scale: 0.975, y: 2 }}
                          className="h-[52px] w-[60%] bg-[#D4AF37] hover:bg-[#E0BD4F] disabled:bg-[#E4E4E7] dark:disabled:bg-[#222222] disabled:text-[#9CA3AF] text-[#111111] font-semibold text-[15px] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        >
                          Continue <ArrowRight className="w-4 h-4 stroke-[2]" />
                        </motion.button>
                      </div>
                    </form>
                  </div>
                )}

                {/* STEP 2: PROFILE SETUP */}
                {step === 2 && (
                  <div className="pt-2 lg:pt-0 space-y-5">
                    <div>
                      <div className="text-xs font-semibold text-[#D4AF37] uppercase mb-1 text-left tracking-wide">
                        STEP 2 OF 5
                      </div>
                      <h1 className={`text-xl sm:text-2xl font-bold tracking-tight leading-tight text-left ${isLight ? "text-[#18181B]" : "text-[#F5F5F5]"}`}>Set up your profile</h1>
                      <p className={`text-xs sm:text-sm mt-1.5 leading-normal text-left ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Add the information that will appear in your workspace.</p>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); if (canProceedProfile) handleNextStep(3); }} className="space-y-4 pt-1">
                      <div className="space-y-1.5 text-left">
                        <label className={`text-xs font-medium block ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Full Name</label>
                        <input
                          type="text"
                          required
                          autoFocus
                          placeholder="e.g. Sai Krishnan"
                          className={`w-full h-12 border focus:border-[#D4AF37] focus:-translate-y-[1px] px-3.5 rounded-xl text-xs sm:text-sm outline-none transition-all duration-150 ${
                            isLight ? "bg-[#FFFFFF] border-[#E4E4E7] text-[#18181B]" : "bg-[#171717] border-[#2A2A2A] text-[#F5F5F5]"
                          }`}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5 text-left">
                        <label className={`text-xs font-medium block ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Batch / Cohort ID</label>
                        <input
                          type="text"
                          placeholder="e.g. MK1603"
                          maxLength={6}
                          className={`w-full h-12 border focus:border-[#D4AF37] focus:-translate-y-[1px] px-3.5 rounded-xl text-xs sm:text-sm outline-none transition-all duration-150 font-mono tracking-widest uppercase ${
                            isLight ? "bg-[#FFFFFF] border-[#E4E4E7] text-[#18181B]" : "bg-[#171717] border-[#2A2A2A] text-[#F5F5F5]"
                          }`}
                          value={batchNumber}
                          onChange={(e) => {
                            const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                            const letters = raw.replace(/[^A-Z]/g, "").slice(0, 2);
                            const digits = raw.replace(/[^0-9]/g, "").slice(0, 4);
                            setBatchNumber(letters + digits);
                          }}
                        />
                        <p className={`text-[11px] pt-0.5 ${isLight ? "text-[#9CA3AF]" : "text-[#71717A]"}`}>
                          Format: 2 letters + 4 digits (e.g. MK1603, SS0778)
                        </p>
                      </div>

                      {/* DESKTOP FORM ACTIONS */}
                      <div className={`hidden lg:flex items-center gap-3 pt-3 border-t ${isLight ? "border-[#E4E4E7]" : "border-[#1F1F1F]"}`}>
                        <motion.button
                          type="button"
                          onClick={() => handleNextStep(1)}
                          whileHover={shouldReduceMotion ? {} : { y: -1 }}
                          whileTap={shouldReduceMotion ? {} : { scale: 0.98, y: 1 }}
                          className={`h-[52px] w-[40%] border text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isLight ? "border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[#71717A]" : "border-[#222222] bg-[#111111] hover:bg-[#151515] text-[#A1A1AA]"
                          }`}
                        >
                          <ArrowLeft className="w-4 h-4" /> Back
                        </motion.button>
                        <motion.button
                          type="submit"
                          disabled={!canProceedProfile}
                          whileHover={shouldReduceMotion || !canProceedProfile ? {} : { y: -2, scale: 1.01 }}
                          whileTap={shouldReduceMotion || !canProceedProfile ? {} : { scale: 0.975, y: 2 }}
                          className="h-[52px] w-[60%] bg-[#D4AF37] hover:bg-[#E0BD4F] disabled:bg-[#E4E4E7] dark:disabled:bg-[#222222] disabled:text-[#9CA3AF] text-[#111111] font-semibold text-[15px] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        >
                          Continue <ArrowRight className="w-4 h-4 stroke-[2]" />
                        </motion.button>
                      </div>
                    </form>
                  </div>
                )}

                {/* STEP 3: WORKSPACE CONFIRMATION */}
                {step === 3 && (
                  <div className="pt-2 lg:pt-0 space-y-5">
                    <div>
                      <div className="text-xs font-semibold text-[#D4AF37] uppercase mb-1 text-left tracking-wide">
                        STEP 3 OF 5
                      </div>
                      <h1 className={`text-xl sm:text-2xl font-bold tracking-tight leading-tight text-left ${isLight ? "text-[#18181B]" : "text-[#F5F5F5]"}`}>Confirm your workspace</h1>
                      <p className={`text-xs sm:text-sm mt-1.5 leading-normal text-left ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Review the workspace details assigned to your invitation.</p>
                    </div>

                    <div className="space-y-3">
                      <motion.div 
                        whileHover={shouldReduceMotion ? {} : { y: -1 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}
                        className={`h-14 px-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm shadow-sm ${
                          isLight ? "bg-[#F8F9FA] border-[#E4E4E7] text-[#18181B]" : "bg-[#171717] border-[#2A2A2A] text-[#F5F5F5]"
                        }`}
                      >
                        <span className={`font-medium ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Organization</span>
                        <span className="font-semibold">ManMadhan Progress</span>
                      </motion.div>

                      <motion.div 
                        whileHover={shouldReduceMotion ? {} : { y: -1 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}
                        className={`h-14 px-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm shadow-sm ${
                          isLight ? "bg-[#F8F9FA] border-[#E4E4E7] text-[#18181B]" : "bg-[#171717] border-[#2A2A2A] text-[#F5F5F5]"
                        }`}
                      >
                        <span className={`font-medium ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Role</span>
                        <span className="font-semibold text-[#16A34A] dark:text-[#22C55E] uppercase">{assignedRole}</span>
                      </motion.div>

                      <motion.div 
                        whileHover={shouldReduceMotion ? {} : { y: -1 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}
                        className={`h-14 px-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm shadow-sm ${
                          isLight ? "bg-[#F8F9FA] border-[#E4E4E7] text-[#18181B]" : "bg-[#171717] border-[#2A2A2A] text-[#F5F5F5]"
                        }`}
                      >
                        <span className={`font-medium ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Workspace</span>
                        <span className="font-semibold">ManMadhan</span>
                      </motion.div>

                      <motion.div 
                        whileHover={shouldReduceMotion ? {} : { y: -1 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}
                        className={`h-14 px-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm shadow-sm ${
                          isLight ? "bg-[#F8F9FA] border-[#E4E4E7] text-[#18181B]" : "bg-[#171717] border-[#2A2A2A] text-[#F5F5F5]"
                        }`}
                      >
                        <span className={`font-medium max-w-[35%] ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Email</span>
                        <span className="font-mono max-w-[60%] truncate text-right">{invitation?.email}</span>
                      </motion.div>
                    </div>

                    {/* DESKTOP FORM ACTIONS */}
                    <div className={`hidden lg:flex items-center gap-3 pt-3 border-t ${isLight ? "border-[#E4E4E7]" : "border-[#1F1F1F]"}`}>
                      <motion.button
                        type="button"
                        onClick={() => handleNextStep(2)}
                        whileHover={shouldReduceMotion ? {} : { y: -1 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.98, y: 1 }}
                        className={`h-[52px] w-[40%] border text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isLight ? "border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[#71717A]" : "border-[#222222] bg-[#111111] hover:bg-[#151515] text-[#A1A1AA]"
                        }`}
                      >
                        <ArrowLeft className="w-4 h-4" /> Back
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => handleNextStep(4)}
                        whileHover={shouldReduceMotion ? {} : { y: -2, scale: 1.01 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.975, y: 2 }}
                        className="h-[52px] w-[60%] bg-[#D4AF37] hover:bg-[#E0BD4F] text-[#111111] font-semibold text-[15px] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      >
                        Continue <ArrowRight className="w-4 h-4 stroke-[2]" />
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* STEP 4: TIME ZONE */}
                {step === 4 && (
                  <div className="pt-2 lg:pt-0 space-y-5">
                    <div>
                      <div className="text-xs font-semibold text-[#D4AF37] uppercase mb-1 text-left tracking-wide">
                        STEP 4 OF 5
                      </div>
                      <h1 className={`text-xl sm:text-2xl font-bold tracking-tight leading-tight text-left ${isLight ? "text-[#18181B]" : "text-[#F5F5F5]"}`}>Set your time zone</h1>
                      <p className={`text-xs sm:text-sm mt-1.5 leading-normal text-left ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>
                        Your time zone will be used for deadlines, reminders and activity times.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5 text-left">
                        <label className={`text-xs font-medium block ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Time Zone</label>
                        <CleanTimezoneDropdown value={timezone} onChange={setTimezone} />
                      </div>

                      {/* DESKTOP FORM ACTIONS */}
                      <div className={`hidden lg:flex items-center gap-3 pt-3 border-t ${isLight ? "border-[#E4E4E7]" : "border-[#1F1F1F]"}`}>
                        <motion.button
                          type="button"
                          onClick={() => handleNextStep(3)}
                          whileHover={shouldReduceMotion ? {} : { y: -1 }}
                          whileTap={shouldReduceMotion ? {} : { scale: 0.98, y: 1 }}
                          className={`h-[52px] w-[40%] border text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isLight ? "border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[#71717A]" : "border-[#222222] bg-[#111111] hover:bg-[#151515] text-[#A1A1AA]"
                          }`}
                        >
                          <ArrowLeft className="w-4 h-4" /> Back
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={() => handleNextStep(5)}
                          whileHover={shouldReduceMotion ? {} : { y: -2, scale: 1.01 }}
                          whileTap={shouldReduceMotion ? {} : { scale: 0.975, y: 2 }}
                          className="h-[52px] w-[60%] bg-[#D4AF37] hover:bg-[#E0BD4F] text-[#111111] font-semibold text-[15px] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        >
                          Continue <ArrowRight className="w-4 h-4 stroke-[2]" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: REVIEW (SINGLE UNIFIED CARD WITH DIVIDERS) */}
                {step === 5 && (
                  <div className="pt-2 lg:pt-0 space-y-4">
                    <div>
                      <div className="text-xs font-semibold text-[#D4AF37] uppercase mb-1 text-left tracking-wide">
                        STEP 5 OF 5
                      </div>
                      <h1 className={`text-xl sm:text-2xl font-bold tracking-tight leading-tight text-left ${isLight ? "text-[#18181B]" : "text-[#F5F5F5]"}`}>Review your setup</h1>
                      <p className={`text-xs sm:text-sm mt-1 leading-normal text-left ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Please verify your information before completing setup.</p>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-[#EF4444] text-xs rounded-xl text-center font-medium">
                        {error}
                      </div>
                    )}

                    {/* SINGLE UNIFIED COMPACT REVIEW CARD */}
                    <div className={`border rounded-xl shadow-sm overflow-hidden ${
                      isLight ? "bg-[#F8F9FA] border-[#E4E4E7] divide-y divide-[#E4E4E7]" : "bg-[#151515] border-[#222222] divide-y divide-[#222222]/80"
                    }`}>
                      {/* Row 1: Full Name */}
                      <div className={`p-3 sm:p-3.5 flex items-center justify-between text-xs sm:text-sm transition-colors ${isLight ? "hover:bg-[#F4F4F5]" : "hover:bg-[#1A1A1A]"}`}>
                        <div>
                          <div className={`text-[10px] sm:text-[11px] font-medium uppercase tracking-wider ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Full Name</div>
                          <div className={`font-semibold mt-0.5 ${isLight ? "text-[#18181B]" : "text-[#F5F5F5]"}`}>{name}</div>
                        </div>
                        <motion.button
                          type="button"
                          whileTap={shouldReduceMotion ? {} : { scale: 0.92 }}
                          onClick={() => handleNextStep(2)}
                          className="text-[#D4AF37] hover:underline text-xs flex items-center gap-1 font-medium px-2 py-1 rounded-md hover:bg-[#D4AF37]/10 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </motion.button>
                      </div>

                      {/* Row 2: Batch / Cohort */}
                      <div className={`p-3 sm:p-3.5 flex items-center justify-between text-xs sm:text-sm transition-colors ${isLight ? "hover:bg-[#F4F4F5]" : "hover:bg-[#1A1A1A]"}`}>
                        <div>
                          <div className={`text-[10px] sm:text-[11px] font-medium uppercase tracking-wider ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Batch / Cohort</div>
                          <div className="font-semibold text-[#D4AF37] mt-0.5">{batchNumber || "—"}</div>
                        </div>
                        <motion.button
                          type="button"
                          whileTap={shouldReduceMotion ? {} : { scale: 0.92 }}
                          onClick={() => handleNextStep(2)}
                          className="text-[#D4AF37] hover:underline text-xs flex items-center gap-1 font-medium px-2 py-1 rounded-md hover:bg-[#D4AF37]/10 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </motion.button>
                      </div>

                      {/* Row 3: Organization */}
                      <div className={`p-3 sm:p-3.5 flex items-center justify-between text-xs sm:text-sm transition-colors ${isLight ? "hover:bg-[#F4F4F5]" : "hover:bg-[#1A1A1A]"}`}>
                        <div>
                          <div className={`text-[10px] sm:text-[11px] font-medium uppercase tracking-wider ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Organization</div>
                          <div className={`font-semibold mt-0.5 ${isLight ? "text-[#18181B]" : "text-[#F5F5F5]"}`}>ManMadhan Progress</div>
                        </div>
                        <motion.button
                          type="button"
                          whileTap={shouldReduceMotion ? {} : { scale: 0.92 }}
                          onClick={() => handleNextStep(3)}
                          className="text-[#D4AF37] hover:underline text-xs flex items-center gap-1 font-medium px-2 py-1 rounded-md hover:bg-[#D4AF37]/10 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </motion.button>
                      </div>

                      {/* Row 4: Role & Workspace */}
                      <div className={`p-3 sm:p-3.5 flex items-center justify-between text-xs sm:text-sm transition-colors ${isLight ? "hover:bg-[#F4F4F5]" : "hover:bg-[#1A1A1A]"}`}>
                        <div>
                          <div className={`text-[10px] sm:text-[11px] font-medium uppercase tracking-wider ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Role & Workspace</div>
                          <div className="font-bold uppercase text-xs mt-0.5 flex items-center gap-1.5">
                            <span className={assignedRole.toUpperCase() === "CO-CEO" ? "text-purple-400" : assignedRole.toUpperCase() === "CEO" ? "text-[#D4AF37]" : "text-cyan-400"}>
                              {assignedRole}
                            </span>
                            <span className="text-[#A1A1AA]">• MANMADHAN</span>
                          </div>
                        </div>
                        <motion.button
                          type="button"
                          whileTap={shouldReduceMotion ? {} : { scale: 0.92 }}
                          onClick={() => handleNextStep(3)}
                          className="text-[#D4AF37] hover:underline text-xs flex items-center gap-1 font-medium px-2 py-1 rounded-md hover:bg-[#D4AF37]/10 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </motion.button>
                      </div>

                      {/* Row 4.5: Assigned CO-CEO Supervisor */}
                      <div className={`p-3 sm:p-3.5 flex items-center justify-between text-xs sm:text-sm transition-colors ${isLight ? "hover:bg-[#F4F4F5]" : "hover:bg-[#1A1A1A]"}`}>
                        <div>
                          <div className={`text-[10px] sm:text-[11px] font-medium uppercase tracking-wider ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Assigned Supervisor / CO-CEO</div>
                          <div className="font-semibold text-purple-400 text-xs mt-0.5 flex items-center gap-1.5">
                            {invitation?.assignedCoCeoName || invitation?.assignedCoCeoEmail ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                                <span>{invitation.assignedCoCeoName || invitation.assignedCoCeoEmail}</span>
                              </>
                            ) : assignedRole.toUpperCase() === "CO-CEO" ? (
                              <span className="text-[#D4AF37] font-bold">Executive Board</span>
                            ) : (
                              <span className="text-[#D4AF37]">CEO Direct</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Row 5: Time Zone */}
                      <div className={`p-3 sm:p-3.5 flex items-center justify-between text-xs sm:text-sm transition-colors ${isLight ? "hover:bg-[#F4F4F5]" : "hover:bg-[#1A1A1A]"}`}>
                        <div>
                          <div className={`text-[10px] sm:text-[11px] font-medium uppercase tracking-wider ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Time Zone</div>
                          <div className={`font-semibold mt-0.5 truncate max-w-[200px] sm:max-w-[260px] ${isLight ? "text-[#18181B]" : "text-[#F5F5F5]"}`}>{timezone}</div>
                        </div>
                        <motion.button
                          type="button"
                          whileTap={shouldReduceMotion ? {} : { scale: 0.92 }}
                          onClick={() => handleNextStep(4)}
                          className="text-[#D4AF37] hover:underline text-xs flex items-center gap-1 font-medium px-2 py-1 rounded-md hover:bg-[#D4AF37]/10 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </motion.button>
                      </div>
                    </div>

                    {/* DESKTOP FORM ACTIONS */}
                    <div className={`hidden lg:flex items-center gap-3 pt-3 border-t ${isLight ? "border-[#E4E4E7]" : "border-[#1F1F1F]"}`}>
                      <motion.button
                        type="button"
                        disabled={loading}
                        onClick={() => handleNextStep(4)}
                        whileHover={shouldReduceMotion ? {} : { y: -1 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.98, y: 1 }}
                        className={`h-[52px] w-[40%] border text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                          isLight ? "border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[#71717A]" : "border-[#222222] bg-[#111111] hover:bg-[#151515] text-[#A1A1AA]"
                        }`}
                      >
                        <ArrowLeft className="w-4 h-4" /> Back
                      </motion.button>
                      <motion.button
                        type="button"
                        disabled={loading}
                        onClick={handleCreateAccount}
                        whileHover={shouldReduceMotion || loading ? {} : { y: -2, scale: 1.01 }}
                        whileTap={shouldReduceMotion || loading ? {} : { scale: 0.975, y: 2 }}
                        className="h-[52px] w-[60%] bg-[#D4AF37] hover:bg-[#E0BD4F] text-[#111111] font-semibold text-[15px] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-[#111111]" /> Creating...
                          </>
                        ) : (
                          <>Create Account</>
                        )}
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* STEP 6: COMPLETION */}
                {step === 6 && (
                  <div className="pt-2 lg:pt-0 space-y-5 text-center">
                    <motion.div 
                      initial={shouldReduceMotion ? {} : { scale: 0.7, opacity: 0 }}
                      animate={{ scale: [0.7, 1.08, 1], opacity: 1 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="w-11 h-11 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#16A34A] dark:text-[#22C55E] flex items-center justify-center mx-auto shadow-sm"
                    >
                      <CheckCircle2 className="w-6 h-6" />
                    </motion.div>

                    <div className="space-y-1">
                      <h1 className={`text-xl sm:text-2xl font-bold ${isLight ? "text-[#18181B]" : "text-[#F5F5F5]"}`}>You're all set.</h1>
                      <p className={`text-xs sm:text-sm ${isLight ? "text-[#71717A]" : "text-[#A1A1AA]"}`}>Your ManMadhan Progress workspace is ready.</p>
                    </div>

                    <div className={`p-4 border rounded-xl text-left space-y-2.5 text-xs sm:text-sm shadow-sm ${
                      isLight ? "bg-[#F8F9FA] border-[#E4E4E7]" : "bg-[#171717] border-[#2A2A2A]"
                    }`}>
                      <div className="flex items-center justify-between text-[#16A34A] dark:text-[#22C55E]">
                        <span>✓ Profile created</span>
                        <Check className="w-4 h-4" />
                      </div>
                      <div className="flex items-center justify-between text-[#16A34A] dark:text-[#22C55E]">
                        <span>✓ Workspace connected</span>
                        <Check className="w-4 h-4" />
                      </div>
                      <div className="flex items-center justify-between text-[#16A34A] dark:text-[#22C55E]">
                        <span>✓ Preferences saved</span>
                        <Check className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="pt-2">
                      <motion.button
                        onClick={handleDashboardRedirect}
                        whileHover={shouldReduceMotion ? {} : { y: -2, scale: 1.01 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.975, y: 2 }}
                        className="w-full h-[52px] bg-[#D4AF37] hover:bg-[#E0BD4F] text-[#111111] font-semibold text-[15px] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      >
                        Go to Dashboard <ArrowRight className="w-5 h-5 stroke-[2]" />
                      </motion.button>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>

          </div>

          {/* ========================================================== */}
          {/* RECONSTRUCTED MOBILE ACTION FOOTER (STEPS 1-5 ONLY: 40%/60%) */}
          {/* ========================================================== */}
          {step >= 1 && step <= 5 && (
            <div className={`lg:hidden sticky bottom-0 pt-3 pb-1 border-t flex items-center gap-3 mt-3 z-20 transition-colors duration-200 ${
              isLight ? "bg-[#FFFFFF] border-[#E4E4E7]" : "bg-[#111111] border-[#1F1F1F]"
            }`}>
              <motion.button
                type="button"
                onClick={() => handleNextStep(step - 1)}
                whileHover={shouldReduceMotion ? {} : { y: -1 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.98, y: 1 }}
                className={`h-[52px] w-[40%] border text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isLight ? "border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[#71717A]" : "border-[#222222] bg-transparent hover:bg-[#151515] text-[#A1A1AA]"
                }`}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </motion.button>
              
              <motion.button
                type="button"
                onClick={() => {
                  if (step === 1 && canProceedPassword) handleNextStep(2);
                  else if (step === 2 && canProceedProfile) handleNextStep(3);
                  else if (step === 3) handleNextStep(4);
                  else if (step === 4) handleNextStep(5);
                  else if (step === 5) handleCreateAccount();
                }}
                disabled={(step === 1 && !canProceedPassword) || (step === 2 && !canProceedProfile) || loading}
                whileHover={shouldReduceMotion || (step === 1 && !canProceedPassword) || (step === 2 && !canProceedProfile) || loading ? {} : { y: -2, scale: 1.01 }}
                whileTap={shouldReduceMotion || (step === 1 && !canProceedPassword) || (step === 2 && !canProceedProfile) || loading ? {} : { scale: 0.975, y: 2 }}
                className="h-[52px] w-[60%] bg-[#D4AF37] hover:bg-[#E0BD4F] active:bg-[#BE9A25] disabled:bg-[#E4E4E7] dark:disabled:bg-[#222222] disabled:text-[#9CA3AF] dark:disabled:text-[#71717A] text-[#111111] font-semibold text-[15px] rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {step === 5 ? (
                  loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <>Create Account</>
                ) : (
                  <>Continue <ArrowRight className="w-5 h-5 stroke-[2]" /></>
                )}
              </motion.button>
            </div>
          )}

        </div>

      </motion.div>

    </div>
  );
}
