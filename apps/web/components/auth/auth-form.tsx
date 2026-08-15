"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleButton } from "./google-button";
import { Otp3DObject } from "./otp-3d-object";
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Check,
  ChevronDown,
  Search,
  Terminal,
  ArrowRight,
  ArrowLeft,
  Lock,
  Users,
  Building,
  RefreshCw,
  Edit2,
  UploadCloud,
  AlertTriangle,
  Eye,
  EyeOff,
  UserIcon
} from "lucide-react";
import apiClient from "../../lib/api-client";
import { useAuth } from "./auth-context";
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
  | "PASSWORD"
  | "FORGOT_PASSWORD"
  | "RESET_PASSWORD"
  | "RESET_SENT"
  | "PROFILE_SETUP"
  | "ORGANIZATION_SETUP"
  | "REVIEW_SETUP"
  | "SETUP_COMPLETE"
  | "SUCCESS"
  | "ERROR";

const fadeSlideProps = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { type: "spring" as const, stiffness: 300, damping: 30 }
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
        className={`w-full h-[52px] rounded-xl bg-[#111419] border ${
          isOpen ? "border-[#D7B33A]" : "border-[#282E36]"
        } px-4 text-xs font-medium text-[#F3F4F6] flex items-center justify-between outline-none transition-all cursor-pointer shadow-inner`}
      >
        <span className="truncate">{value || "Asia/Kolkata"}</span>
        <ChevronDown
          className={`w-4 h-4 text-[#8B93A0] transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#D7B33A]" : ""
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
            className="absolute left-0 right-0 top-[58px] z-50 bg-[#12161C] border border-[#282E36] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[260px] sm:max-h-[300px]"
          >
            <div className="p-2 border-b border-[#282E36] bg-[#111419] flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#8B93A0] ml-2 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search time zone..."
                className="w-full bg-transparent text-xs text-[#F3F4F6] placeholder-[#8B93A0] outline-none py-1.5 px-1"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="overflow-y-auto p-1.5 scrollbar-thin space-y-3">
              {filteredTzs ? (
                <div className="space-y-0.5">
                  {filteredTzs.length === 0 ? (
                    <p className="text-xs text-[#8B93A0] p-3 text-center">No timezones found</p>
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
                              ? "bg-[#D7B33A]/15 text-[#D7B33A] font-semibold"
                              : "text-[#F3F4F6] hover:bg-[#1C222B]"
                          }`}
                        >
                          <span className="truncate">{tz}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#D7B33A] shrink-0 ml-2" />}
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
  const { close, setIsDirty, setAuthState, authData, setAuthData, setIsTransitioning, setTransitionMessage, checkSession } = useAuth();
  
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
  const [workspaceId, setWorkspaceId] = useState("");
  const [orgLogo, setOrgLogo] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [orgLoadingStep, setOrgLoadingStep] = useState(0);
  const [userRole, setUserRole] = useState(startingRole);
  const [loadingStep, setLoadingStep] = useState(0);
  const [countdown, setCountdown] = useState(59);
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
  
  const [isGoogleAllowed, setIsGoogleAllowed] = useState(true);
  const [googleSubtext, setGoogleSubtext] = useState<string | undefined>(undefined);

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
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
        const url = `${apiBase.endsWith("/api/v1") ? apiBase : apiBase + "/api/v1"}/auth/check-google-availability?email=${encodeURIComponent(email)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.allowed === false) {
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
    if (state !== "EMAIL_ENTRY" || email.length > 0) {
      setIsDirty(true);
    } else {
      setIsDirty(false);
    }
  }, [state, email, setIsDirty]);

  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      await apiClient.post("/auth/login", { email });
      setCountdown(59);
      setOtp("");
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

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
    const errMsg = err?.response?.data?.error || err?.message;

    if (errCode === "ACCOUNT_NOT_FOUND" || errStatus === 404) {
      setState("ACCOUNT_NOT_FOUND");
      setError("");
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
      }

      if (res.data.nextStep === "DASHBOARD") {
        onComplete?.();
        setTransitionMessage("Authenticating...");
        setIsTransitioning(true);
        await checkSession();
        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const redirectParam = urlParams.get('redirect');
          setTimeout(() => {
            if (redirectParam) {
              window.location.href = redirectParam;
            } else {
              window.location.href = res.data.role === "CEO" ? "/ceo/dashboard" : res.data.role === "CO-CEO" ? "/co-ceo/dashboard" : "/member/dashboard";
            }
          }, 800);
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
      setResetSentCountdown(3);
      return;
    }

    setResetSentCountdown(3);
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



  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (state === "PASSWORD_CREATION") {
        const res = await apiClient.post("/auth/setup/password", { password }, {
          headers: { Authorization: `Bearer ${tempToken}` }
        });
        if (res.data.success) {
          setLoading(false);
          setTempToken(res.data.tempToken);
          setState("PROFILE_SETUP");
          setProfileStep(1);
        } else {
          handleError({ response: { data: res.data } });
        }
      } else {
        // Normal password login flow
        const res = await apiClient.post("/auth/login/password", { email, password });
        if (res.data.success) {
          if (res.data.nextStep === "OTP_VERIFICATION") {
            setLoadingState("SENT");
            setTimeout(() => {
              setState("OTP_VERIFICATION");
              setLoadingState("");
            }, 600);
          } else {
            if (res.data.accessToken) {
              localStorage.setItem("auth_token", res.data.accessToken);
              localStorage.setItem("token", res.data.accessToken);
            }
            onComplete?.();
            setTransitionMessage("Authenticating...");
            setIsTransitioning(true);
            
            await checkSession(); // Ensure user session is populated globally before navigating
            
            if (typeof window !== "undefined") {
              const urlParams = new URLSearchParams(window.location.search);
              const redirectParam = urlParams.get('redirect');
            
              // Use window.location.href for a hard navigation so the new page
              // picks up localStorage token cleanly (avoids SPA hydration race)
              setTimeout(() => {
                if (redirectParam) {
                  window.location.href = redirectParam;
                } else {
                  window.location.href = res.data.role === "CEO" ? "/ceo/dashboard" : res.data.role === "CO-CEO" ? "/co-ceo/dashboard" : "/member/dashboard";
                }
              }, 800);
            }
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
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      await apiClient.post("/auth/forgot-password", { email });
      setLoadingState("SENT");
      setTimeout(() => {
        setState("RESET_SENT");
        setLoadingState("");
      }, 600);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
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
        setTimeout(async () => {
          onComplete?.();
          setTransitionMessage("Preparing Dashboard...");
          setIsTransitioning(true);
          await checkSession();
          if (typeof window !== "undefined") {
            setTimeout(() => {
              router.push(res.data.role === "CEO" ? "/ceo/dashboard" : res.data.role === "CO-CEO" ? "/co-ceo/dashboard" : "/member/dashboard");
              setTimeout(() => setIsTransitioning(false), 500);
            }, 800);
          }
        }, 1500);
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
      let step = 0;
      const interval = setInterval(() => {
        step += 1;
        setLoadingStep(step);
        if (step > 4) {
          clearInterval(interval);
          onComplete?.();
          const urlParams = new URLSearchParams(window.location.search);
          const redirectParam = urlParams.get('redirect');
          if (redirectParam) {
            window.location.href = redirectParam;
          } else {
            window.location.href = userRole === "CEO" ? "/ceo/dashboard" : userRole === "CO-CEO" ? "/co-ceo/dashboard" : "/member/dashboard";
          }
        }
      }, 600);
      return () => clearInterval(interval);
    }
  }, [state, userRole, onComplete]);

  const hClass = "h-[50px] rounded-xl";
  const spaceClass = isMobile ? "space-y-3" : "space-y-4";
  const labelClass = isMobile ? "text-xs" : "text-[13px]";

  return (
    <div className={`w-full relative z-10 flex flex-col items-center ${isMobile ? "" : ""}`}>
      
      {/* Mobile Contextual Auth Heading Area */}
      {isMobile && (state === "EMAIL_ENTRY" || state === "FORGOT_PASSWORD" || state === "RESET_PASSWORD" || state === "RESET_SENT") && (
        <div className="w-full max-w-[440px] text-left mx-auto mb-6 space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground dark:text-[#F5F5F2]">
            {state === "EMAIL_ENTRY" 
              ? "Welcome back." 
              : state === "FORGOT_PASSWORD" 
              ? "Forgot your password?" 
              : state === "RESET_PASSWORD" 
              ? "Create a new password." 
              : state === "RESET_SENT" 
              ? "Check your inbox." 
              : "Welcome back."}
          </h2>
          <p className="text-sm text-muted-foreground dark:text-[#9299A8] leading-relaxed">
            {state === "EMAIL_ENTRY" ? (
              "Sign in to continue your progress."
            ) : state === "FORGOT_PASSWORD" ? (
              "No worries. Enter your email and we'll help you reset it."
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

      {/* Dynamic Header Section for sub-steps (Forgot Password, Reset Password, Reset Sent) */}
      {!isMobile && (state === "FORGOT_PASSWORD" || state === "RESET_PASSWORD" || state === "RESET_SENT") && (
        <div className="mb-5 text-center space-y-1 flex flex-col items-center max-w-[440px] mx-auto">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-muted-foreground dark:text-[#697180] mb-0.5">
            ACCOUNT RECOVERY
          </p>
          <h2 className="text-xl font-bold tracking-tight text-foreground dark:text-[#F5F5F2]">
            {state === "RESET_PASSWORD" 
              ? "Secure Password Reset" 
              : state === "FORGOT_PASSWORD" 
              ? "Reset your password" 
              : "Check your inbox"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground dark:text-[#9299A8]">
            {state === "RESET_PASSWORD" ? (
              "Please establish a new secure master password below."
            ) : state === "FORGOT_PASSWORD" ? (
              "Enter your email address and we'll send you a secure link to create a new password."
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
                    setTransitionMessage("Connecting to Google...");
                    setIsTransitioning(true);
                    setTimeout(() => {
                      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
                      const googleAuthUrl = apiBase.endsWith("/api/v1")
                        ? `${apiBase}/auth/google`
                        : `${apiBase}/api/v1/auth/google`;
                      window.location.href = googleAuthUrl;
                    }, 200);
                  }}
                />
              </div>
              
              {/* 2. Refined Divider (24px bottom gap) */}
              <div className="flex items-center mb-[24px]">
                <div className="flex-1 h-px bg-border dark:bg-[#282E38]"></div>
                <span className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground dark:text-[#697180]">
                  OR CONTINUE WITH EMAIL
                </span>
                <div className="flex-1 h-px bg-border dark:bg-[#282E38]"></div>
              </div>

              {/* 3. Input Fields (14px spacing, 56px height, 14px radius, #151920 surface) */}
              <div className="space-y-[14px]">
                <div className="relative group">
                  <input
                    type="email"
                    required
                    disabled={loadingState !== ""}
                    placeholder="Work email"
                    enterKeyHint="next"
                    className="w-full h-[56px] rounded-[14px] bg-background/60 dark:bg-[#151920] border border-border dark:border-[#282E38] px-4 text-sm text-foreground dark:text-[#F5F5F2] placeholder:text-muted-foreground dark:placeholder:text-[#7F8796] outline-none focus:outline-none focus:ring-0 focus:border-border-focus dark:focus:border-[#D4AF37] transition-all duration-200 shadow-xs peer disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="w-full h-[56px] rounded-[14px] bg-background/60 dark:bg-[#151920] border border-border dark:border-[#282E38] px-4 pr-12 text-sm text-foreground dark:text-[#F5F5F2] placeholder:text-muted-foreground dark:placeholder:text-[#7F8796] outline-none focus:outline-none focus:ring-0 focus:border-border-focus dark:focus:border-[#D4AF37] transition-all duration-200 shadow-xs peer disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-[#697180] hover:text-foreground dark:hover:text-[#9299A8] active:text-[#D4AF37] dark:active:text-[#D4AF37] cursor-pointer rounded-md p-1 outline-none select-none flex items-center justify-center transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-[#D4AF37]" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 4. Forgot Password (10px top gap, 20px bottom gap) */}
              <div className="flex justify-end pt-[10px] mb-[20px] px-0.5">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setState("FORGOT_PASSWORD")}
                  className="text-xs font-semibold text-muted-foreground dark:text-[#9299A8] hover:text-foreground dark:hover:text-[#D4AF37] transition-colors hover:underline decoration-border dark:decoration-[#282E38] underline-offset-4 cursor-pointer"
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
                className="w-full h-[56px] rounded-[14px] bg-[#D4AF37] hover:bg-[#E5C158] active:bg-[#C49F2B] text-[#0B0D11] font-bold text-sm flex items-center justify-center transition-all duration-200 disabled:bg-[#1C212B] disabled:text-[#697180] disabled:cursor-not-allowed shadow-sm group cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2 text-[#0B0D11]" />
                    <span>Signing in...</span>
                  </>
                ) : loadingState === "SENT" ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2 text-[#0B0D11]" />
                    <span>Code sent successfully</span>
                  </>
                ) : (
                  <>
                    <span className="mr-2">Sign In</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-[#0B0D11]" />
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
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-[#69717D] dark:text-[#767E8C] uppercase pb-1">
                    <span>ACCOUNT</span>
                  </div>
                  <div className="w-full h-[1px] bg-[#E1E4E8] dark:bg-[#282E36]" />
                </div>

                {/* Heading & Subtitle */}
                <div className="space-y-1">
                  <h3 className="text-2xl sm:text-[28px] font-semibold text-[#171A1F] dark:text-[#F3F4F6] tracking-tight leading-tight">
                    Account not found
                  </h3>
                  <p className="text-xs sm:text-sm text-[#69717D] dark:text-[#8B93A0] leading-relaxed">
                    We couldn't find an authorized account for this email.
                  </p>
                </div>

                {/* Masked Email Badge */}
                <div className="p-3.5 rounded-xl bg-[#F1F2F4] dark:bg-[#171B21] border border-[#D9DDE3] dark:border-[#282E36] flex items-center justify-between shadow-xs">
                  <span className="text-xs font-mono font-semibold text-[#171A1F] dark:text-[#F3F4F6]">{obfuscatedEmail || email}</span>
                  <span className="px-2 py-0.5 rounded bg-[#E5E7EB] dark:bg-[#282E36] text-[10px] font-mono font-semibold text-[#69717D] dark:text-[#767E8C] uppercase">Unregistered</span>
                </div>

                <p className="text-xs text-[#69717D] dark:text-[#767E8C]">
                  This account isn't ready for ManMadhan Progress yet.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-4 space-y-3">
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
                  className="w-full h-[52px] bg-[#B99625] dark:bg-[#D7B33A] hover:bg-[#A68520] dark:hover:bg-[#E4C35A] text-[#FFFFFF] dark:text-[#111419] font-bold text-xs flex items-center justify-center transition-all shadow-sm rounded-xl cursor-pointer group"
                >
                  Try another account <ArrowRight className="ml-2 w-4 h-4 text-current group-hover:translate-x-1 transition-transform" />
                </button>
                
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
                  className="w-full text-center text-xs font-semibold text-[#69717D] dark:text-[#8B93A0] hover:text-[#171A1F] dark:hover:text-[#F3F4F6] transition-colors py-1 cursor-pointer"
                >
                  Back to sign in
                </button>
              </div>
            </motion.div>
          )}          {state === "OTP_VERIFICATION" && (
            <motion.form
              key="otp"
              onSubmit={handleOtpVerify}
              className="w-full max-w-[440px] sm:max-w-[520px] mx-auto relative pb-2 text-left flex flex-col justify-between space-y-4 sm:space-y-5"
            >
              <div className="space-y-3 sm:space-y-4">
                {/* Step Indicator */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-[#69717D] dark:text-[#767E8C] uppercase mb-1">
                    <span>VERIFY IDENTITY</span>
                    <span>02 / 07</span>
                  </div>
                  <div className="w-full h-[1px] bg-[#E1E4E8] dark:bg-[#282E36]" />
                </div>

                {/* Heading */}
                <div className="space-y-1 pt-1">
                  <h3 className="text-2xl sm:text-[28px] font-semibold text-[#171A1F] dark:text-[#F3F4F6] tracking-tight leading-tight">
                    Verify your identity
                  </h3>
                  <p className="text-xs sm:text-sm text-[#69717D] dark:text-[#8B93A0]">
                    We've sent a 6-digit verification code to
                  </p>
                </div>

                {/* Email Pill */}
                <div className="p-2.5 sm:p-3 rounded-xl bg-[#F1F2F4] dark:bg-[#171B21] border border-[#D9DDE3] dark:border-[#282E36] flex items-center justify-between">
                  <span className="text-xs font-mono text-[#171A1F] dark:text-[#F3F4F6] font-semibold truncate pr-2">
                    {obfuscatedEmail || email}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setState("EMAIL_ENTRY"); setOtp(""); }}
                    className="w-8 h-8 rounded-lg bg-[#FFFFFF] dark:bg-[#1F2530] hover:bg-[#E5E7EB] dark:hover:bg-[#28303F] text-[#69717D] dark:text-[#8B93A0] hover:text-[#171A1F] dark:hover:text-[#F3F4F6] transition-all border border-[#D9DDE3] dark:border-[#2D3544] flex items-center justify-center cursor-pointer shrink-0"
                    title="Edit Email"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#B99625] dark:text-[#D7B33A]" />
                  </button>
                </div>

                {/* OTP Input Slots */}
                <div className="flex justify-between sm:justify-center gap-1.5 sm:gap-2.5 w-full max-w-xs mx-auto pt-2">
                  {Array.from({ length: 6 }).map((_, i) => {
                    const digit = otp.split("")[i] || "";
                    return (
                      <motion.div
                        key={i}
                        animate={error ? { x: [0, -4, 4, -4, 4, 0] } : {}}
                        className="relative flex-shrink-0"
                      >
                        <input
                          ref={(el) => { inputRefs.current[i] = el; }}
                          type="text"
                          maxLength={6}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="w-[42px] h-[48px] sm:w-[48px] sm:h-[54px] rounded-xl bg-[#FFFFFF] dark:bg-[#111419] border border-[#D9DDE3] dark:border-[#282E36] focus:border-[#B99625] dark:focus:border-[#D7B33A] focus:bg-[#FFFDF5] dark:focus:bg-[#15191F] text-center text-lg sm:text-xl font-bold font-mono text-[#171A1F] dark:text-[#F3F4F6] outline-none transition-all duration-150 shadow-xs"
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          autoFocus={i === 0}
                          disabled={loading || countdown === 0}
                        />
                      </motion.div>
                    );
                  })}
                </div>

                {/* Timer & Resend */}
                <div className="text-center pt-1">
                  {countdown > 0 ? (
                    <p className="text-xs text-[#69717D] dark:text-[#8B93A0]">
                      Resend available in <span className="font-mono font-semibold text-[#171A1F] dark:text-[#F3F4F6]">00:{countdown.toString().padStart(2, '0')}</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="text-xs font-semibold text-[#B99625] dark:text-[#D7B33A] hover:underline flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Resend code
                    </button>
                  )}
                </div>
              </div>

              {/* Verify Button (Mobile-First Full Width, Anchored) */}
              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setState("EMAIL_ENTRY")}
                  className="text-xs font-semibold text-[#69717D] dark:text-[#8B93A0] hover:text-[#171A1F] dark:hover:text-[#F3F4F6] transition-colors px-1 py-2 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length < 6 || countdown === 0}
                  className="flex-1 sm:flex-initial sm:w-[160px] h-[52px] bg-[#B99625] dark:bg-[#D7B33A] hover:bg-[#A68520] dark:hover:bg-[#E4C35A] text-[#FFFFFF] dark:text-[#111419] font-bold text-xs flex items-center justify-center transition-all disabled:bg-[#E5E1D2] dark:disabled:bg-[#332F24] disabled:text-[#92908A] dark:disabled:text-[#77736A] shadow-sm rounded-xl cursor-pointer group"
                >
                  {loading ? (
                    <Loader2 className="animate-spin h-4 w-4 text-current" />
                  ) : (
                    <>Verify <ArrowRight className="ml-2 w-4 h-4 text-current group-hover:translate-x-1 transition-transform" /></>
                  )}
                </button>
              </div>
            </motion.form>
          )}          {state === "PASSWORD_CREATION" && (
            <motion.form
              key="password"
              onSubmit={handlePasswordSubmit}
              className="w-full max-w-[440px] sm:max-w-[520px] mx-auto relative pb-2 text-left flex flex-col justify-between space-y-4 sm:space-y-5"
            >
              <div className="space-y-3 sm:space-y-4">
                {/* Step Indicator */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-[#69717D] dark:text-[#767E8C] uppercase mb-1">
                    <span>CHANGE PASSWORD</span>
                    <span>03 / 07</span>
                  </div>
                  <div className="w-full h-[1px] bg-[#E1E4E8] dark:bg-[#282E36]" />
                </div>

                {/* Heading */}
                <div className="space-y-1 pt-1">
                  <h3 className="text-2xl sm:text-[28px] font-semibold text-[#171A1F] dark:text-[#F3F4F6] tracking-tight leading-tight">
                    Create your new password
                  </h3>
                  <p className="text-xs sm:text-sm text-[#69717D] dark:text-[#8B93A0]">
                    Your temporary password has been verified. Choose a new password to secure your account.
                  </p>
                </div>

                {/* Form Controls */}
                <div className="space-y-3 pt-1">
                  {/* New password */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#171A1F] dark:text-[#F3F4F6] block">New password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Enter new password"
                        className="w-full h-[50px] sm:h-[52px] rounded-xl bg-[#FFFFFF] dark:bg-[#111419] border border-[#D9DDE3] dark:border-[#282E36] focus:border-[#B99625] dark:focus:border-[#D7B33A] focus:bg-[#FFFDF5] dark:focus:bg-[#15191F] px-4 pr-12 text-xs sm:text-sm font-medium text-[#171A1F] dark:text-[#F3F4F6] placeholder-[#9299A4] dark:placeholder-[#69717D] outline-none transition-all shadow-xs"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        name="new-password-setup"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#69717D] dark:text-[#8B93A0] hover:text-[#171A1F] dark:hover:text-[#F3F4F6] cursor-pointer p-1"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 text-[#B99625] dark:text-[#D7B33A]" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-1 pt-1">
                    <label className="text-xs font-medium text-[#171A1F] dark:text-[#F3F4F6] block">Confirm password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Confirm your new password"
                        className="w-full h-[50px] sm:h-[52px] rounded-xl bg-[#FFFFFF] dark:bg-[#111419] border border-[#D9DDE3] dark:border-[#282E36] focus:border-[#B99625] dark:focus:border-[#D7B33A] focus:bg-[#FFFDF5] dark:focus:bg-[#15191F] px-4 pr-12 text-xs sm:text-sm font-medium text-[#171A1F] dark:text-[#F3F4F6] placeholder-[#9299A4] dark:placeholder-[#69717D] outline-none transition-all shadow-xs"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        name="confirm-password-setup"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#69717D] dark:text-[#8B93A0] hover:text-[#171A1F] dark:hover:text-[#F3F4F6] cursor-pointer p-1"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 text-[#B99625] dark:text-[#D7B33A]" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Compact 2-Column Password Requirements */}
                  <div className="pt-2 space-y-1.5">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-[#69717D] dark:text-[#767E8C] font-semibold">
                      Password requirements
                    </p>
                    <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs">
                      <div className={`flex items-center gap-1.5 ${password.length >= 8 ? "text-[#2F7D4A] dark:text-[#10B981] font-semibold" : "text-[#69717D] dark:text-[#767E8C]"}`}>
                        <span>{password.length >= 8 ? "✓" : "○"}</span>
                        <span>8+ characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(password) ? "text-[#2F7D4A] dark:text-[#10B981] font-semibold" : "text-[#69717D] dark:text-[#767E8C]"}`}>
                        <span>{/[A-Z]/.test(password) ? "✓" : "○"}</span>
                        <span>Uppercase</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${/[a-z]/.test(password) ? "text-[#2F7D4A] dark:text-[#10B981] font-semibold" : "text-[#69717D] dark:text-[#767E8C]"}`}>
                        <span>{/[a-z]/.test(password) ? "✓" : "○"}</span>
                        <span>Lowercase</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${/[0-9]/.test(password) ? "text-[#2F7D4A] dark:text-[#10B981] font-semibold" : "text-[#69717D] dark:text-[#767E8C]"}`}>
                        <span>{/[0-9]/.test(password) ? "✓" : "○"}</span>
                        <span>Number</span>
                      </div>
                      <div className={`flex items-center gap-1.5 col-span-2 ${/[^A-Za-z0-9]/.test(password) ? "text-[#2F7D4A] dark:text-[#10B981] font-semibold" : "text-[#69717D] dark:text-[#767E8C]"}`}>
                        <span>{/[^A-Za-z0-9]/.test(password) ? "✓" : "○"}</span>
                        <span>Special character</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Anchored Footer Actions */}
              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setState("OTP_VERIFICATION")}
                  className="text-xs font-semibold text-[#69717D] dark:text-[#8B93A0] hover:text-[#171A1F] dark:hover:text-[#F3F4F6] transition-colors px-1 py-2 cursor-pointer"
                >
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
                  className="flex-1 sm:flex-initial sm:w-[160px] h-[52px] bg-[#B99625] dark:bg-[#D7B33A] hover:bg-[#A68520] dark:hover:bg-[#E4C35A] text-[#FFFFFF] dark:text-[#111419] font-bold text-xs flex items-center justify-center transition-all disabled:bg-[#E5E1D2] dark:disabled:bg-[#332F24] disabled:text-[#92908A] dark:disabled:text-[#77736A] shadow-sm rounded-xl cursor-pointer group"
                >
                  {loading ? (
                    <Loader2 className="animate-spin h-4 w-4 text-current" />
                  ) : (
                    <>Continue <ArrowRight className="ml-2 w-4 h-4 text-current group-hover:translate-x-1 transition-transform" /></>
                  )}
                </button>
              </div>
            </motion.form>
          )}

          {state === "FORGOT_PASSWORD" && (
            <motion.form key="forgot-password" {...fadeSlideProps} onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label htmlFor="recovery-email-input" className="text-xs font-semibold text-foreground dark:text-[#F5F5F2]">
                  Email address
                </label>
                <input
                  id="recovery-email-input"
                  type="email"
                  required
                  inputMode="email"
                  enterKeyHint="send"
                  disabled={loadingState !== ""}
                  placeholder="name@company.com"
                  className="w-full h-[56px] rounded-[14px] bg-background/60 dark:bg-[#151920] border border-border dark:border-[#282E38] px-4 text-sm text-foreground dark:text-[#F5F5F2] placeholder:text-muted-foreground dark:placeholder:text-[#7F8796] outline-none focus:outline-none focus:ring-0 focus:border-border-focus dark:focus:border-[#D4AF37] transition-all duration-200 shadow-xs"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <motion.button
                type="submit"
                whileHover={loading || !email ? {} : { scale: 1.005 }}
                whileTap={loading || !email ? {} : { scale: 0.99 }}
                disabled={loadingState !== "" || !email}
                className="w-full h-[56px] rounded-[14px] bg-[#D4AF37] hover:bg-[#E5C158] active:bg-[#C49F2B] text-[#0B0D11] font-bold text-sm flex items-center justify-center transition-all duration-200 disabled:opacity-50 shadow-sm mt-5 group cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2 text-[#0B0D11]" />
                    <span>Sending reset link...</span>
                  </>
                ) : loadingState === "SENT" ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2 text-[#0B0D11]" />
                    <span>Reset link sent</span>
                  </>
                ) : (
                  <>
                    <span className="mr-2">Send reset link</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-[#0B0D11]" />
                  </>
                )}
              </motion.button>

              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={() => setState("EMAIL_ENTRY")}
                  className="text-xs font-semibold text-muted-foreground dark:text-[#9299A8] hover:text-foreground dark:hover:text-[#F5F5F2] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </button>
              </div>
            </motion.form>
          )}

          {state === "RESET_SENT" && (
            <motion.div key="reset-sent" {...fadeSlideProps} className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-emerald-500">
                  CHECK YOUR EMAIL
                </p>
                <h3 className="text-xl font-bold text-foreground dark:text-[#F5F5F2] tracking-tight">
                  Check your inbox
                </h3>
                <p className="text-xs text-muted-foreground dark:text-[#9299A8] leading-relaxed max-w-xs mx-auto pt-1">
                  If an account exists for <strong className="text-foreground dark:text-[#F5F5F2]">{email}</strong>, we've sent a secure password reset link.
                </p>
                <p className="text-[11px] font-medium text-muted-foreground/80 dark:text-[#71717A] pt-2">
                  Returning to sign in in {resetSentCountdown} second{resetSentCountdown === 1 ? "" : "s"}…
                </p>
              </div>
              <button
                type="button"
                onClick={() => setState("EMAIL_ENTRY")}
                className="w-full h-[56px] rounded-[14px] bg-[#D4AF37] hover:bg-[#E5C158] active:bg-[#C49F2B] text-[#0B0D11] font-bold text-sm flex items-center justify-center transition-all duration-200 shadow-sm cursor-pointer mt-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2 text-[#0B0D11]" />
                <span>Back to sign in</span>
              </button>
            </motion.div>
          )}

          {state === "RESET_PASSWORD" && (
            <motion.form key="reset-password" {...fadeSlideProps} onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="flex justify-between items-center mb-1.5 px-1">
                <p className="text-xs font-semibold text-muted-foreground dark:text-[#9299A8]">
                  New master password
                </p>
                {email && (
                  <span className="text-[10px] font-mono font-bold text-muted-foreground/60 dark:text-[#697180] tracking-wider">
                    {obfuscatedEmail}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="w-full h-[56px] rounded-[14px] bg-background/60 dark:bg-[#151920] border border-border dark:border-[#282E38] px-4 pr-12 text-sm text-foreground dark:text-[#F5F5F2] placeholder:text-muted-foreground dark:placeholder:text-[#7F8796] outline-none focus:outline-none focus:ring-0 focus:border-border-focus dark:focus:border-[#D4AF37] transition-all duration-200 shadow-xs tracking-widest placeholder:tracking-normal"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  name="reset-password-field"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-[#697180] hover:text-foreground dark:hover:text-[#9299A8] active:text-[#D4AF37] dark:active:text-[#D4AF37] cursor-pointer focus:outline-none select-none flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-[#D4AF37]" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              <div className="flex justify-between items-center mt-3 mb-1.5 px-1">
                <p className="text-xs font-semibold text-muted-foreground dark:text-[#9299A8]">
                  Confirm new password
                </p>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="w-full h-[56px] rounded-[14px] bg-background/60 dark:bg-[#151920] border border-border dark:border-[#282E38] px-4 pr-12 text-sm text-foreground dark:text-[#F5F5F2] placeholder:text-muted-foreground dark:placeholder:text-[#7F8796] outline-none focus:outline-none focus:ring-0 focus:border-border-focus dark:focus:border-[#D4AF37] transition-all duration-200 shadow-xs tracking-widest placeholder:tracking-normal"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  name="confirm-reset-password-field"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-[#697180] hover:text-foreground dark:hover:text-[#9299A8] active:text-[#D4AF37] dark:active:text-[#D4AF37] cursor-pointer focus:outline-none select-none flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-[#D4AF37]" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="mt-2.5 px-1">
                <p className="text-[10.5px] font-medium text-amber-500/90 dark:text-[#D4AF37] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  Note: For security, you cannot reuse your previous password.
                </p>
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.99 }}
                disabled={loading || !password || password !== confirmPassword}
                className="w-full h-[56px] rounded-[14px] bg-[#D4AF37] hover:bg-[#E5C158] active:bg-[#C49F2B] text-[#0B0D11] font-bold text-sm flex items-center justify-center transition-all duration-200 disabled:opacity-50 mt-5 shadow-sm group cursor-pointer"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5 text-[#0B0D11]" /> : (
                   <>
                     <span className="mr-2">Reset Password Securely</span>
                     <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-[#0B0D11]" />
                   </>
                )}
              </motion.button>

              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={() => setState("EMAIL_ENTRY")}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground dark:text-[#9299A8] hover:text-foreground dark:hover:text-[#F5F5F2] transition-colors p-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Sign In</span>
                </button>
              </div>
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
                    headers: { Authorization: `Bearer ${tempToken}` }
                  });
                  if (res.data.success) {
                    setTempToken(res.data.tempToken);
                    if (res.data.nextStep === "ORGANIZATION_SETUP") {
                      setState("ORGANIZATION_SETUP");
                    } else if (res.data.nextStep === "REVIEW_SETUP") {
                      setState("REVIEW_SETUP");
                    } else {
                      setState("ORGANIZATION_SETUP");
                    }
                  } else {
                    handleError({ response: { data: res.data } });
                  }
                } catch (err) {
                  handleError(err);
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full max-w-[440px] sm:max-w-[520px] mx-auto relative pb-2 text-left flex flex-col justify-between space-y-4 sm:space-y-5"
            >
              <div className="space-y-3 sm:space-y-4">
                {/* Step Indicator */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-[#69717D] dark:text-[#767E8C] uppercase mb-1">
                    <span>PERSONAL PROFILE</span>
                    <span>{userRole === "CEO" ? "04 / 07" : "04 / 06"}</span>
                  </div>
                  <div className="w-full h-[1px] bg-[#E1E4E8] dark:bg-[#282E36]" />
                </div>

                {/* Heading & Subtitle */}
                <div className="space-y-1 pt-1">
                  <h3 className="text-2xl sm:text-[28px] font-semibold text-[#171A1F] dark:text-[#F3F4F6] tracking-tight leading-tight">
                    Set up your profile
                  </h3>
                  <p className="text-xs sm:text-sm text-[#69717D] dark:text-[#8B93A0]">
                    Choose the name you'll use across ManMadhan Progress.
                  </p>
                </div>

                {/* Display Name Input */}
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-medium text-[#171A1F] dark:text-[#F3F4F6] block">Display name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your display name"
                    className="w-full h-[50px] sm:h-[52px] rounded-xl bg-[#FFFFFF] dark:bg-[#111419] border border-[#D9DDE3] dark:border-[#282E36] focus:border-[#B99625] dark:focus:border-[#D7B33A] focus:bg-[#FFFDF5] dark:focus:bg-[#15191F] px-4 text-xs sm:text-sm font-medium text-[#171A1F] dark:text-[#F3F4F6] placeholder-[#9299A4] dark:placeholder-[#69717D] outline-none transition-all shadow-xs"
                    value={profile.displayName}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                    autoFocus
                  />
                  <p className="text-xs text-[#69717D] dark:text-[#8B93A0] pt-0.5">This is how you'll appear across ManMadhan Progress.</p>
                </div>

                {/* Batch / Employee ID (Read-only Metadata) */}
                <div className="pt-2">
                  <p className="text-xs font-medium text-[#171A1F] dark:text-[#F3F4F6]">Batch / Employee ID</p>
                  <p className="text-xs text-[#69717D] dark:text-[#8B93A0] mt-0.5 font-mono">
                    MK1603 · <span className="text-[#B99625] dark:text-[#D7B33A] font-semibold">Authorized</span>
                  </p>
                </div>
              </div>

              {/* Anchored Footer Actions */}
              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setState("PASSWORD_CREATION")}
                  className="text-xs font-semibold text-[#69717D] dark:text-[#8B93A0] hover:text-[#171A1F] dark:hover:text-[#F3F4F6] transition-colors px-1 py-2 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !profile.displayName.trim() || profile.displayName.trim().length < 2}
                  className="flex-1 sm:flex-initial sm:w-[160px] h-[52px] bg-[#B99625] dark:bg-[#D7B33A] hover:bg-[#A68520] dark:hover:bg-[#E4C35A] text-[#FFFFFF] dark:text-[#111419] font-bold text-xs flex items-center justify-center transition-all disabled:bg-[#E5E1D2] dark:disabled:bg-[#332F24] disabled:text-[#92908A] dark:disabled:text-[#77736A] shadow-sm rounded-xl cursor-pointer group"
                >
                  {loading ? (
                    <Loader2 className="animate-spin h-4 w-4 text-current" />
                  ) : (
                    <>Continue <ArrowRight className="ml-2 w-4 h-4 text-current group-hover:translate-x-1 transition-transform" /></>
                  )}
                </button>
              </div>
            </motion.form>
          )}

          {state === "ORGANIZATION_SETUP" && (
            <motion.form
              key="org"
              onSubmit={handleOrgSubmit}
              className="w-full max-w-[440px] sm:max-w-[540px] mx-auto relative pb-2 text-left flex flex-col justify-between space-y-4 sm:space-y-5"
            >
              <div className="space-y-3 sm:space-y-4">
                {/* Step Indicator */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-[#69717D] dark:text-[#767E8C] uppercase mb-1">
                    <div className="flex items-center gap-2">
                      <span>ORGANIZATION</span>
                      <span className="text-[9px] font-bold text-[#B99625] dark:text-[#D7B33A] px-1.5 py-0.5 rounded bg-[#F4E9BC] dark:bg-[#332B12] border border-[#B99625]/20 dark:border-[#D7B33A]/20">CEO SETUP</span>
                    </div>
                    <span>05 / 07</span>
                  </div>
                  <div className="w-full h-[1px] bg-[#E1E4E8] dark:bg-[#282E36]" />
                </div>

                {/* Heading & Subtitle */}
                <div className="space-y-1 pt-1">
                  <h3 className="text-2xl sm:text-[28px] font-semibold text-[#171A1F] dark:text-[#F3F4F6] tracking-tight leading-tight">
                    Set up your organization
                  </h3>
                  <p className="text-xs sm:text-sm text-[#69717D] dark:text-[#8B93A0]">
                    Configure the organization workspace for your team.
                  </p>
                </div>

                {/* Organization Logo (Compact Horizontal Upload Area) */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-medium text-[#171A1F] dark:text-[#F3F4F6] block">Organization logo</label>
                  <div className="p-3 rounded-xl bg-[#FFFFFF] dark:bg-[#111419] border border-[#D9DDE3] dark:border-[#282E36] flex items-center gap-3.5 shadow-xs">
                    {/* Logo Box */}
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      className="w-14 h-14 rounded-xl border border-[#D9DDE3] dark:border-[#2B313C] bg-[#F1F2F4] dark:bg-[#161B22] flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-[#B99625] dark:hover:border-[#D7B33A] transition-colors"
                    >
                      {orgLogo ? (
                        <img src={orgLogo} alt="Logo preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-[#B99625] dark:text-[#D7B33A] font-mono">M</span>
                      )}
                    </div>

                    {/* Meta & Actions */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#171A1F] dark:text-[#F3F4F6] truncate">
                        {orgLogo ? "Logo uploaded" : "Upload logo"}
                      </p>
                      <p className="text-[11px] text-[#69717D] dark:text-[#767E8C]">PNG, JPG or SVG · Max 2 MB</p>

                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/svg+xml"
                        ref={logoInputRef}
                        className="hidden"
                        onChange={(e) => handleLogoFile(e.target.files?.[0])}
                      />

                      <div className="flex items-center gap-3 mt-1">
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="text-xs font-semibold text-[#B99625] dark:text-[#D7B33A] hover:underline cursor-pointer"
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
                            className="text-xs font-semibold text-red-500 hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Organization Name Input */}
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-medium text-[#171A1F] dark:text-[#F3F4F6] block">Organization name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter organization name"
                    className="w-full h-[50px] sm:h-[52px] rounded-xl bg-[#FFFFFF] dark:bg-[#111419] border border-[#D9DDE3] dark:border-[#282E36] focus:border-[#B99625] dark:focus:border-[#D7B33A] focus:bg-[#FFFDF5] dark:focus:bg-[#15191F] px-4 text-xs sm:text-sm font-medium text-[#171A1F] dark:text-[#F3F4F6] placeholder-[#9299A4] dark:placeholder-[#69717D] outline-none transition-all shadow-xs"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                  />
                  <p className="text-xs text-[#69717D] dark:text-[#8B93A0] pt-0.5">
                    The name your team will see across ManMadhan Progress.
                  </p>
                </div>
              </div>

              {/* Anchored Footer Actions */}
              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setState("PROFILE_SETUP")}
                  className="text-xs font-semibold text-[#69717D] dark:text-[#8B93A0] hover:text-[#171A1F] dark:hover:text-[#F3F4F6] transition-colors px-1 py-2 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !orgName.trim() || orgName.trim().length < 2 || orgLoadingStep > 0}
                  className="flex-1 sm:flex-initial sm:w-[160px] h-[52px] bg-[#B99625] dark:bg-[#D7B33A] hover:bg-[#A68520] dark:hover:bg-[#E4C35A] text-[#FFFFFF] dark:text-[#111419] font-bold text-xs flex items-center justify-center transition-all disabled:bg-[#E5E1D2] dark:disabled:bg-[#332F24] disabled:text-[#92908A] dark:disabled:text-[#77736A] shadow-sm rounded-xl cursor-pointer group"
                >
                  {loading || orgLoadingStep > 0 ? (
                    <Loader2 className="animate-spin h-4 w-4 text-current" />
                  ) : (
                    <>Continue <ArrowRight className="ml-2 w-4 h-4 text-current group-hover:translate-x-1 transition-transform" /></>
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
              transition={{ duration: 0.2 }}
              className="w-full max-w-[440px] sm:max-w-[540px] mx-auto relative pb-2 text-left flex flex-col justify-between space-y-4 sm:space-y-5"
            >
              <div className="space-y-3 sm:space-y-4">
                {/* Step Indicator */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-[#69717D] dark:text-[#767E8C] uppercase mb-1">
                    <span>REVIEW</span>
                    <span>{userRole === "CEO" ? "06 / 07" : "05 / 06"}</span>
                  </div>
                  <div className="w-full h-[1px] bg-[#E1E4E8] dark:bg-[#282E36]" />
                </div>

                {/* Heading */}
                <div className="space-y-1 pt-1">
                  <h3 className="text-2xl sm:text-[28px] font-semibold text-[#171A1F] dark:text-[#F3F4F6] tracking-tight leading-tight">
                    Review your setup
                  </h3>
                  <p className="text-xs sm:text-sm text-[#69717D] dark:text-[#8B93A0]">
                    Everything looks ready. Confirm your setup details below.
                  </p>
                </div>

                {/* Summary Rows */}
                <div className="space-y-2.5 pt-1">
                  {/* Profile Section */}
                  <div className="p-3 rounded-xl bg-[#FFFFFF] dark:bg-[#111419] border border-[#D9DDE3] dark:border-[#282E36] flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#69717D] dark:text-[#767E8C] block mb-0.5">PROFILE</span>
                      <span className="text-xs font-semibold text-[#171A1F] dark:text-[#F3F4F6] block">{profile.displayName || "Sai Krishnan"}</span>
                      <span className="text-[11px] text-[#69717D] dark:text-[#767E8C]">ID: MK1603 · Authorized</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setState("PROFILE_SETUP")}
                      className="text-xs font-semibold text-[#B99625] dark:text-[#D7B33A] hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>

                  {/* Personal Space Section */}
                  <div className="p-3 rounded-xl bg-[#FFFFFF] dark:bg-[#111419] border border-[#D9DDE3] dark:border-[#282E36] flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#69717D] dark:text-[#767E8C] block mb-0.5">PERSONAL SPACE</span>
                      <span className="text-xs font-semibold text-[#171A1F] dark:text-[#F3F4F6] block">Personal Workspace</span>
                      <span className="text-[11px] text-[#69717D] dark:text-[#767E8C]">Created automatically · Private to you</span>
                    </div>
                  </div>

                  {/* Organization Section (CEO only) */}
                  {userRole === "CEO" && (
                    <div className="p-3 rounded-xl bg-[#FFFFFF] dark:bg-[#111419] border border-[#D9DDE3] dark:border-[#282E36] flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg border border-[#D9DDE3] dark:border-[#2B313C] bg-[#F1F2F4] dark:bg-[#161B22] flex items-center justify-center overflow-hidden shrink-0">
                          {orgLogo ? (
                            <img src={orgLogo} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-[#B99625] dark:text-[#D7B33A] font-mono">M</span>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#69717D] dark:text-[#767E8C] block mb-0.5">ORGANIZATION</span>
                          <span className="text-xs font-semibold text-[#171A1F] dark:text-[#F3F4F6] block">{orgName || "ManMadhan Workspace"}</span>
                          <span className="text-[11px] text-[#69717D] dark:text-[#767E8C]">Role: CEO · Full Authority</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setState("ORGANIZATION_SETUP")}
                        className="text-xs font-semibold text-[#B99625] dark:text-[#D7B33A] hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  )}

                  {/* Account Section */}
                  <div className="p-3 rounded-xl bg-[#FFFFFF] dark:bg-[#111419] border border-[#D9DDE3] dark:border-[#282E36] shadow-xs">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#69717D] dark:text-[#767E8C] block mb-0.5">ACCOUNT</span>
                    <span className="text-xs font-semibold text-[#171A1F] dark:text-[#F3F4F6] block font-mono">{email}</span>
                  </div>
                </div>
              </div>

              {/* Anchored Footer Actions */}
              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setState(userRole === "CEO" ? "ORGANIZATION_SETUP" : "PROFILE_SETUP")}
                  className="text-xs font-semibold text-[#69717D] dark:text-[#8B93A0] hover:text-[#171A1F] dark:hover:text-[#F3F4F6] transition-colors px-1 py-2 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const res = await apiClient.post("/auth/setup/complete", {}, {
                        headers: { Authorization: `Bearer ${tempToken}` }
                      });
                      if (res.data.success) {
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
                  className="flex-1 sm:flex-initial sm:w-[180px] h-[52px] bg-[#B99625] dark:bg-[#D7B33A] hover:bg-[#A68520] dark:hover:bg-[#E4C35A] text-[#FFFFFF] dark:text-[#111419] font-bold text-xs flex items-center justify-center transition-all disabled:bg-[#E5E1D2] dark:disabled:bg-[#332F24] disabled:text-[#92908A] dark:disabled:text-[#77736A] shadow-sm rounded-xl cursor-pointer group"
                >
                  {loading ? (
                    <Loader2 className="animate-spin h-4 w-4 text-current" />
                  ) : (
                    <>Complete setup <ArrowRight className="ml-2 w-4 h-4 text-current group-hover:translate-x-1 transition-transform" /></>
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
              transition={{ duration: 0.3 }}
              className="w-full max-w-[440px] sm:max-w-[520px] mx-auto relative pb-2 text-left flex flex-col justify-between space-y-4 sm:space-y-5"
            >
              <div className="space-y-3 sm:space-y-4">
                {/* Step Indicator */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-[#69717D] dark:text-[#767E8C] uppercase mb-1">
                    <span>COMPLETE</span>
                    <span>{userRole === "CEO" ? "07 / 07" : "06 / 06"}</span>
                  </div>
                  <div className="w-full h-[1px] bg-[#E1E4E8] dark:bg-[#282E36]" />
                </div>

                {/* Heading */}
                <div className="space-y-1 pt-1">
                  <h3 className="text-2xl sm:text-[28px] font-semibold text-[#171A1F] dark:text-[#F3F4F6] tracking-tight leading-tight">
                    You're all set.
                  </h3>
                  <p className="text-xs sm:text-sm text-[#69717D] dark:text-[#8B93A0]">
                    Your ManMadhan Progress account is ready. Sign in with your new password to activate your session.
                  </p>
                </div>

                {/* Status Items */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-3 text-xs font-medium text-[#171A1F] dark:text-[#F3F4F6] p-3 rounded-xl bg-[#FFFFFF] dark:bg-[#111419] border border-[#D9DDE3] dark:border-[#282E36] shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-[#B99625] dark:text-[#D7B33A] shrink-0" />
                    <span>Profile completed</span>
                  </div>
                  {userRole === "CEO" && (
                    <div className="flex items-center gap-3 text-xs font-medium text-[#171A1F] dark:text-[#F3F4F6] p-3 rounded-xl bg-[#FFFFFF] dark:bg-[#111419] border border-[#D9DDE3] dark:border-[#282E36] shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-[#B99625] dark:text-[#D7B33A] shrink-0" />
                      <span>Organization configured</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs font-medium text-[#171A1F] dark:text-[#F3F4F6] p-3 rounded-xl bg-[#FFFFFF] dark:bg-[#111419] border border-[#D9DDE3] dark:border-[#282E36] shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-[#B99625] dark:text-[#D7B33A] shrink-0" />
                    <span>Personal workspace created</span>
                  </div>
                </div>
              </div>

              {/* Action: Return to Login */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setTempToken("");
                    setState("EMAIL_ENTRY");
                    setPassword("");
                    setError("");
                    if (typeof window !== "undefined") {
                      const url = new URL(window.location.href);
                      url.searchParams.delete("auth_step");
                      url.searchParams.delete("token");
                      url.searchParams.set("activated", "true");
                      window.history.replaceState({}, '', url.pathname + url.search);
                    }
                  }}
                  className="w-full h-[52px] bg-[#B99625] dark:bg-[#D7B33A] hover:bg-[#A68520] dark:hover:bg-[#E4C35A] text-[#FFFFFF] dark:text-[#111419] font-bold text-xs flex items-center justify-center transition-all shadow-sm rounded-xl cursor-pointer group"
                >
                  Return to login <ArrowRight className="ml-2 w-4 h-4 text-current group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {state === "ERROR" && (
            <motion.div key="error-state" {...fadeSlideProps} className="flex flex-col items-center justify-center py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-[17px] font-bold text-foreground mb-2">Link Expired or Invalid</h3>
              <p className="text-[13px] text-muted-foreground font-medium mb-6 px-4">
                {authData?.error === "expired" 
                  ? "For your security, this password reset link has expired." 
                  : "This link is invalid or has already been used to change your password."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setAuthData(null);
                  setError("");
                  setState("FORGOT_PASSWORD");
                }}
                className={`w-full ${hClass} bg-background/50 backdrop-blur-sm border border-border px-5 text-sm font-semibold hover:bg-muted/50 transition-colors shadow-sm`}
              >
                Request a new link
              </button>
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
        <span>&middot;</span>
        <a href="/terms" className="hover:underline hover:text-foreground dark:hover:text-[#F5F5F2] transition-colors">Terms</a>
        <span>&middot;</span>
        <a href="/support" className="hover:underline hover:text-foreground dark:hover:text-[#F5F5F2] transition-colors">Support</a>
      </div>

    </div>
  );
}
