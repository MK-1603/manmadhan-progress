"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleButton } from "./google-button";
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Check,
  ChevronDown,
  Search,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Download,
  Copy,
  Share2,
  KeyRound
} from "lucide-react";
import apiClient from "../../lib/api-client";
import { useAuth, getDashboardPathForRole, syncTokenCookie } from "./auth-context";
import React from "react";

type SetUserFn = (user: any) => void;

const timezones = [
  "Pacific/Midway", "Pacific/Honolulu", "America/Anchorage", "America/Los_Angeles", 
  "America/Denver", "America/Chicago", "America/New_York", "America/Caracas", 
  "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Berlin", 
  "Europe/Moscow", "Africa/Cairo", "Africa/Johannesburg", "Asia/Dubai", 
  "Asia/Kolkata", "Asia/Dhaka", "Asia/Bangkok", "Asia/Singapore", 
  "Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland", "UTC"
].concat((function() {
  try { return Intl.supportedValuesOf('timeZone').filter(tz => tz !== 'Asia/Calcutta'); }
  catch (e) { return []; }
})()).filter((value, index, self) => self.indexOf(value) === index);

export type AuthState =
  | "EMAIL_ENTRY"
  | "ACCOUNT_NOT_FOUND"
  | "OTP_VERIFICATION"
  | "PASSWORD_CREATION"
  | "PASSWORD_CHANGE_REQUIRED"
  | "PASSWORD"
  | "FORGOT_PASSWORD"
  | "RESET_PASSWORD"
  | "RESET_SENT"
  | "PROFILE_SETUP"
  | "RECOVERY_CODES"
  | "BATCH_ID_VERIFICATION"
  | "ORGANIZATION_SETUP"
  | "REVIEW_SETUP"
  | "SETUP_COMPLETE"
  | "SUCCESS"
  | "ERROR";

const fadeSlideProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.16, ease: "easeOut" as const }
};

const ParticleBurst = () => null;

function CustomTimeZoneCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (tz: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  const filteredTzs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return null;
    return timezones.filter((tz) => tz.toLowerCase().includes(query));
  }, [search]);

  const groups = useMemo(() => {
    const recent = [value, "Asia/Kolkata", "UTC"].filter(
      (tz, idx, self) => self.indexOf(tz) === idx
    );

    const india = ["Asia/Kolkata"];
    const asia = timezones.filter((tz) => tz.startsWith("Asia/") && tz !== "Asia/Kolkata");
    const europe = timezones.filter((tz) => tz.startsWith("Europe/"));
    const northAmerica = timezones.filter(
      (tz) => tz.startsWith("America/") && !tz.includes("Sao_Paulo") && !tz.includes("Caracas")
    );
    const southAmerica = timezones.filter(
      (tz) => tz.includes("Sao_Paulo") || tz.includes("Caracas") || tz.includes("Buenos_Aires")
    );
    const africa = timezones.filter((tz) => tz.startsWith("Africa/"));
    const pacific = timezones.filter(
      (tz) => tz.startsWith("Pacific/") || tz.startsWith("Australia/")
    );

    return [
      { name: "Recent", items: recent },
      { name: "India", items: india },
      { name: "Asia", items: asia.slice(0, 15) },
      { name: "Europe", items: europe.slice(0, 15) },
      { name: "North America", items: northAmerica.slice(0, 15) },
      { name: "South America", items: southAmerica.slice(0, 10) },
      { name: "Africa", items: africa.slice(0, 10) },
      { name: "Pacific", items: pacific.slice(0, 10) },
    ];
  }, [value]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-[52px] rounded-xl bg-[#FFFFFF] dark:bg-[#111419] border ${
          isOpen ? "border-[#B99625] dark:border-[#D7B33A]" : "border-[#D9DDE3] dark:border-[#282E36]"
        } px-4 text-xs font-medium text-[#171A1F] dark:text-[#F3F4F6] flex items-center justify-between outline-none transition-all cursor-pointer shadow-inner`}
      >
        <span className="truncate">{value || "Asia/Kolkata"}</span>
        <ChevronDown
          className={`w-4 h-4 text-[#69717D] dark:text-[#8B93A0] transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#B99625] dark:text-[#D7B33A]" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-[58px] z-50 bg-[#FFFFFF] dark:bg-[#12161C] border border-[#D9DDE3] dark:border-[#282E36] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[260px] sm:max-h-[300px]"
          >
            <div className="p-2 border-b border-[#D9DDE3] dark:border-[#282E36] bg-[#F7F7F5] dark:bg-[#111419] flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#69717D] dark:text-[#8B93A0] ml-2 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search time zone..."
                className="w-full bg-transparent text-xs text-[#171A1F] dark:text-[#F3F4F6] placeholder-[#69717D] dark:placeholder-[#8B93A0] outline-none py-1.5 px-1"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="overflow-y-auto p-1.5 scrollbar-thin space-y-3">
              {filteredTzs ? (
                <div className="space-y-0.5">
                  {filteredTzs.length === 0 ? (
                    <p className="text-xs text-[#69717D] dark:text-[#8B93A0] p-3 text-center">No timezones found</p>
                  ) : (
                    filteredTzs.map((tz) => {
                      const isSelected = tz === value;
                      return (
                        <button
                          key={tz}
                          type="button"
                          onClick={() => {
                            onChange(tz);
                            setIsOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-[#B99625]/15 dark:bg-[#D7B33A]/15 text-[#B99625] dark:text-[#D7B33A] font-semibold"
                              : "text-[#171A1F] dark:text-[#F3F4F6] hover:bg-[#F1F2F4] dark:hover:bg-[#1C222B]"
                          }`}
                        >
                          <span className="truncate">{tz}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#B99625] dark:text-[#D7B33A] shrink-0 ml-2" />}
                        </button>
                      );
                    })
                  )}
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.name} className="space-y-1">
                    <p className="text-[10px] font-mono font-bold tracking-widest text-[#767E8C] uppercase px-3 pt-1">
                      {group.name}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((tz) => {
                        const isSelected = tz === value;
                        return (
                          <button
                            key={tz}
                            type="button"
                            onClick={() => {
                              onChange(tz);
                              setIsOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors ${
                              isSelected
                                ? "bg-[#D7B33A]/15 text-[#D7B33A] font-semibold"
                                : "text-[#F3F4F6] hover:bg-[#1C222B]"
                            }`}
                          >
                            <span className="truncate">{tz}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#D7B33A] shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AuthForm({ 
  onComplete, 
  isMobile = false,
  initialState,
  initialToken,
  initialRole,
  initialEmail
}: { 
  onComplete?: () => void, 
  isMobile?: boolean,
  initialState?: string,
  initialToken?: string,
  initialRole?: string,
  initialEmail?: string
}) {
  const router = useRouter();
  const { close, setIsDirty, setAuthState, authData, setAuthData, setIsTransitioning, setTransitionMessage, checkSession, setSessionUser } = useAuth();
  
  const startingState = initialState || authData?.step || "EMAIL_ENTRY";
  const startingToken = initialToken || authData?.token || "";
  const startingRole = initialRole || authData?.role || "MEMBER";

  const [state, setState] = useState<AuthState>(startingState as AuthState);
  
  const [loadingState, setLoadingState] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Data Context
  const [email, setEmail] = useState(initialEmail || "");
  const obfuscatedEmail = useMemo(() => {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
  }, [email]);
  const [tempToken, setTempToken] = useState(startingToken);
  const [otp, setOtp] = useState("");
  const otpAutoSubmitRef = React.useRef(false); // tracks whether this 6-digit OTP has already been auto-submitted
function getOnboardingStepInfo(state: AuthState, userRole?: string, hasOrgStep: boolean = true) {
  const isCeo = (userRole || "").toUpperCase().trim() === "CEO";
  const includeOrg = hasOrgStep && isCeo;

  const steps = [
    { id: "PASSWORD_CREATION", title: "CHANGE PASSWORD" },
    { id: "PROFILE_SETUP", title: "PERSONAL PROFILE" },
    { id: "RECOVERY_CODES", title: "RECOVERY CODES" },
    { id: "BATCH_ID_VERIFICATION", title: "INVITE BATCH ID" },
    ...(includeOrg ? [{ id: "ORGANIZATION_SETUP", title: "ORGANIZATION SETUP" }] : []),
    { id: "REVIEW_SETUP", title: "REVIEW" },
    { id: "SETUP_COMPLETE", title: "COMPLETE SETUP" },
  ];

  const activeIdx = steps.findIndex(
    (s) => s.id === state || (state === "PASSWORD_CHANGE_REQUIRED" && s.id === "PASSWORD_CREATION")
  );

  if (activeIdx === -1) return null;

  const currentStepNum = activeIdx + 1;
  const totalSteps = steps.length;
  const formattedCurrent = String(currentStepNum).padStart(2, "0");
  const formattedTotal = String(totalSteps).padStart(2, "0");

  return {
    currentStepNum,
    totalSteps,
    title: steps[activeIdx].title,
    stepText: `${formattedCurrent} / ${formattedTotal}`,
  };
}

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profile, setProfile] = useState({
    displayName: "",
    personalWorkspaceName: "Personal Workspace",
    timezone: "Asia/Kolkata",
    batchNumber: "",
    language: "English",
    dateFormat: "DD MMM YYYY",
    timeFormat: "12-hour",
  });
  const [profileStep, setProfileStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [orgBatchId, setOrgBatchId] = useState("");
  const [verifiedRole, setVerifiedRole] = useState(startingRole || "MEMBER");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoveryCodeInput, setRecoveryCodeInput] = useState("");
  const [recoverySavedConfirmed, setRecoverySavedConfirmed] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState("");
  const [recoveryCopySuccess, setRecoveryCopySuccess] = useState(false);
  const [recoveryShareNotice, setRecoveryShareNotice] = useState<string | null>(null);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2 | 3>(1);
  const [workspaceId, setWorkspaceId] = useState("");
  const [orgLogo, setOrgLogo] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [orgLoadingStep, setOrgLoadingStep] = useState(0);
  const [userRole, setUserRole] = useState(startingRole);
  const [loadingStep, setLoadingStep] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [remainingResends, setRemainingResends] = useState(3);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendLimitReached, setResendLimitReached] = useState(false);
  const [resendToast, setResendToast] = useState<string | null>(null);
  const [nextResendAt, setNextResendAt] = useState<string | null>(null);
  const [tzOpen, setTzOpen] = useState(false);
  const [tzSearch, setTzSearch] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [orgStep, setOrgStep] = useState(1);
  const [selectedHubs, setSelectedHubs] = useState<string[]>(["hub-1", "hub-2"]);

  const toggleHub = (hubId: string) => {
    setSelectedHubs(prev => {
      if (prev.includes(hubId)) {
        if (prev.length === 1) return prev; // keep at least 1 selected
        return prev.filter(id => id !== hubId);
      } else {
        return [...prev, hubId];
      }
    });
  };

  const getInitials = (name?: string) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return "•";
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const [setupRedirectCountdown, setSetupRedirectCountdown] = useState(3);
  const setupRedirectGuardRef = useRef(false);

  const handleReturnToLogin = () => {
    if (setupRedirectGuardRef.current && state !== "SETUP_COMPLETE") return;
    setupRedirectGuardRef.current = true;
    setTempToken("");
    setPassword("");
    setError("");
    setState("EMAIL_ENTRY");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("auth_step");
      url.searchParams.delete("token");
      url.searchParams.set("activated", "true");
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  };

  useEffect(() => {
    if (state !== "SETUP_COMPLETE") {
      setSetupRedirectCountdown(3);
      setupRedirectGuardRef.current = false;
      return;
    }

    if (setupRedirectCountdown <= 0) {
      handleReturnToLogin();
      return;
    }

    const timer = setTimeout(() => {
      setSetupRedirectCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [state, setupRedirectCountdown]);
  
  const [isGoogleAllowed, setIsGoogleAllowed] = useState(true);
  const [googleSubtext, setGoogleSubtext] = useState<string | undefined>(undefined);

  // Server-authoritative OTP Status Hydration
  useEffect(() => {
    if (state === "OTP_VERIFICATION" && email) {
      let isMounted = true;
      apiClient.get(`/auth/otp-status?email=${encodeURIComponent(email)}`)
        .then((res) => {
          if (!isMounted || !res.data?.success) return;
          const { resendCount: count, remainingResends: rem, cooldownSeconds, nextResendAt: nextAt } = res.data;
          setResendCount(count ?? 0);
          setRemainingResends(rem ?? Math.max(0, 3 - (count ?? 0)));
          setResendLimitReached((count ?? 0) >= 3);
          setNextResendAt(nextAt || null);

          if (nextAt) {
            const remSec = Math.max(0, Math.ceil((new Date(nextAt).getTime() - Date.now()) / 1000));
            setCountdown(remSec);
          } else if (cooldownSeconds !== undefined) {
            setCountdown(cooldownSeconds);
          }
        })
        .catch(() => {});
      return () => { isMounted = false; };
    }
  }, [state, email]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (state === "OTP_VERIFICATION" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [state, countdown]);

  useEffect(() => {
    // Only check Google availability on primary login screens, never while typing in Forgot Password
    if (state !== "EMAIL_ENTRY" && state !== "PASSWORD") {
      return;
    }

    if (!email || !email.includes("@") || !email.includes(".")) {
      setIsGoogleAllowed(true);
      setGoogleSubtext(undefined);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/auth/check-google-availability?email=${encodeURIComponent(email)}`);
        if (res.data?.allowed === false) {
          setIsGoogleAllowed(false);
          setGoogleSubtext("Google login available after first login");
        } else {
          setIsGoogleAllowed(true);
          setGoogleSubtext(undefined);
        }
      } catch (err) {
        setIsGoogleAllowed(true);
        setGoogleSubtext(undefined);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [email, state]);

  useEffect(() => {
    if (authData?.email) {
      setEmail((prev) => prev || authData.email || "");
    }
    if (authData?.error) {
      if (authData.error === "google_cancelled") {
        setError("Google sign-in was cancelled.");
      } else if (authData.error === "first_login_required") {
        setError("Complete your first login with email and password. Google sign-in will be available afterward.");
      } else if (authData.error === "account_not_found") {
        setState("ACCOUNT_NOT_FOUND");
        setError("");
      } else if (authData.error === "google_failed") {
        setError("Unable to sign in with Google. Please try again.");
      } else {
        setError(authData.error);
      }
    }
  }, [authData]);

  useEffect(() => {
    setAuthState(state);
    setAuthData({ step: state, token: tempToken, role: userRole });
  }, [state, tempToken, userRole, setAuthState, setAuthData]);

  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const handleLogoFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => setOrgLogo(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    try {
      let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz === 'Asia/Calcutta') tz = 'Asia/Kolkata';
      const lang = navigator.language.startsWith('en') ? 'English' : navigator.language;
      if (tz || lang) setProfile(prev => ({ ...prev, timezone: tz || prev.timezone, language: lang }));
    } catch(e) {}
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (state === "OTP_VERIFICATION" && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [state, countdown]);

  useEffect(() => {
    if (state === "OTP_VERIFICATION") {
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state]);

  useEffect(() => {
    if (state !== "EMAIL_ENTRY") {
      setIsDirty(true);
    } else {
      setIsDirty(false);
    }
  }, [state, setIsDirty]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pasted = value.replace(/[^0-9]/g, "").slice(0, 6);
      setOtp(pasted);
      otpAutoSubmitRef.current = false; // reset guard on paste
      if (pasted.length === 6) {
        inputRefs.current[5]?.focus();
      } else {
        inputRefs.current[pasted.length]?.focus();
      }
      return;
    }
    
    // Allow only numbers
    if (value && !/^\d+$/.test(value)) return;

    let current = otp.split("");
    current[index] = value;
    const newOtp = current.join("");
    setOtp(newOtp);
    // Reset the auto-submit guard whenever the user changes the OTP
    if (newOtp.length < 6) {
      otpAutoSubmitRef.current = false;
    }

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp.split("")[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      
      let current = otp.split("");
      current[index - 1] = "";
      setOtp(current.join(""));
    }
  };

  const handleError = (err: any) => {
    const errCode = err?.response?.data?.code;
    const errStatus = err?.response?.status;
    const errMsg = err?.response?.data?.error || err?.response?.data?.details || err?.message;

    if (errCode === "INVALID_EMAIL") {
      setError("Enter a valid email address.");
      setLoading(false);
      return;
    }
    if (
      errCode === "INVALID_CREDENTIALS" ||
      errCode === "ACCOUNT_NOT_FOUND" ||
      errCode === "INVALID_PASSWORD" ||
      errStatus === 401 ||
      errStatus === 404
    ) {
      setPassword(""); // Clear password field, keeping email populated
      setError(
        err?.response?.data?.details ||
          "Invalid email or password. Please check your credentials and try again."
      );
      setLoading(false);
      return;
    }
    if (errCode === "ACCOUNT_SUSPENDED" || errStatus === 403) {
      setError("Your ManMadhan Progress account has been suspended.");
      setLoading(false);
      return;
    }
    if (errCode === "ACCOUNT_DELETED") {
      setError("This account is no longer available.");
      setLoading(false);
      return;
    }
    if (errCode === "ACCOUNT_PENDING_SETUP") {
      setError("Your organization invitation is waiting for you. Complete your account setup.");
      setLoading(false);
      return;
    }

    setError(errMsg || "An unknown error occurred.");
    setLoading(false);
  };

  // EMAIL_ENTRY form logic is now combined with handlePasswordSubmit

  const verifyOtp = async (code: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.post("/auth/verify-otp", { email, otp: code });
      
      if (res.data.accessToken) {
        localStorage.setItem("auth_token", res.data.accessToken);
        localStorage.setItem("token", res.data.accessToken);
        syncTokenCookie(res.data.accessToken);
      }

      if (res.data.nextStep === "DASHBOARD") {
        onComplete?.();
        close(true);
        await checkSession();
        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const redirectParam = urlParams.get('redirect');
          const targetPath = redirectParam || getDashboardPathForRole(res.data.role);
          router.replace(targetPath);
        }
      } else {
        setTempToken(res.data.tempToken);
        setState(res.data.nextStep as AuthState);
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyOtp(otp);
  };

  const handleResend = async () => {
    if (resendLoading || countdown > 0 || resendCount >= 3 || !email) return;
    setResendLoading(true);
    setError("");
    setResendToast(null);
    try {
      const purpose = state === "FORGOT_PASSWORD" ? "reset_password" : "login";
      const res = await apiClient.post("/auth/resend-otp", { email, purpose });

      if (res.data?.success) {
        setOtp("");
        otpAutoSubmitRef.current = false;
        inputRefs.current[0]?.focus();

        const newResendCount = res.data.resendCount ?? (resendCount + 1);
        const newRemaining = res.data.remainingResends ?? Math.max(0, 3 - newResendCount);
        const newCooldown = res.data.cooldownSeconds ?? 60;

        setResendCount(newResendCount);
        setRemainingResends(newRemaining);
        setCountdown(newCooldown);
        setNextResendAt(res.data.nextResendAt || null);
        setResendLimitReached(newResendCount >= 3);

        setResendToast("✓ New verification code sent");
        setTimeout(() => setResendToast(null), 3500);
      }
    } catch (err: any) {
      const errData = err?.response?.data;
      const isLimit = errData?.error === "RESEND_LIMIT_REACHED" || err?.response?.status === 429;
      if (isLimit) {
        setResendCount(3);
        setRemainingResends(0);
        setResendLimitReached(true);
        setError(errData?.message || "You've reached the maximum number of verification codes.");
      } else {
        setError(errData?.message || "Unable to send a new code. Please try again.");
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleRestartVerification = () => {
    setOtp("");
    otpAutoSubmitRef.current = false;
    setError("");
    setResendCount(0);
    setRemainingResends(3);
    setResendLimitReached(false);
    setCountdown(0);
    setState("EMAIL_ENTRY");
  };

  useEffect(() => {
    if (state === "OTP_VERIFICATION" && otp.length === 6 && !loading && !otpAutoSubmitRef.current) {
      otpAutoSubmitRef.current = true; // mark as attempted — prevents infinite retry on error
      verifyOtp(otp);
    }
  }, [otp, state, loading]);

  const [resetSentCountdown, setResetSentCountdown] = useState(3);

  useEffect(() => {
    setPassword("");
    setConfirmPassword("");
    setOtp("");
    setError("");
    otpAutoSubmitRef.current = false; // reset auto-submit guard on state transition
  }, [state]);

  useEffect(() => {
    if (state !== "RESET_SENT") {
      setResetSentCountdown(5);
      return;
    }

    setResetSentCountdown(5);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("authData");
    }

    const interval = setInterval(() => {
      setResetSentCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setState("EMAIL_ENTRY");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state]);

  useEffect(() => {
    if (state === "RECOVERY_CODES" && recoveryCodes.length === 0) {
      apiClient
        .post(
          "/auth/setup/recovery-codes",
          {},
          { headers: tempToken ? { Authorization: `Bearer ${tempToken}` } : {} }
        )
        .then((res) => {
          if (res.data?.success && Array.isArray(res.data.recoveryCodes)) {
            setRecoveryCodes(res.data.recoveryCodes);
          }
        })
        .catch((err) => {
          handleError(err);
        });
    }
  }, [state, tempToken]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Inline Email Format Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (state === "PASSWORD_CREATION" || state === "PASSWORD" || state === "PASSWORD_CHANGE_REQUIRED") {
        const res = await apiClient.post("/auth/setup/password", { password }, {
          headers: tempToken ? { Authorization: `Bearer ${tempToken}` } : {}
        });
        if (res.data?.success) {
          setLoading(false);
          if (res.data.tempToken) setTempToken(res.data.tempToken);
          setState((res.data.nextStep as AuthState) || "PROFILE_SETUP");
          setProfileStep(1);
        } else {
          handleError({ response: { data: res.data } });
        }
      } else {
        // Normal password login flow
        const res = await apiClient.post("/auth/login/password", { email: email.trim().toLowerCase(), password });
        if (res.data.success) {
          if (res.data.nextStep === "PASSWORD_CREATION" || res.data.nextStep === "PASSWORD_CHANGE_REQUIRED") {
            if (res.data.tempToken) setTempToken(res.data.tempToken);
            setState("PASSWORD_CREATION");
            setLoading(false);
            return;
          }

          if (res.data.user) {
            setSessionUser(res.data.user, res.data.accessToken, res.data.refreshToken, res.data.workspaceId);
          } else {
            if (res.data.accessToken) {
              localStorage.setItem("auth_token", res.data.accessToken);
              localStorage.setItem("token", res.data.accessToken);
              syncTokenCookie(res.data.accessToken);
            }
            if (res.data.refreshToken) {
              localStorage.setItem("refresh_token", res.data.refreshToken);
              localStorage.setItem("refreshToken", res.data.refreshToken);
            }
          }
          onComplete?.();
          close(true);
          
          if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search);
            const redirectParam = urlParams.get('redirect') || authData?.redirect;
            const targetPath = (redirectParam && redirectParam.startsWith('/')) ? redirectParam : getDashboardPathForRole(res.data.role || res.data.user?.role);
            router.replace(targetPath);
          }
        }
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryStep === 1) {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError("Enter a valid email address.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        await apiClient.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
        setRecoveryStep(2);
      } catch (err: any) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    } else if (recoveryStep === 2) {
      if (!recoveryCodeInput.trim()) {
        setError("Enter your 8-character account recovery code.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const res = await apiClient.post("/auth/recover-account", {
          email: email.trim().toLowerCase(),
          recoveryCode: recoveryCodeInput.trim().toUpperCase(),
        });
        if (res.data.success && res.data.recoveryToken) {
          setRecoveryToken(res.data.recoveryToken);
          setRecoveryStep(3);
        } else {
          setError(res.data.error || "Invalid recovery code.");
        }
      } catch (err: any) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    } else if (recoveryStep === 3) {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const res = await apiClient.post("/auth/reset-password-with-recovery", {
          recoveryToken,
          newPassword: password,
        });
        if (res.data.success) {
          setLoadingState("SUCCESS");
        } else {
          setError(res.data.error || "Failed to reset password.");
        }
      } catch (err: any) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Hit the Next.js API route to attach the HttpOnly reset cookie
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to reset password");
      }
      
      // Successfully reset, take them back to login
      setState("EMAIL_ENTRY");
      setPassword("");
      setConfirmPassword("");
      
      // Clean the URL of reset tokens to avoid re-triggering
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("auth_step");
        url.searchParams.delete("token");
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      }
      // Optionally show a toast here if we had a toaster
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.post("/auth/setup/profile", profile, {
        headers: { Authorization: `Bearer ${tempToken}` }
      });
      if (res.data.nextStep === "DASHBOARD") {
        setUserRole(res.data.role);
        setState("SUCCESS");
        onComplete?.();
        close(true);
        await checkSession();
        const targetPath = getDashboardPathForRole(res.data.role);
        router.replace(targetPath);
      } else {
        setTempToken(res.data.tempToken);
        setState(res.data.nextStep as AuthState);
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanBatchId = orgBatchId.trim().toUpperCase();
    if (cleanBatchId) {
      const batchRegex = /^[A-Z]{2}[0-9]{4}$/;
      if (!batchRegex.test(cleanBatchId)) {
        setError("Organization Batch ID must be 2 uppercase letters followed by 4 digits (e.g. MM1107).");
        return;
      }
    }

    setLoading(true);
    setOrgLoadingStep(1); // Uploading Logo...
    setError("");

    try {
      if (orgLogo && typeof window !== "undefined") {
        localStorage.setItem("orgLogo", orgLogo);
        window.dispatchEvent(new Event("orgLogoUpdated"));
      }

      // Simulate sequential loading for premium UX
      await new Promise(resolve => setTimeout(resolve, 500));
      setOrgLoadingStep(2); // Creating Organization...
      const res = await apiClient.post("/auth/setup/organization", { 
        organizationName: orgName, 
        batchNumber: cleanBatchId,
        workspaceId, 
        communityName: selectedHubs.includes("hub-1") ? "ManMadhan Hub - 1" : "ManMadhan Hub - 2",
        selectedHubs,
        orgLogo 
      }, {
        headers: { Authorization: `Bearer ${tempToken}` }
      });
      
      setOrgLoadingStep(3); // Configuring Workspace...
      await new Promise(resolve => setTimeout(resolve, 400));
      setOrgLoadingStep(4); // Applying Security...
      await new Promise(resolve => setTimeout(resolve, 400));
      setOrgLoadingStep(5); // Preparing Dashboard...
      await new Promise(resolve => setTimeout(resolve, 500));
      setOrgLoadingStep(6); // Organization Ready!
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (res.data.success) {
        if (orgLogo && typeof window !== "undefined") {
          localStorage.setItem("orgLogo", orgLogo);
          window.dispatchEvent(new Event("orgLogoUpdated"));
        }
        setTempToken(res.data.tempToken);
        setState((res.data.nextStep as AuthState) || "REVIEW_SETUP");
      } else {
        handleError({ response: { data: res.data } });
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
      setOrgLoadingStep(0);
    }
  };

  // Auto-generate Workspace ID from Org Name
  useEffect(() => {
    if (orgName) {
      setWorkspaceId(orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    } else {
      setWorkspaceId("");
    }
  }, [orgName]);

  useEffect(() => {
    if (state === "SUCCESS") {
      setIsDirty(false); // Clean state once successful
      onComplete?.();
      close(true);
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const redirectParam = urlParams.get('redirect');
        const targetPath = redirectParam || getDashboardPathForRole(userRole);
        router.replace(targetPath);
      }
    }
  }, [state, userRole, onComplete]);

  const hClass = "h-[50px] rounded-xl";
  const spaceClass = isMobile ? "space-y-3" : "space-y-4";
  const labelClass = isMobile ? "text-xs" : "text-[13px]";

  return (
    <div className={`w-full relative z-10 flex flex-col items-center ${isMobile ? "" : ""}`}>
      
      {/* Mobile Contextual Auth Heading Area */}
      {isMobile && (state === "EMAIL_ENTRY" || state === "RESET_PASSWORD" || state === "RESET_SENT") && (
        <div className="w-full max-w-[440px] text-left mx-auto mb-6 space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground dark:text-[#F5F7FA]">
            {state === "EMAIL_ENTRY" 
              ? "Welcome back." 
              : state === "RESET_PASSWORD" 
              ? "Create a new password." 
              : state === "RESET_SENT" 
              ? "Check your inbox." 
              : "Welcome back."}
          </h2>
          <p className="text-sm text-muted-foreground dark:text-[#8E949E] leading-relaxed">
            {state === "EMAIL_ENTRY" ? (
              "Sign in to continue your progress."
            ) : state === "RESET_PASSWORD" ? (
              "Choose a strong password to secure your account."
            ) : state === "RESET_SENT" ? (
              `We've sent a verification link to ${email || "your email address"}.`
            ) : (
              "Sign in to continue your progress."
            )}
          </p>
        </div>
      )}

      {/* Dynamic Header Section for sub-steps (Reset Password, Reset Sent) */}
      {!isMobile && (state === "RESET_PASSWORD" || state === "RESET_SENT") && (
        <div className="mb-5 text-center space-y-1 flex flex-col items-center max-w-[440px] mx-auto">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-muted-foreground dark:text-[#626A75] mb-0.5">
            ACCOUNT RECOVERY
          </p>
          <h2 className="text-xl font-bold tracking-tight text-foreground dark:text-[#F5F7FA]">
            {state === "RESET_PASSWORD" 
              ? "Secure Password Reset" 
              : "Check your inbox"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground dark:text-[#8E949E]">
            {state === "RESET_PASSWORD" ? (
              "Please establish a new secure master password below."
            ) : state === "RESET_SENT" ? (
              "Check your email for reset instructions."
            ) : (
              "Create a strong password for your new workspace account."
            )}
          </p>
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="w-full max-w-[440px] mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-2xl text-center shadow-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[440px] relative pb-4">
        <AnimatePresence mode="wait" initial={false}>
          
          {state === "EMAIL_ENTRY" && (
            <motion.form key="email" {...fadeSlideProps} onSubmit={handlePasswordSubmit} className="w-full flex flex-col" autoComplete="off">
              <input
                type="hidden"
                value="something_to_defeat_chrome_autofill"
              />
              
              {/* 1. Full-Width Google Social Login Button (20px bottom gap) */}
              <div className="w-full mb-[20px]">
                <GoogleButton
                  isMobile={isMobile}
                  disabled={loadingState !== "" || !isGoogleAllowed}
                  subtext={googleSubtext}
                  onClick={() => {
                    if (!isGoogleAllowed) {
                      setError("Complete your first login with email and password. Google sign-in will be available afterward.");
                      return;
                    }
                    const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
                    const googleAuthUrl = apiBase.endsWith("/api/v1")
                      ? `${apiBase}/auth/google`
                      : `${apiBase}/api/v1/auth/google`;
                    window.location.href = googleAuthUrl;
                  }}
                />
              </div>
              
              {/* 2. Refined Divider (24px bottom gap) */}
              <div className="flex items-center mb-[24px]">
                <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-[#29313B]"></div>
                <span className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B7280] dark:text-[#747D8B]">
                  OR CONTINUE WITH EMAIL
                </span>
                <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-[#29313B]"></div>
              </div>

              {/* 3. Input Fields (14px spacing, 56px height, 14px radius, theme-aware surface) */}
              <div className="space-y-[14px]">
                <div className="relative group">
                  <input
                    type="email"
                    required
                    disabled={loadingState !== ""}
                    placeholder="Work email"
                    enterKeyHint="next"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full h-[56px] rounded-[14px] bg-[#FFFFFF] dark:bg-[#151A22] border border-[#D9DDE3] dark:border-[#29313B] px-4 text-sm text-[#171A1F] dark:text-[#F5F7FA] placeholder:text-[#9CA3AF] dark:placeholder:text-[#7F8896] outline-none focus:outline-none focus:ring-0 focus:border-[#B99625] dark:focus:border-[#DDB52F] transition-all duration-200 shadow-xs peer disabled:bg-[#F3F4F6] dark:disabled:bg-[#10141A] disabled:border-[#E5E7EB] dark:disabled:border-[#222831] disabled:text-[#9CA3AF] dark:disabled:text-[#606977] disabled:cursor-not-allowed"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="off"
                    name="email-auth-field"
                  />
                </div>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={loadingState !== ""}
                    placeholder="Password"
                    enterKeyHint="go"
                    className="w-full h-[56px] rounded-[14px] bg-[#FFFFFF] dark:bg-[#151A22] border border-[#D9DDE3] dark:border-[#29313B] px-4 pr-12 text-sm text-[#171A1F] dark:text-[#F5F7FA] placeholder:text-[#9CA3AF] dark:placeholder:text-[#7F8896] outline-none focus:outline-none focus:ring-0 focus:border-[#B99625] dark:focus:border-[#DDB52F] transition-all duration-200 shadow-xs peer disabled:bg-[#F3F4F6] dark:disabled:bg-[#10141A] disabled:border-[#E5E7EB] dark:disabled:border-[#222831] disabled:text-[#9CA3AF] dark:disabled:text-[#606977] disabled:cursor-not-allowed"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    name="password-auth-field"
                  />
                  <button
                    type="button"
                    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#69717D] dark:text-[#7F8896] hover:text-[#B99625] dark:hover:text-[#DDB52F] active:text-[#B99625] dark:active:text-[#DDB52F] cursor-pointer rounded-md p-1 outline-none select-none flex items-center justify-center transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-[#B99625] dark:text-[#DDB52F]" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 4. Forgot Password (10px top gap, 20px bottom gap) */}
              <div className="flex justify-end pt-[10px] mb-[20px] px-0.5">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setState("FORGOT_PASSWORD")}
                  className="text-xs font-semibold text-[#69717D] dark:text-[#8D96A5] hover:text-[#B99625] dark:hover:text-[#DDB52F] active:text-[#A68520] dark:active:text-[#E8C54A] transition-colors hover:underline decoration-[#D9DDE3] dark:decoration-[#29313B] underline-offset-4 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* 5. Primary Sign In Button */}
              <motion.button
                onPointerDown={(e) => e.stopPropagation()}
                whileHover={loading ? {} : { scale: 1.005 }}
                whileTap={loading ? {} : { scale: 0.99 }}
                disabled={loading}
                className="w-full h-[56px] rounded-[14px] bg-[#B99625] dark:bg-[#DDB52F] hover:bg-[#A68520] dark:hover:bg-[#E8C54A] active:bg-[#96791E] dark:active:bg-[#C9A224] text-[#FFFFFF] dark:text-[#080A0D] font-semibold text-sm flex items-center justify-center transition-all duration-200 disabled:bg-[#E5E1D2] dark:disabled:bg-[#10141A] disabled:border disabled:border-[#D9DDE3] dark:disabled:border-[#222831] disabled:text-[#92908A] dark:disabled:text-[#666D78] disabled:cursor-not-allowed shadow-sm group cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2 text-current" />
                    <span>Signing in...</span>
                  </>
                ) : loadingState === "SENT" ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2 text-current" />
                    <span>Code sent successfully</span>
                  </>
                ) : (
                  <>
                    <span className="mr-2">Sign In</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-current" />
                  </>
                )}
              </motion.button>
            </motion.form>
          )}

          {state === "ACCOUNT_NOT_FOUND" && (
            <motion.div
              key="account_not_found"
              {...fadeSlideProps}
              className="w-full max-w-[440px] sm:max-w-[480px] mx-auto text-left flex flex-col justify-between py-2 space-y-5"
            >
              <div className="space-y-4">
                {/* Quiet Step Header */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-[#7F8896] uppercase pb-1">
                    <span>ACCOUNT</span>
                  </div>
                  <div className="w-full h-[1px] bg-[#20262F]" />
                </div>

                {/* Heading & Subtitle */}
                <div className="space-y-1">
                  <h3 className="text-2xl sm:text-[28px] font-semibold text-[#F5F7FA] tracking-tight leading-tight">
                    Account not found
                  </h3>
                  <p className="text-xs sm:text-sm text-[#9AA2AF] leading-relaxed">
                    We couldn't find an authorized account for this email.
                  </p>
                </div>

                {/* Masked Email Badge / Status Card */}
                <div className="p-3.5 rounded-xl bg-[#151A22] border border-[#29313B] flex items-center justify-between shadow-xs">
                  <span className="text-xs font-mono font-semibold text-[#F5F7FA] truncate mr-2">{obfuscatedEmail || email}</span>
                  <span className="px-2 py-0.5 rounded bg-[#202731] border border-[#29313B] text-[10px] font-mono font-semibold text-[#8F98A5] uppercase shrink-0">UNREGISTERED</span>
                </div>

                <p className="text-xs text-[#9AA2AF]">
                  This account isn't ready for ManMadhan Progress yet.
                </p>
              </div>

              {/* Actions Grid: LEFT = ← Back to sign in (Secondary), RIGHT = Try another account → (Primary) */}
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPassword("");
                    setError("");
                    setState("EMAIL_ENTRY");
                    if (typeof window !== "undefined") {
                      const url = new URL(window.location.href);
                      url.searchParams.delete("auth_step");
                      url.searchParams.delete("token");
                      url.searchParams.delete("error");
                      window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
                    }
                  }}
                  className="w-full h-[56px] rounded-[14px] bg-[#151A22] border border-[#29313B] text-[#9AA2AF] hover:bg-[#1B212A] hover:border-[#3A4350] hover:text-[#F5F7FA] font-semibold text-xs sm:text-sm flex items-center justify-center transition-all cursor-pointer group"
                >
                  <ArrowLeft className="mr-2 w-4 h-4 text-current transition-transform group-hover:-translate-x-1" />
                  Back to sign in
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail("");
                    setPassword("");
                    setError("");
                    setState("EMAIL_ENTRY");
                    if (typeof window !== "undefined") {
                      const url = new URL(window.location.href);
                      url.searchParams.delete("auth_step");
                      url.searchParams.delete("token");
                      url.searchParams.delete("error");
                      window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
                    }
                  }}
                  className="w-full h-[56px] rounded-[14px] bg-[#DDB52F] hover:bg-[#E8C54A] active:bg-[#C9A224] text-[#080A0D] font-bold text-xs sm:text-sm flex items-center justify-center transition-all shadow-sm cursor-pointer group"
                >
                  Try another account
                  <ArrowRight className="ml-2 w-4 h-4 text-[#080A0D] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {(state === "PASSWORD" || state === "PASSWORD_CREATION" || state === "PASSWORD_CHANGE_REQUIRED") && (
            <motion.form
              key="password-setup"
              onSubmit={handlePasswordSubmit}
              className="w-full max-w-[440px] sm:max-w-[520px] mx-auto relative text-left flex flex-col justify-between space-y-3 sm:space-y-4"
            >
              <div className="space-y-2.5 sm:space-y-3">
                {/* Step Indicator */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-muted-foreground dark:text-[#737B88] uppercase mb-1">
                    <span>CHANGE PASSWORD</span>
                    <span>{getOnboardingStepInfo(state, userRole)?.stepText || "01 / 05"}</span>
                  </div>
                  <div className="w-full h-[1px] bg-border dark:bg-[#20262F]" />
                </div>

                {/* Heading */}
                <div className="space-y-0.5 pt-0.5">
                  <h3 className="text-xl sm:text-2xl font-semibold text-foreground dark:text-[#F5F7FA] tracking-tight leading-tight">
                    Create your new password
                  </h3>
                  <p className="text-xs text-muted-foreground dark:text-[#9AA2AF] leading-relaxed">
                    Choose a strong new master password to secure your account.
                  </p>
                </div>

                {/* Form Controls */}
                <div className="space-y-2.5 pt-0.5">
                  {/* New password */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground dark:text-[#F5F7FA] block">New password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Enter new password"
                        className="w-full h-[48px] sm:h-[52px] rounded-[14px] bg-background dark:bg-[#151A22] border border-border dark:border-[#29313B] focus:border-[#DDB52F] px-4 pr-12 text-xs sm:text-sm font-medium text-foreground dark:text-[#F5F7FA] placeholder:text-muted-foreground dark:placeholder:text-[#737B88] outline-none transition-all shadow-xs"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        name="new-password-setup"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-[#737B88] hover:text-foreground dark:hover:text-[#F5F7FA] cursor-pointer p-1"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 text-[#DDB52F]" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-1 pt-0.5">
                    <label className="text-xs font-medium text-foreground dark:text-[#F5F7FA] block">Confirm password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Confirm your new password"
                        className="w-full h-[48px] sm:h-[52px] rounded-[14px] bg-background dark:bg-[#151A22] border border-border dark:border-[#29313B] focus:border-[#DDB52F] px-4 pr-12 text-xs sm:text-sm font-medium text-foreground dark:text-[#F5F7FA] placeholder:text-muted-foreground dark:placeholder:text-[#737B88] outline-none transition-all shadow-xs"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        name="confirm-password-setup"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-[#737B88] hover:text-foreground dark:hover:text-[#F5F7FA] cursor-pointer p-1"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 text-[#DDB52F]" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Compact 2-Column Password Requirements */}
                  <div className="pt-1.5 space-y-1">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground dark:text-[#737B88] font-semibold">
                      Password requirements
                    </p>
                    <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs">
                      <div className={`flex items-center gap-1.5 ${password.length >= 8 ? "text-[#39D393] font-semibold" : "text-muted-foreground dark:text-[#737B88]"}`}>
                        <span>{password.length >= 8 ? "✓" : "○"}</span>
                        <span>8+ characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(password) ? "text-[#39D393] font-semibold" : "text-muted-foreground dark:text-[#737B88]"}`}>
                        <span>{/[A-Z]/.test(password) ? "✓" : "○"}</span>
                        <span>Uppercase</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${/[a-z]/.test(password) ? "text-[#39D393] font-semibold" : "text-muted-foreground dark:text-[#737B88]"}`}>
                        <span>{/[a-z]/.test(password) ? "✓" : "○"}</span>
                        <span>Lowercase</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${/[0-9]/.test(password) ? "text-[#39D393] font-semibold" : "text-muted-foreground dark:text-[#737B88]"}`}>
                        <span>{/[0-9]/.test(password) ? "✓" : "○"}</span>
                        <span>Number</span>
                      </div>
                      <div className={`flex items-center gap-1.5 col-span-2 ${/[^A-Za-z0-9]/.test(password) ? "text-[#39D393] font-semibold" : "text-muted-foreground dark:text-[#737B88]"}`}>
                        <span>{/[^A-Za-z0-9]/.test(password) ? "✓" : "○"}</span>
                        <span>Special character</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Grid: LEFT = ← Back (Resets to EMAIL_ENTRY), RIGHT = Continue → (Primary Gold) */}
              <div className="pt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPassword("");
                    setConfirmPassword("");
                    setOtp("");
                    setCountdown(0);
                    setError("");
                    setState("EMAIL_ENTRY");
                    if (typeof window !== "undefined") {
                      const url = new URL(window.location.href);
                      url.searchParams.delete("auth_step");
                      url.searchParams.delete("token");
                      url.searchParams.delete("error");
                      window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
                    }
                  }}
                  className="w-full h-[52px] sm:h-[56px] rounded-[14px] bg-muted/40 dark:bg-[#151A22] border border-border dark:border-[#29313B] text-muted-foreground dark:text-[#9AA2AF] hover:bg-muted dark:hover:bg-[#1B212A] hover:text-foreground dark:hover:text-[#F5F7FA] font-semibold text-xs sm:text-sm flex items-center justify-center transition-all cursor-pointer group"
                >
                  <ArrowLeft className="mr-1.5 sm:mr-2 w-4 h-4 text-current transition-transform group-hover:-translate-x-1" />
                  Back
                </button>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !password ||
                    password !== confirmPassword ||
                    password.length < 8 ||
                    !/[A-Z]/.test(password) ||
                    !/[a-z]/.test(password) ||
                    !/[0-9]/.test(password) ||
                    !/[^A-Za-z0-9]/.test(password)
                  }
                  className="w-full h-[52px] sm:h-[56px] rounded-[14px] bg-[#DDB52F] hover:bg-[#E8C54A] active:bg-[#C9A224] text-[#080A0D] font-bold text-xs sm:text-sm flex items-center justify-center transition-all disabled:opacity-40 shadow-sm cursor-pointer group"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full bg-[#080A0D] animate-pulse" />
                      Saving...
                    </span>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-1.5 sm:ml-2 w-4 h-4 text-[#080A0D] group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          )}

          {state === "FORGOT_PASSWORD" && (
            <motion.form
              key="forgot-password"
              {...fadeSlideProps}
              onSubmit={handleForgotPasswordSubmit}
              className="w-full max-w-[420px] mx-auto text-center space-y-4"
            >
              {loadingState === "SUCCESS" ? (
                <div className="space-y-5 py-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-[0_8px_24px_rgba(16,185,129,0.15)]">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 stroke-[2.5]" />
                  </div>
                  <div className="space-y-1.5 text-center">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                      PASSWORD UPDATED
                    </p>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground dark:text-[#F5F7FA]">
                      Password reset complete
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground dark:text-[#8E949E] leading-relaxed pt-1 max-w-xs mx-auto">
                      Your password has been updated successfully. For your security, please sign in with your new password.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLoadingState("");
                      setRecoveryStep(1);
                      setState("EMAIL_ENTRY");
                    }}
                    className="w-full h-[52px] rounded-[14px] bg-[#DDB52F] hover:bg-[#E8C54A] text-[#080A0D] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Return to Sign In</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Step Indicator Header */}
                  <div className="space-y-1 text-center mb-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#DDB52F]/15 border border-[#DDB52F]/30 text-[10px] font-mono font-bold text-[#DDB52F] uppercase mb-1">
                      <KeyRound className="w-3 h-3" />
                      <span>ACCOUNT RECOVERY</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground dark:text-[#F5F7FA]">
                      {recoveryStep === 1
                        ? "Recover your account"
                        : recoveryStep === 2
                        ? "Enter recovery code"
                        : "Set new password"}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground dark:text-[#8E949E] leading-relaxed max-w-xs mx-auto">
                      {recoveryStep === 1
                        ? "Enter your account email to begin non-email password recovery."
                        : recoveryStep === 2
                        ? "Enter one of your 8-character one-time recovery codes."
                        : "Set a strong new password for your account."}
                    </p>
                  </div>

                  {/* Step 1: Email Input */}
                  {recoveryStep === 1 && (
                    <div className="space-y-3">
                      <div className="w-full text-left">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground dark:text-[#737B88] font-semibold block mb-1">
                          ACCOUNT EMAIL
                        </label>
                        <input
                          id="recovery-email-input"
                          type="email"
                          required
                          disabled={loading}
                          placeholder="name@company.com"
                          className="w-full h-[52px] rounded-[14px] bg-background dark:bg-[#161B26] border border-border dark:border-[#252B35] px-4 text-sm text-foreground dark:text-[#F5F7FA] placeholder:text-muted-foreground dark:placeholder:text-[#626A75] outline-none focus:border-[#DDB52F] transition-all"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoComplete="email"
                        />
                      </div>
                      <div className="p-3 rounded-xl bg-muted/40 dark:bg-[#11161D] border border-border dark:border-[#29313B] text-left">
                        <p className="text-[11px] text-muted-foreground dark:text-[#9AA2AF] leading-normal">
                          No email delivery required. Password recovery is authorized directly via your secure one-time Recovery Codes.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Recovery Code Input */}
                  {recoveryStep === 2 && (
                    <div className="space-y-3">
                      <div className="w-full text-left">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground dark:text-[#737B88] font-semibold block mb-1">
                          ONE-TIME RECOVERY CODE
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={9}
                          disabled={loading}
                          placeholder="XXXX-XXXX"
                          className="w-full h-[52px] rounded-[14px] bg-background dark:bg-[#161B26] border border-border dark:border-[#252B35] px-4 text-center font-mono text-base font-bold text-[#DDB52F] placeholder:text-muted-foreground dark:placeholder:text-[#626A75] uppercase outline-none focus:border-[#DDB52F] transition-all tracking-widest"
                          value={recoveryCodeInput}
                          onChange={(e) => setRecoveryCodeInput(e.target.value.toUpperCase())}
                        />
                        <p className="text-[11px] text-muted-foreground dark:text-[#737B88] mt-1">
                          Enter any 8-character recovery code generated during onboarding.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 3: New Password Inputs */}
                  {recoveryStep === 3 && (
                    <div className="space-y-3 text-left">
                      <div>
                        <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground dark:text-[#737B88] font-semibold block mb-1">
                          NEW PASSWORD
                        </label>
                        <input
                          type="password"
                          required
                          disabled={loading}
                          placeholder="••••••••"
                          className="w-full h-[52px] rounded-[14px] bg-background dark:bg-[#161B26] border border-border dark:border-[#252B35] px-4 text-sm text-foreground dark:text-[#F5F7FA] placeholder:text-muted-foreground dark:placeholder:text-[#626A75] outline-none focus:border-[#DDB52F] transition-all"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground dark:text-[#737B88] font-semibold block mb-1">
                          CONFIRM PASSWORD
                        </label>
                        <input
                          type="password"
                          required
                          disabled={loading}
                          placeholder="••••••••"
                          className="w-full h-[52px] rounded-[14px] bg-background dark:bg-[#161B26] border border-border dark:border-[#252B35] px-4 text-sm text-foreground dark:text-[#F5F7FA] placeholder:text-muted-foreground dark:placeholder:text-[#626A75] outline-none focus:border-[#DDB52F] transition-all"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-muted/40 dark:bg-[#11161D] border border-border dark:border-[#29313B] space-y-1 text-xs text-muted-foreground dark:text-[#9AA2AF]">
                        <p className="font-semibold text-foreground dark:text-[#F5F7FA] text-[11px]">PASSWORD REQUIREMENTS:</p>
                        <div className="grid grid-cols-2 gap-1 text-[11px]">
                          <span className={password.length >= 8 ? "text-[#39D393]" : "text-muted-foreground dark:text-[#737B88]"}>✓ 8+ characters</span>
                          <span className={/[A-Z]/.test(password) ? "text-[#39D393]" : "text-muted-foreground dark:text-[#737B88]"}>✓ Uppercase</span>
                          <span className={/[a-z]/.test(password) ? "text-[#39D393]" : "text-muted-foreground dark:text-[#737B88]"}>✓ Lowercase</span>
                          <span className={/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? "text-[#39D393]" : "text-muted-foreground dark:text-[#737B88]"}>✓ Number & Symbol</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (recoveryStep > 1) {
                          setRecoveryStep((prev) => (prev - 1) as any);
                        } else {
                          setState("EMAIL_ENTRY");
                        }
                      }}
                      className="h-[52px] rounded-[14px] bg-muted/40 dark:bg-[#161B26] border border-border dark:border-[#252B35] hover:border-[#343B46] text-muted-foreground dark:text-[#8E949E] hover:text-foreground dark:hover:text-[#F5F7FA] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{recoveryStep === 1 ? "Back to Sign In" : "Previous Step"}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={
                        loading ||
                        (recoveryStep === 1 && !email) ||
                        (recoveryStep === 2 && !recoveryCodeInput.trim()) ||
                        (recoveryStep === 3 && (!password || password !== confirmPassword || password.length < 8))
                      }
                      className="h-[52px] rounded-[14px] bg-[#DDB52F] hover:bg-[#E8C54A] text-[#0E1117] font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-sm"
                    >
                      {loading ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="animate-spin h-4 w-4 text-[#0E1117]" />
                          <span>Verifying...</span>
                        </span>
                      ) : (
                        <>
                          <span>{recoveryStep === 1 ? "Next: Recovery Code" : recoveryStep === 2 ? "Verify Code" : "Reset Password"}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.form>
          )}

          {state === "PROFILE_SETUP" && (
            <motion.form
              key="profile"
              onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                setError("");
                try {
                  const res = await apiClient.post("/auth/setup/profile", {
                    displayName: profile.displayName,
                    timezone: profile.timezone || "Asia/Kolkata",
                    batchNumber: profile.batchNumber,
                  }, {
                    headers: tempToken ? { Authorization: `Bearer ${tempToken}` } : {}
                  });
                  if (res.data.success) {
                    if (res.data.tempToken) setTempToken(res.data.tempToken);
                    setState("RECOVERY_CODES");
                  } else {
                    handleError({ response: { data: res.data } });
                  }
                } catch (err) {
                  handleError(err);
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full max-w-[440px] sm:max-w-[520px] mx-auto relative text-left flex flex-col justify-between space-y-3 sm:space-y-4"
            >
              <div className="space-y-2.5 sm:space-y-3">
                {/* Step Indicator */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-muted-foreground dark:text-[#737B88] uppercase mb-1">
                    <span>PERSONAL PROFILE</span>
                    <span>{getOnboardingStepInfo(state, userRole)?.stepText || "02 / 06"}</span>
                  </div>
                  <div className="w-full h-[1px] bg-border dark:bg-[#20262F]" />
                </div>

                {/* Heading & Subtitle */}
                <div className="space-y-0.5 pt-0.5">
                  <h3 className="text-xl sm:text-2xl font-semibold text-foreground dark:text-[#F5F7FA] tracking-tight leading-tight">
                    Set up your personal identity
                  </h3>
                  <p className="text-xs text-muted-foreground dark:text-[#9AA2AF] leading-relaxed">
                    Choose the name you'll use in your Personal Workspace.
                  </p>
                </div>

                {/* Display Name Hero Input */}
                <div className="space-y-1 pt-0.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground dark:text-[#737B88] font-semibold block">DISPLAY NAME</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your display name"
                    className="w-full h-[48px] sm:h-[52px] rounded-[14px] bg-background dark:bg-[#151A22] border border-border dark:border-[#29313B] focus:border-[#DDB52F] px-4 text-xs sm:text-sm font-medium text-foreground dark:text-[#F5F7FA] placeholder:text-muted-foreground dark:placeholder:text-[#737B88] outline-none transition-all shadow-xs"
                    value={profile.displayName}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground dark:text-[#737B88] pt-0.5">This name will represent your Personal Workspace identity.</p>
                </div>

                {/* Compact Live Profile Identity Preview Card */}
                <div className="p-3.5 rounded-[14px] bg-muted/40 dark:bg-[#11161D] border border-border dark:border-[#29313B] space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground dark:text-[#737B88] font-semibold block">
                    PERSONAL IDENTITY
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-background dark:bg-[#151A22] border border-[#DDB52F]/40 text-[#DDB52F] font-bold text-sm flex items-center justify-center font-mono shrink-0 shadow-xs">
                      {profile.displayName.trim() ? getInitials(profile.displayName.trim()) : "—"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs sm:text-sm font-semibold text-foreground dark:text-[#F5F7FA] block truncate">
                        {profile.displayName.trim() || "Enter display name..."}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground dark:text-[#9AA2AF] mt-0.5">
                        <span className="text-[#DDB52F] font-semibold">Personal Workspace</span>
                        <span>·</span>
                        <span className="text-[#39D393] font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#39D393] animate-pulse" />
                          Authorized
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Grid: LEFT = ← Back (Secondary), RIGHT = Continue → (Primary Gold) */}
              <div className="pt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setState("PASSWORD")}
                  className="w-full h-[52px] sm:h-[56px] rounded-[14px] bg-muted/40 dark:bg-[#151A22] border border-border dark:border-[#29313B] text-muted-foreground dark:text-[#9AA2AF] hover:bg-muted dark:hover:bg-[#1B212A] hover:text-foreground dark:hover:text-[#F5F7FA] active:bg-muted/70 font-semibold text-xs sm:text-sm flex items-center justify-center transition-all cursor-pointer group"
                >
                  <ArrowLeft className="mr-1.5 sm:mr-2 w-4 h-4 text-current transition-transform group-hover:-translate-x-1" />
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading || !profile.displayName.trim() || profile.displayName.trim().length < 2}
                  className="w-full h-[52px] sm:h-[56px] rounded-[14px] bg-[#DDB52F] hover:bg-[#E8C54A] active:bg-[#C9A224] text-[#080A0D] font-bold text-xs sm:text-sm flex items-center justify-center transition-all disabled:opacity-40 shadow-sm cursor-pointer group"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full bg-[#080A0D] animate-pulse" />
                      Saving...
                    </span>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-1.5 sm:ml-2 w-4 h-4 text-[#080A0D] group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          )}

          {state === "RECOVERY_CODES" && (
            <motion.div
              key="recovery_codes_onboarding"
              {...fadeSlideProps}
              className="w-full max-w-[440px] sm:max-w-[540px] mx-auto relative text-left flex flex-col justify-between space-y-2.5"
            >
              <div className="space-y-2">
                {/* Step Indicator */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-muted-foreground dark:text-[#737B88] uppercase mb-1">
                    <div className="flex items-center gap-2">
                      <span>SECURE YOUR ACCOUNT</span>
                      <span className="text-[9px] font-bold text-[#DDB52F] px-1.5 py-0.5 rounded bg-[#DDB52F]/15 border border-[#DDB52F]/30">RECOMMENDED</span>
                    </div>
                    <span>{getOnboardingStepInfo(state, userRole)?.stepText || "03 / 06"}</span>
                  </div>
                  <div className="w-full h-[1px] bg-border dark:bg-[#20262F]" />
                </div>

                {/* Heading & Subtitle */}
                <div className="space-y-0.5 pt-0.5">
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground dark:text-[#F5F7FA] tracking-tight leading-tight">
                    Save your account recovery codes
                  </h3>
                  <p className="text-[11.5px] text-muted-foreground dark:text-[#9AA2AF] leading-snug">
                    Recovery codes can be used to recover access to your account if you forget your password. Save them in a safe location.
                  </p>
                </div>

                {/* Recovery Codes Grid */}
                <div className="p-3 rounded-[14px] bg-muted/40 dark:bg-[#11161D] border border-border dark:border-[#29313B] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground dark:text-[#737B88] font-semibold">
                      10 ONE-TIME RECOVERY CODES
                    </span>
                    <span className="text-[9.5px] font-mono text-[#DDB52F]">USE ONLY ONCE PER CODE</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] font-bold text-foreground dark:text-[#F5F7FA]">
                    {recoveryCodes.length > 0 ? (
                      recoveryCodes.map((c, idx) => (
                        <div key={idx} className="px-2.5 py-1 rounded-lg bg-background dark:bg-[#161B26] border border-border dark:border-[#252B35] flex items-center justify-between shadow-2xs">
                          <span className="text-muted-foreground dark:text-[#737B88] text-[9.5px]">{idx + 1}.</span>
                          <span className="text-[#DDB52F] tracking-wider">{c}</span>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 py-3 text-center text-xs text-muted-foreground dark:text-[#737B88]">
                        Loading recovery codes...
                      </div>
                    )}
                  </div>

                  {/* Action Buttons: Download, Copy, Share */}
                  <div className="grid grid-cols-3 gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const element = document.createElement("a");
                        const file = new Blob([recoveryCodes.join("\n")], { type: "text/plain" });
                        element.href = URL.createObjectURL(file);
                        element.download = "manmadhan-recovery-codes.txt";
                        document.body.appendChild(element);
                        element.click();
                        document.body.removeChild(element);
                      }}
                      className="h-8 rounded-lg bg-background dark:bg-[#161B26] border border-border dark:border-[#252B35] hover:border-[#DDB52F]/40 text-foreground dark:text-[#F5F7FA] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#DDB52F]" />
                      <span>Download</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(recoveryCodes.join("\n"));
                        setRecoveryCopySuccess(true);
                        setTimeout(() => setRecoveryCopySuccess(false), 2500);
                      }}
                      className="h-8 rounded-lg bg-background dark:bg-[#161B26] border border-border dark:border-[#252B35] hover:border-[#DDB52F]/40 text-foreground dark:text-[#F5F7FA] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#DDB52F]" />
                      <span>{recoveryCopySuccess ? "Copied!" : "Copy"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: "ManMadhan Progress Recovery Codes",
                              text: `ManMadhan Progress Account Recovery Codes:\n\n${recoveryCodes.join("\n")}`,
                            });
                          } catch (e) {
                            // User cancelled or unsupported
                          }
                        } else {
                          navigator.clipboard.writeText(recoveryCodes.join("\n"));
                          setRecoveryShareNotice("Sharing isn't supported on this device — codes copied to clipboard instead.");
                          setTimeout(() => setRecoveryShareNotice(null), 3000);
                        }
                      }}
                      className="h-8 rounded-lg bg-background dark:bg-[#161B26] border border-border dark:border-[#252B35] hover:border-[#DDB52F]/40 text-foreground dark:text-[#F5F7FA] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#DDB52F]" />
                      <span>Share</span>
                    </button>
                  </div>

                  {recoveryShareNotice && (
                    <p className="text-[10.5px] text-[#DDB52F] text-center">{recoveryShareNotice}</p>
                  )}
                </div>

                {/* Acknowledgement Checkbox */}
                <label className="flex items-start gap-2 pt-0.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={recoverySavedConfirmed}
                    onChange={(e) => setRecoverySavedConfirmed(e.target.checked)}
                    className="mt-0.5 w-3.5 h-3.5 rounded bg-background dark:bg-[#151A22] border-border dark:border-[#29313B] text-[#DDB52F] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#DDB52F]"
                  />
                  <span className="text-[11.5px] text-muted-foreground dark:text-[#9AA2AF] group-hover:text-foreground dark:group-hover:text-[#F5F7FA] transition-colors leading-tight">
                    I have securely saved my recovery codes in a safe place.
                  </span>
                </label>
              </div>

              {/* Single Full-Width Action Button (No Back Button for Completed Step) */}
              <div className="pt-1.5">
                <button
                  type="button"
                  disabled={!recoverySavedConfirmed || loading}
                  onClick={async () => {
                    setLoading(true);
                    setError("");
                    try {
                      const res = await apiClient.post(
                        "/auth/setup/recovery-codes/confirm",
                        {},
                        { headers: tempToken ? { Authorization: `Bearer ${tempToken}` } : {} }
                      );
                      if (res.data.success) {
                        if (res.data.tempToken) setTempToken(res.data.tempToken);
                        setState("BATCH_ID_VERIFICATION");
                      } else {
                        setError(res.data.error || "Failed to confirm recovery codes.");
                      }
                    } catch (err: any) {
                      handleError(err);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="w-full h-[48px] sm:h-[52px] rounded-[14px] bg-[#DDB52F] hover:bg-[#E8C54A] disabled:opacity-40 disabled:cursor-not-allowed text-[#0F1318] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer group"
                >
                  <span>{loading ? "Saving..." : "Continue"}</span>
                  <ArrowRight className="w-4 h-4 text-[#0F1318] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {state === "BATCH_ID_VERIFICATION" && (
            <motion.form
              key="batch_id_verification"
              onSubmit={async (e) => {
                e.preventDefault();
                const cleanBatchId = orgBatchId.trim().toUpperCase();
                if (!/^[A-Z]{2}[0-9]{4}$/.test(cleanBatchId)) {
                  setError("Organization Batch ID must be 2 uppercase letters followed by 4 digits (e.g. MM1107).");
                  return;
                }

                setLoading(true);
                setError("");
                try {
                  const res = await apiClient.post("/auth/setup/verify-batch-id", {
                    batchNumber: cleanBatchId,
                  }, {
                    headers: tempToken ? { Authorization: `Bearer ${tempToken}` } : {}
                  });

                  if (res.data.success && res.data.valid) {
                    if (res.data.tempToken) setTempToken(res.data.tempToken);
                    if (res.data.intendedRole) setVerifiedRole(res.data.intendedRole);
                    if (res.data.organizationName) setOrgName(res.data.organizationName);
                    
                    if (res.data.nextStep === "ORGANIZATION_SETUP" || res.data.intendedRole === "CEO") {
                      setState("ORGANIZATION_SETUP");
                    } else {
                      setState("REVIEW_SETUP");
                    }
                  } else {
                    setError(res.data.error || "Invalid or unassigned Organization Batch ID.");
                  }
                } catch (err: any) {
                  handleError(err);
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full max-w-[440px] sm:max-w-[540px] mx-auto relative text-left flex flex-col justify-between space-y-3 sm:space-y-4"
            >
              <div className="space-y-2.5 sm:space-y-3">
                {/* Step Indicator */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-muted-foreground dark:text-[#737B88] uppercase mb-1">
                    <div className="flex items-center gap-2">
                      <span>JOIN ORGANIZATION</span>
                      <span className="text-[9px] font-bold text-[#DDB52F] px-1.5 py-0.5 rounded bg-[#DDB52F]/15 border border-[#DDB52F]/30">MANDATORY</span>
                    </div>
                    <span>{getOnboardingStepInfo(state, userRole)?.stepText || "04 / 06"}</span>
                  </div>
                  <div className="w-full h-[1px] bg-border dark:bg-[#20262F]" />
                </div>

                {/* Heading & Subtitle */}
                <div className="space-y-0.5 pt-0.5">
                  <h3 className="text-xl sm:text-2xl font-semibold text-foreground dark:text-[#F5F7FA] tracking-tight leading-tight">
                    Enter your organization invite
                  </h3>
                  <p className="text-xs text-muted-foreground dark:text-[#9AA2AF] leading-relaxed">
                    Enter the Batch ID provided by your organization administrator to continue joining the Organization Workspace.
                  </p>
                </div>

                {/* Organization Batch ID Input */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground dark:text-[#737B88] font-semibold block">
                    INVITE BATCH ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="MM1107"
                    maxLength={6}
                    className="w-full h-[52px] rounded-[14px] bg-background dark:bg-[#151A22] border border-border dark:border-[#29313B] focus:border-[#DDB52F] px-4 text-sm font-mono font-bold text-[#DDB52F] placeholder:text-muted-foreground dark:placeholder:text-[#737B88] outline-none transition-all shadow-xs uppercase tracking-wider"
                    value={orgBatchId}
                    onChange={(e) => setOrgBatchId(e.target.value.toUpperCase())}
                  />
                  <div className="flex items-center justify-between pt-0.5 text-xs text-muted-foreground dark:text-[#737B88]">
                    <span>Example: MM1107</span>
                    <span className="font-mono text-[11px] text-muted-foreground dark:text-[#9AA2AF]">2 Letters + 4 Digits</span>
                  </div>
                </div>

                {/* Information Card */}
                <div className="p-3.5 rounded-[14px] bg-muted/40 dark:bg-[#11161D] border border-border dark:border-[#29313B] space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground dark:text-[#737B88] font-semibold block">
                    SERVER-VALIDATED MEMBERSHIP
                  </span>
                  <p className="text-xs text-muted-foreground dark:text-[#9AA2AF] leading-relaxed">
                    Your Organization Role (CEO, CO-CEO, or Member) will be securely validated server-side from your trusted invitation database record upon entry.
                  </p>
                </div>
              </div>

              {/* Actions Grid: LEFT = ← Back, RIGHT = Continue → */}
              <div className="pt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setState("RECOVERY_CODES")}
                  className="w-full h-[52px] sm:h-[56px] rounded-[14px] bg-muted/40 dark:bg-[#151A22] border border-border dark:border-[#29313B] text-muted-foreground dark:text-[#9AA2AF] hover:bg-muted dark:hover:bg-[#1B212A] hover:text-foreground dark:hover:text-[#F5F7FA] font-semibold text-xs sm:text-sm flex items-center justify-center transition-all cursor-pointer group"
                >
                  <ArrowLeft className="mr-1.5 sm:mr-2 w-4 h-4 text-current transition-transform group-hover:-translate-x-1" />
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading || !/^[A-Z]{2}[0-9]{4}$/.test(orgBatchId.trim().toUpperCase())}
                  className="w-full h-[52px] sm:h-[56px] rounded-[14px] bg-[#DDB52F] hover:bg-[#E8C54A] active:bg-[#C9A224] text-[#080A0D] font-bold text-xs sm:text-sm flex items-center justify-center transition-all disabled:opacity-40 shadow-sm cursor-pointer group"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full bg-[#080A0D] animate-pulse" />
                      Verifying...
                    </span>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-1.5 sm:ml-2 w-4 h-4 text-[#080A0D] group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          )}

          {state === "ORGANIZATION_SETUP" && (
            <motion.form
              key="org"
              onSubmit={handleOrgSubmit}
              className="w-full max-w-[440px] sm:max-w-[540px] mx-auto relative text-left flex flex-col justify-between space-y-2.5"
            >
              <div className="space-y-2">
                {/* Step Indicator */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-[#737B88] uppercase mb-1">
                    <div className="flex items-center gap-2">
                      <span>ORGANIZATION</span>
                      <span className="text-[9px] font-bold text-[#DDB52F] px-1.5 py-0.5 rounded bg-[#DDB52F]/15 border border-[#DDB52F]/30">CEO SETUP</span>
                    </div>
                    <span>{getOnboardingStepInfo(state, userRole)?.stepText || "03 / 05"}</span>
                  </div>
                  <div className="w-full h-[1px] bg-[#20262F]" />
                </div>

                {/* Heading & Subtitle */}
                <div className="space-y-0.5 pt-0.5">
                  <h3 className="text-lg sm:text-xl font-semibold text-[#F5F7FA] tracking-tight leading-tight">
                    Set up your organization
                  </h3>
                  <p className="text-[11.5px] text-[#9AA2AF] leading-snug">
                    Configure the organization workspace for your team.
                  </p>
                </div>

                {/* Organization Batch ID Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#F5F7FA] block uppercase font-mono tracking-wider">ORGANIZATION BATCH ID</label>
                  <input
                    type="text"
                    required
                    placeholder="MM1107"
                    maxLength={6}
                    className="w-full h-[42px] sm:h-[46px] rounded-[12px] bg-[#151A22] border border-[#29313B] focus:border-[#DDB52F] px-3.5 text-xs sm:text-sm font-mono font-bold text-[#DDB52F] placeholder-[#737B88] outline-none transition-all shadow-xs uppercase tracking-wider"
                    value={orgBatchId}
                    onChange={(e) => setOrgBatchId(e.target.value.toUpperCase())}
                  />
                  <p className="text-[10.5px] text-[#737B88] leading-tight">
                    Unique 6-character identifier (e.g. MM1107). Format: 2 letters + 4 numbers.
                  </p>
                </div>

                {/* Organization Logo */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#F5F7FA] block">Organization logo</label>
                  <div className="p-2.5 rounded-[12px] bg-[#151A22] border border-[#29313B] flex items-center gap-3 shadow-xs">
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      className="w-10 h-10 rounded-lg border border-[#29313B] bg-[#11161D] flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-[#DDB52F] transition-colors"
                    >
                      {orgLogo ? (
                        <img src={orgLogo} alt="Logo preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-[#DDB52F] font-mono">M</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#F5F7FA] truncate leading-tight">
                        {orgLogo ? "Logo uploaded" : "Upload logo"}
                      </p>
                      <p className="text-[10.5px] text-[#737B88]">PNG, JPG or SVG · Max 2 MB</p>

                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/svg+xml"
                        ref={logoInputRef}
                        className="hidden"
                        onChange={(e) => handleLogoFile(e.target.files?.[0])}
                      />

                      <div className="flex items-center gap-3 mt-0.5">
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="text-[11px] font-semibold text-[#DDB52F] hover:underline cursor-pointer"
                        >
                          {orgLogo ? "Replace logo" : "Choose logo"}
                        </button>
                        {orgLogo && (
                          <button
                            type="button"
                            onClick={() => {
                              setOrgLogo("");
                              if (logoInputRef.current) logoInputRef.current.value = "";
                            }}
                            className="text-[11px] font-semibold text-[#EF5B5B] hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Organization Name Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#F5F7FA] block">Organization name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter organization name"
                    className="w-full h-[42px] sm:h-[46px] rounded-[12px] bg-[#151A22] border border-[#29313B] focus:border-[#DDB52F] px-3.5 text-xs sm:text-sm font-medium text-[#F5F7FA] placeholder-[#737B88] outline-none transition-all shadow-xs"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                  />
                  <p className="text-[10.5px] text-[#737B88] leading-tight">
                    The name your team will see across ManMadhan Progress.
                  </p>
                </div>
              </div>

              {/* Single Full-Width Primary Continue Button */}
              <div className="pt-1.5">
                <button
                  type="submit"
                  disabled={loading || !orgName.trim() || orgName.trim().length < 2 || orgLoadingStep > 0}
                  className="w-full h-[46px] sm:h-[50px] rounded-[14px] bg-[#DDB52F] hover:bg-[#E8C54A] active:bg-[#C9A224] text-[#080A0D] font-bold text-xs sm:text-sm flex items-center justify-center transition-all disabled:bg-[#11161D] disabled:border disabled:border-[#20262F] disabled:text-[#596270] disabled:cursor-not-allowed shadow-sm cursor-pointer group"
                >
                  {loading || orgLoadingStep > 0 ? (
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full bg-[#080A0D] animate-pulse" />
                      Saving...
                    </span>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-1.5 sm:ml-2 w-4 h-4 text-[#080A0D] group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          )}

          {state === "REVIEW_SETUP" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="w-full max-w-[440px] sm:max-w-[540px] mx-auto relative text-left flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2.5">
                {/* Step Indicator */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-[#737B88] uppercase mb-1">
                    <span>REVIEW</span>
                    <span>{getOnboardingStepInfo(state, userRole)?.stepText || "05 / 06"}</span>
                  </div>
                  <div className="w-full h-[1px] bg-[#20262F]" />
                </div>

                {/* Heading */}
                <div className="space-y-0.5 pt-0.5">
                  <h3 className="text-lg sm:text-xl font-semibold text-[#F5F7FA] tracking-tight leading-tight">
                    Review your setup
                  </h3>
                  <p className="text-[11.5px] text-[#9AA2AF] leading-snug">
                    Everything looks ready. Confirm your executive setup credential pass below.
                  </p>
                </div>

                {/* Unified Executive Digital ID Pass Card */}
                <div className="relative rounded-[16px] bg-gradient-to-b from-[#151A22] via-[#11161D] to-[#0D1015] border border-[#DDB52F]/40 p-4 shadow-xl space-y-3 overflow-hidden">
                  {/* Card Header Badge */}
                  <div className="flex items-center justify-between border-b border-[#29313B]/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#39D393] animate-pulse" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#DDB52F]">
                        EXECUTIVE CREDENTIAL PASS
                      </span>
                    </div>
                    <span className="text-[9.5px] font-mono text-[#39D393] font-semibold bg-[#39D393]/10 border border-[#39D393]/30 px-2 py-0.5 rounded-md">
                      VERIFIED ✓
                    </span>
                  </div>

                  {/* Profile & Role Header */}
                  <div className="flex items-center gap-3.5 pt-0.5">
                    <div className="w-11 h-11 rounded-xl bg-[#1A202A] border border-[#DDB52F]/50 text-[#DDB52F] font-bold text-sm flex items-center justify-center font-mono shrink-0 shadow-md">
                      {profile.displayName.trim() ? getInitials(profile.displayName.trim()) : "H"}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-[#F5F7FA] truncate">
                          {profile.displayName.trim() || "Hemanth"}
                        </h4>
                        <span className="text-[10px] font-mono font-bold text-[#DDB52F] px-2 py-0.5 rounded bg-[#DDB52F]/15 border border-[#DDB52F]/30 uppercase tracking-wider shrink-0">
                          {verifiedRole || userRole || "CEO"}
                        </span>
                      </div>
                      <p className="text-[11.5px] font-mono text-[#9AA2AF] truncate">
                        {orgName || "ManMadhan Progress"}{orgBatchId ? ` · Batch: ${orgBatchId}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-[#29313B]/60 font-mono">
                    <div className="p-2.5 rounded-lg bg-[#151A22]/80 border border-[#252B35] space-y-0.5">
                      <span className="text-[9.5px] text-[#737B88] uppercase block font-semibold">Account Email</span>
                      <span className="text-[#F5F7FA] text-[11px] font-medium block truncate">
                        {email || authData?.email || "hemanthmm1107@gmail.com"}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#151A22]/80 border border-[#252B35] space-y-0.5">
                      <span className="text-[9.5px] text-[#737B88] uppercase block font-semibold">Personal Workspace</span>
                      <span className="text-[#DDB52F] text-[11px] font-medium block truncate">
                        {profile.displayName.trim() ? `${profile.displayName.trim().split(" ")[0]} · Personal` : "Personal Workspace"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Single Full-Width Primary Action Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    if (loading) return;
                    setLoading(true);
                    try {
                      const res = await apiClient.post("/auth/setup/complete", {}, {
                        headers: tempToken ? { Authorization: `Bearer ${tempToken}` } : {}
                      });
                      if (res.data?.success) {
                        setState("SETUP_COMPLETE");
                      } else {
                        handleError({ response: { data: res.data } });
                      }
                    } catch (err) {
                      handleError(err);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full h-[48px] sm:h-[52px] rounded-[14px] bg-[#DDB52F] hover:bg-[#E8C54A] active:bg-[#C9A224] text-[#080A0D] font-bold text-xs sm:text-sm flex items-center justify-center transition-all disabled:bg-[#11161D] disabled:border disabled:border-[#20262F] disabled:text-[#596270] disabled:cursor-not-allowed shadow-sm cursor-pointer group"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full bg-[#080A0D] animate-pulse" />
                      Completing setup...
                    </span>
                  ) : (
                    <>
                      Complete setup
                      <ArrowRight className="ml-1.5 sm:ml-2 w-4 h-4 text-[#080A0D] group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {state === "SETUP_COMPLETE" && (
            <motion.div
              key="setup_complete"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, type: "tween" }}
              className="w-full max-w-[440px] sm:max-w-[520px] mx-auto relative text-left flex flex-col justify-between space-y-3 sm:space-y-4"
            >
              <div className="space-y-3 sm:space-y-4">
                {/* Step Indicator */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-[#737B88] uppercase mb-1">
                    <span>COMPLETE</span>
                    <span>{getOnboardingStepInfo(state, userRole)?.stepText || "05 / 05"}</span>
                  </div>
                  <div className="w-full h-[1px] bg-[#20262F]" />
                </div>

                {/* 3D Completion Emblem */}
                <div className="relative flex items-center justify-center py-2">
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.35, ease: "easeOut", type: "tween" }}
                    className="relative w-20 h-20 rounded-2xl bg-gradient-to-b from-[#151A22] to-[#0D1015] border border-[#39D393]/40 shadow-[0_12px_32px_rgba(57,211,147,0.2),inset_0_1px_1px_rgba(255,255,255,0.08)] flex items-center justify-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#39D393]/15 border border-[#39D393]/40 flex items-center justify-center shadow-[0_0_16px_rgba(57,211,147,0.3)]">
                      <Check className="w-6 h-6 text-[#39D393] stroke-[3]" />
                    </div>
                  </motion.div>
                </div>

                {/* Heading */}
                <div className="space-y-0.5 text-center">
                  <h3 className="text-xl sm:text-2xl font-semibold text-[#F5F7FA] tracking-tight leading-tight">
                    You're all set.
                  </h3>
                  <p className="text-xs text-[#9AA2AF] leading-relaxed max-w-xs mx-auto">
                    Your ManMadhan Progress account is ready. Sign in with your new password to activate your session.
                  </p>
                </div>

                {/* Status Items */}
                <div className="space-y-2 pt-0.5">
                  <div className="flex items-center gap-3 text-xs font-medium text-[#F5F7FA] p-3 rounded-[14px] bg-[#11161D] border border-[#29313B] shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-[#39D393] shrink-0" />
                    <span>Profile completed</span>
                  </div>
                  {userRole === "CEO" && (
                    <div className="flex items-center gap-3 text-xs font-medium text-[#F5F7FA] p-3 rounded-[14px] bg-[#11161D] border border-[#29313B] shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-[#39D393] shrink-0" />
                      <span>Organization configured</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs font-medium text-[#F5F7FA] p-3 rounded-[14px] bg-[#11161D] border border-[#29313B] shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-[#39D393] shrink-0" />
                    <span>Personal workspace created</span>
                  </div>
                </div>

                {/* Countdown Ring Indicator */}
                <div className="flex flex-col items-center justify-center space-y-1.5 pt-1">
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <svg className="w-10 h-10 transform -rotate-90">
                      <circle
                        cx="20"
                        cy="20"
                        r="16"
                        stroke="#20262F"
                        strokeWidth="2.5"
                        fill="transparent"
                      />
                      <motion.circle
                        cx="20"
                        cy="20"
                        r="16"
                        stroke="#DDB52F"
                        strokeWidth="2.5"
                        fill="transparent"
                        strokeDasharray="100"
                        initial={{ strokeDashoffset: 100 }}
                        animate={{
                          strokeDashoffset: 100 - (setupRedirectCountdown / 3) * 100,
                        }}
                        transition={{ duration: 0.3, ease: "linear", type: "tween" }}
                      />
                    </svg>
                    <span className="absolute text-xs font-mono font-bold text-[#F5F7FA]">
                      {setupRedirectCountdown}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-[#737B88]">
                    Returning to sign in in {setupRedirectCountdown} second{setupRedirectCountdown === 1 ? "" : "s"}…
                  </p>
                </div>
              </div>

              {/* Action: Return to Login */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleReturnToLogin}
                  className="w-full h-[52px] sm:h-[56px] rounded-[14px] bg-[#DDB52F] hover:bg-[#E8C54A] active:bg-[#C9A224] text-[#080A0D] font-bold text-xs sm:text-sm flex items-center justify-center transition-all shadow-sm cursor-pointer group"
                >
                  Return to login
                  <ArrowRight className="ml-1.5 sm:ml-2 w-4 h-4 text-[#080A0D] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {state === "SUCCESS" && (
            <motion.div 
              key="success" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} 
              className="flex flex-col items-center justify-center py-10 relative"
            >
              {/* Particle Burst */}
              <ParticleBurst />

              {/* Soft Gold Glow */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(200,155,60,0.15),transparent_70%)] rounded-[32px] -z-10 pointer-events-none"
              />
              
              {/* Floating Security Badge */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: [0, -8, 0], opacity: 1 }}
                transition={{ 
                  y: { repeat: Infinity, duration: 4, ease: "easeInOut" },
                  opacity: { duration: 0.5, delay: 0.8 }
                }}
                className="absolute -top-12 px-4 py-1.5 bg-background border border-border/60 shadow-xl rounded-full flex items-center gap-2 z-20"
              >
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">Identity Verified</span>
              </motion.div>

              <div className="relative flex items-center justify-center w-32 h-32 mb-8 mt-4">
                {/* Circular Progress Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none drop-shadow-md">
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="60"
                    fill="none"
                    stroke="rgba(34,197,94,0.1)"
                    strokeWidth="4"
                  />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="60"
                    fill="none"
                    stroke="url(#gradient-success)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, ease: "easeInOut", delay: 0.1 }}
                  />
                  <defs>
                    <linearGradient id="gradient-success" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#15803d" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Core Verify Tick Morph Container - EXTREME 3D */}
                <motion.div 
                  initial={{ scale: 0, rotateY: -540, z: -200 }} 
                  animate={{ scale: 1, rotateY: 0, z: 50 }} 
                  transition={{ type: "spring", damping: 18, stiffness: 90, delay: 0.3 }}
                  className="relative z-10 w-28 h-28 flex items-center justify-center"
                  style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
                >
                  {/* Floating Animation Wrapper */}
                  <motion.div
                    animate={{ rotateX: [0, 10, -10, 0], rotateY: [0, 15, -15, 0], z: [50, 70, 50] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="relative w-full h-full flex items-center justify-center rounded-full bg-gradient-to-tr from-green-600 via-green-500 to-green-300 border-[3px] border-green-200/50"
                    style={{ 
                      transformStyle: "preserve-3d",
                      boxShadow: "inset 0 0 20px rgba(0,0,0,0.3), 0 20px 40px rgba(34,197,94,0.4), 0 0 80px rgba(34,197,94,0.6)" 
                    }}
                  >
                    {/* Coin Edge Simulation (Thickness) */}
                    <div className="absolute inset-0 rounded-full border-[8px] border-black/10" style={{ transform: "translateZ(-4px)" }} />
                    <div className="absolute inset-0 rounded-full border-[8px] border-black/20" style={{ transform: "translateZ(-8px)" }} />

                    {/* Glare/Shine Effect */}
                    <motion.div
                      animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 rounded-full opacity-60"
                      style={{
                        background: "linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.6) 40%, transparent 60%)",
                        backgroundSize: "200% 100%",
                        transform: "translateZ(1px)"
                      }}
                    />

                    <motion.div
                      initial={{ scale: 0, opacity: 0, rotateZ: -45 }}
                      animate={{ scale: 1, opacity: 1, rotateZ: 0 }}
                      transition={{ type: "spring", bounce: 0.7, delay: 0.9 }}
                      style={{ transform: "translateZ(20px)" }}
                    >
                      <Check className="w-14 h-14 text-white stroke-[4]" style={{ filter: "drop-shadow(0px 4px 6px rgba(0,64,0,0.6))" }} />
                    </motion.div>
                  </motion.div>
                </motion.div>
              </div>

              {/* Loading Transition Sequence */}
              <div className="w-full max-w-[280px] space-y-4 text-center">
                <motion.h3 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="text-xl font-extrabold text-foreground tracking-tight"
                >
                  Verification Successful
                </motion.h3>
                
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="flex items-center justify-center gap-3 text-muted-foreground bg-muted/40 py-3 px-4 rounded-xl border border-border/60 shadow-sm backdrop-blur-sm"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-gold" />
                  <span className="text-sm font-semibold tracking-wide">Preparing your Workspace...</span>
                </motion.div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>



      {/* Footer Links */}
      <div className={`flex justify-center items-center gap-3 ${isMobile ? "mt-4 text-[11px]" : "mt-8 text-[11px]"} font-medium text-muted-foreground/70 dark:text-[#697180]`}>
        <a href="/privacy" className="hover:underline hover:text-foreground dark:hover:text-[#F5F5F2] transition-colors">Privacy</a>
        <span>·</span>
        <a href="/terms" className="hover:underline hover:text-foreground dark:hover:text-[#F5F5F2] transition-colors">Terms</a>
        <span>·</span>
        <a href="/support" className="hover:underline hover:text-foreground dark:hover:text-[#F5F5F2] transition-colors">Support</a>
      </div>

    </div>
  );
}
