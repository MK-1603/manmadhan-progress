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
  EyeOff
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
  | "OTP_VERIFICATION"
  | "PASSWORD_CREATION"
  | "PASSWORD"
  | "FORGOT_PASSWORD"
  | "RESET_PASSWORD"
  | "PROFILE_SETUP"
  | "ORGANIZATION_SETUP"
  | "SUCCESS"
  | "ERROR";

const fadeSlideProps = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { type: "spring" as const, stiffness: 300, damping: 30 }
};

const ParticleBurst = () => {
  const particles = Array.from({ length: 32 });
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
      {particles.map((_, i) => {
        const angle = (i * 360) / particles.length;
        const radius = 80 + Math.random() * 60;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;
        const delay = Math.random() * 0.2 + 0.3; // start after morph
        
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{ x, y, scale: Math.random() * 0.8 + 0.2, opacity: 0 }}
            transition={{ duration: 1, delay, ease: "easeOut" }}
            className={`absolute w-2 h-2 rounded-full ${i % 2 === 0 ? "bg-gold" : "bg-green-400"} shadow-lg`}
          />
        );
      })}
    </div>
  );
};

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
  const [profile, setProfile] = useState({ displayName: "", timezone: "Asia/Kolkata", batchNumber: "", language: "English" });
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
    setError(err?.response?.data?.error || err.message || "An unknown error occurred.");
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

  useEffect(() => {
    setPassword("");
    setConfirmPassword("");
    setOtp("");
    setError("");
    otpAutoSubmitRef.current = false; // reset auto-submit guard on state transition
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
        setTempToken(res.data.tempToken);
        setState(res.data.nextStep as AuthState);
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
    setLoading(true);
    setError("");
    try {
      await apiClient.post("/auth/forgot-password", { email });
      setLoadingState("SENT");
      setTimeout(() => {
        setState("EMAIL_ENTRY");
        setLoadingState("");
      }, 3000);
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
        setLoading(false);
        setState("SUCCESS");
        setTimeout(async () => {
          onComplete?.();
          setTransitionMessage("Preparing Dashboard...");
          setIsTransitioning(true);
          await checkSession();
          if (typeof window !== "undefined") {
            setTimeout(() => {
              router.push("/ceo/dashboard");
              setTimeout(() => setIsTransitioning(false), 500);
            }, 800);
          }
        }, 1200);
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

  const hClass = isMobile ? "h-[52px] rounded-[14px]" : "h-14 rounded-2xl";
  const spaceClass = isMobile ? "space-y-3" : "space-y-4";
  const labelClass = isMobile ? "text-xs" : "text-[13px]";

  return (
    <div className={`w-full relative z-10 flex flex-col items-center ${isMobile ? "" : ""}`}>
      
      {/* Mobile Title Block */}
      {isMobile && state !== "PROFILE_SETUP" && state !== "ORGANIZATION_SETUP" && state !== "SUCCESS" && (
        <div className="w-full max-w-[440px] text-center mx-auto mb-4 space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {state === "OTP_VERIFICATION" 
              ? "Verify your identity" 
              : state === "RESET_PASSWORD" 
              ? "Create Master Password" 
              : state === "FORGOT_PASSWORD" 
              ? "Reset Your Password" 
              : state === "PASSWORD" 
              ? "Enter Master Password" 
              : state === "PASSWORD_CREATION" 
              ? "Set Master Password" 
              : "Welcome back"}
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {state === "OTP_VERIFICATION" ? (
              <span>Enter the 6-digit code sent to <strong className="text-foreground">{obfuscatedEmail}</strong></span>
            ) : state === "RESET_PASSWORD" ? (
              "Please establish a new secure master password for your account."
            ) : state === "FORGOT_PASSWORD" ? (
              "Enter your email address to receive account recovery instructions."
            ) : state === "PASSWORD" ? (
              "Enter your master password to access your workspace."
            ) : state === "PASSWORD_CREATION" ? (
              "Create a strong password for your new workspace account."
            ) : (
              "Sign in to continue to your secure workspace."
            )}
          </p>
        </div>
      )}

      {/* Dynamic Header Section - Hidden on Mobile since the Sheet provides its own compact header */}
      {!isMobile && state !== "PROFILE_SETUP" && state !== "ORGANIZATION_SETUP" && (
        <div className="mb-5 text-center space-y-2 flex flex-col items-center max-w-[440px] mx-auto">
          <AnimatePresence mode="wait">
            {state === "OTP_VERIFICATION" ? (
              <motion.div
                key="otp-badge"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-muted border border-border mb-3"
              >
                <ShieldCheck className="w-6 h-6 text-foreground" strokeWidth={1.5} />
              </motion.div>
            ) : (
              <motion.div 
                key="default-badge"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-muted border border-border mb-3"
              >
                <ShieldCheck className="w-6 h-6 text-foreground" strokeWidth={1.5} />
              </motion.div>
            )}
          </AnimatePresence>
          
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-muted-foreground mb-1">
            {state === "OTP_VERIFICATION" ? "SECURE VERIFICATION" : state === "RESET_PASSWORD" || state === "FORGOT_PASSWORD" ? "ACCOUNT RECOVERY" : state === "ERROR" ? "SECURITY ALERT" : state === "PASSWORD_CREATION" ? "ACCOUNT SETUP" : "AUTHENTICATION"}
          </p>
          <h2 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-foreground leading-tight">
            {state === "OTP_VERIFICATION" ? "Verify your identity" : state === "RESET_PASSWORD" ? "Secure Password Reset" : state === "FORGOT_PASSWORD" ? "Reset Your Password" : state === "ERROR" ? "Action Blocked" : state === "PASSWORD_CREATION" ? "Set Master Password" : "Welcome back"}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground font-medium">
            {state === "OTP_VERIFICATION" ? (
              <span>We've sent a 6-digit verification code to <br className="hidden sm:block" /> <strong className="text-foreground tracking-wide font-semibold">{obfuscatedEmail}</strong></span>
            ) : state === "RESET_PASSWORD" ? (
              "Please establish a new secure master password below."
            ) : state === "FORGOT_PASSWORD" ? (
              "Enter your email to receive a secure recovery link."
            ) : state === "ERROR" ? (
              "We could not process your secure request."
            ) : state === "PASSWORD_CREATION" ? (
              "Create a strong password for your new workspace account."
            ) : (
              "Sign in to continue to your secure workspace."
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

      <div className="w-full max-w-[440px] relative overflow-hidden pb-4">
        <AnimatePresence mode="wait" initial={false}>
          
          {state === "EMAIL_ENTRY" && (
            <motion.form key="email" {...fadeSlideProps} onSubmit={handlePasswordSubmit} className={spaceClass} autoComplete="off">
              <input
                type="hidden"
                value="something_to_defeat_chrome_autofill"
              />
              <GoogleButton 
                isMobile={isMobile} 
                disabled={loadingState !== ""} 
                onClick={() => {
                  setTransitionMessage("Redirecting to Google...");
                  setIsTransitioning(true);
                  setTimeout(() => {
                    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";
                    const googleAuthUrl = apiBase.endsWith("/api/v1") 
                      ? `${apiBase}/auth/google` 
                      : `${apiBase}/api/v1/auth/google`;
                    window.location.href = googleAuthUrl;
                  }, 600);
                }} 
              />
              
              <div className="flex items-center my-4 sm:my-6 text-[10px] uppercase font-bold text-muted-foreground tracking-widest opacity-60">
                <div className="flex-1 h-px bg-border"></div>
                <span className="px-4">Or continue with email</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              <div className="relative group space-y-3">
                <input
                  type="email"
                  required
                  disabled={loadingState !== ""}
                  placeholder="Work email"
                  className={`w-full ${hClass} bg-background/50 backdrop-blur-sm border border-border px-5 text-sm outline-none focus:outline-none focus:ring-0 focus:border-border/80 transition-colors shadow-sm peer disabled:opacity-50 disabled:cursor-not-allowed`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  name="email-auth-field"
                />
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={loadingState !== ""}
                    placeholder="Password"
                    className={`w-full ${hClass} bg-background/50 backdrop-blur-sm border border-border px-5 pr-12 text-sm outline-none focus:outline-none focus:ring-0 focus:border-border/80 transition-colors shadow-sm peer disabled:opacity-50 disabled:cursor-not-allowed`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    name="password-auth-field"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer focus:outline-none select-none flex items-center justify-center"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end px-1">
                  <button
                    type="button"
                    onClick={() => setState("FORGOT_PASSWORD")}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors hover:underline decoration-border underline-offset-4"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.98 }}
                disabled={loadingState !== "" || !email || !password}
                className={`w-full ${hClass} bg-gradient-to-b from-zinc-800 to-black dark:from-white dark:to-zinc-200 text-white dark:text-black font-semibold text-[15px] flex items-center justify-center transition-all disabled:opacity-50 shadow-md group relative overflow-hidden mt-4`}
              >
                {loadingState === "PREPARING" ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    <span>Preparing verification...</span>
                  </>
                ) : loadingState === "SENT" ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    <span>Code sent successfully</span>
                  </>
                ) : (
                  <>
                    <span className="mr-2">Sign In</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </motion.button>
            </motion.form>
          )}

          {state === "OTP_VERIFICATION" && (
            <motion.form key="otp" {...fadeSlideProps} onSubmit={handleOtpVerify} className="space-y-6 text-center">
              <div className="mb-8 flex flex-col items-center">
                <p className="text-[11px] text-muted-foreground font-medium mb-3 uppercase tracking-wider">Secure verification code sent to</p>
                <div className="flex items-center gap-3 bg-muted/30 border border-border pl-4 pr-1.5 py-1.5 rounded-full shadow-sm hover:border-gold/50 transition-colors group">
                  <strong className="text-foreground tracking-wide text-xs">
                    {email}
                  </strong>
                  <button 
                    type="button" 
                    onClick={() => { setState("EMAIL_ENTRY"); setOtp(""); }}
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all border border-border group-hover:border-gold/50"
                    title="Edit Email"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between sm:justify-center gap-1.5 sm:gap-3 w-full max-w-xs mx-auto">
                {Array.from({ length: 6 }).map((_, i) => (
                  <motion.div 
                    key={i} 
                    animate={error ? { x: [0, -5, 5, -5, 5, 0], transition: { duration: 0.4 } } : {}}
                    className="relative group flex-shrink-0"
                  >
                    <input
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      maxLength={6} // allow pasting up to 6
                      className="w-[calc(16.66%-4px)] min-w-[38px] max-w-[46px] h-12 sm:w-[46px] sm:h-[56px] bg-background/60 backdrop-blur-md border border-border/80 rounded-xl sm:rounded-[16px] text-center text-lg sm:text-xl font-bold font-mono outline-none focus:outline-none focus:ring-0 focus:border-border transition-colors shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] hover:bg-muted/30"
                      value={otp.split("")[i] || ""}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      autoFocus={i === 0}
                      disabled={loading}
                    />
                    <AnimatePresence>
                      {otp.split("")[i] && (
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="absolute inset-0 pointer-events-none rounded-[16px] border border-gold/30 opacity-50"
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-col items-center gap-4 mt-6">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading || otp.length < 6}
                  className={`w-full ${hClass} bg-gradient-to-b from-zinc-800 to-black dark:from-white dark:to-zinc-200 text-white dark:text-black font-semibold text-[15px] flex items-center justify-center transition-all disabled:opacity-50 shadow-md group overflow-hidden relative`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin h-5 w-5" />
                      Verifying Secure Code...
                    </span>
                  ) : (
                    <>Verify Identity <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                  )}
                </motion.button>
                
                <div className="flex items-center justify-center h-8">
                  {countdown > 0 ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground/80">
                      <svg className="w-4 h-4 transform -rotate-90">
                        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" fill="transparent" className="opacity-20" />
                        <motion.circle 
                          cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" fill="transparent" 
                          className="text-gold"
                          strokeDasharray={43.98}
                          animate={{ strokeDashoffset: 43.98 - (countdown / 59) * 43.98 }}
                          transition={{ duration: 1, ease: "linear" }}
                        />
                      </svg>
                      00:{countdown.toString().padStart(2, '0')}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 hover:underline decoration-border underline-offset-4"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Resend Code
                    </button>
                  )}
                </div>
              </div>
            </motion.form>
          )}

          {state === "PASSWORD_CREATION" && (
            <motion.form key="password" {...fadeSlideProps} onSubmit={handlePasswordSubmit} className={spaceClass}>
              <p className={`${labelClass} text-center text-muted-foreground mb-3`}>
                Establish a secure master password
              </p>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Master Password"
                  className={`w-full ${hClass} bg-background/50 backdrop-blur-sm border border-border px-4 pr-12 text-base outline-none focus:outline-none focus:ring-0 focus:border-border/80 transition-colors shadow-sm tracking-widest placeholder:tracking-normal`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  name="new-password-setup"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer focus:outline-none select-none flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative mt-2">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Confirm Password"
                  className={`w-full ${hClass} bg-background/50 backdrop-blur-sm border border-border px-4 pr-12 text-base outline-none focus:outline-none focus:ring-0 focus:border-border/80 transition-colors shadow-sm tracking-widest placeholder:tracking-normal`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  name="confirm-password-setup"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer focus:outline-none select-none flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading || !password || password !== confirmPassword}
                className={`w-full ${hClass} bg-gradient-to-b from-zinc-800 to-black dark:from-white dark:to-zinc-200 text-white dark:text-black font-semibold text-[15px] flex items-center justify-center transition-all disabled:opacity-50 mt-4 shadow-md group`}
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                   <>Proceed Securely <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                )}
              </motion.button>
            </motion.form>
          )}

          {state === "FORGOT_PASSWORD" && (
            <motion.form key="forgot-password" {...fadeSlideProps} onSubmit={handleForgotPasswordSubmit} className={spaceClass}>
              <div className="flex justify-between items-center mb-1.5 px-1">
                <p className={`${labelClass} text-muted-foreground`}>
                  Work email
                </p>
              </div>
              <input
                type="email"
                required
                disabled={loadingState !== ""}
                placeholder="name@company.com"
                className={`w-full ${hClass} bg-background/50 backdrop-blur-sm border border-border px-5 text-sm outline-none focus:outline-none focus:ring-0 focus:border-border/80 transition-colors shadow-sm rounded-xl`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={loadingState !== "" || !email}
                className={`w-full ${hClass} bg-gradient-to-b from-zinc-800 to-black dark:from-white dark:to-zinc-200 text-white dark:text-black font-semibold text-[15px] flex items-center justify-center transition-all disabled:opacity-50 shadow-md mt-5 group cursor-pointer`}
              >
                {loadingState === "SENT" ? (
                  <><CheckCircle2 className="h-4 w-4 mr-2 text-emerald-400" /> Link Sent Successfully</>
                ) : loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <>
                    <span className="mr-2">Send Reset Link</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </motion.button>

              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={() => setState("EMAIL_ENTRY")}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Sign In</span>
                </button>
              </div>
            </motion.form>
          )}

          {state === "RESET_PASSWORD" && (
            <motion.form key="reset-password" {...fadeSlideProps} onSubmit={handleResetPasswordSubmit} className={spaceClass}>
              <div className="flex justify-between items-center mb-1.5 px-1">
                <p className={`${labelClass} text-muted-foreground`}>
                  New master password
                </p>
                {email && (
                  <span className="text-[10px] font-mono font-bold text-muted-foreground/60 tracking-wider">
                    {obfuscatedEmail}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className={`w-full ${hClass} bg-background/50 backdrop-blur-sm border border-border px-4 pr-10 text-sm outline-none focus:outline-none focus:ring-0 focus:border-border/80 transition-colors shadow-sm rounded-xl tracking-widest placeholder:tracking-normal`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  name="reset-password-field"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer focus:outline-none select-none flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              <div className="flex justify-between items-center mt-3 mb-1.5 px-1">
                <p className={`${labelClass} text-muted-foreground`}>
                  Confirm new password
                </p>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className={`w-full ${hClass} bg-background/50 backdrop-blur-sm border border-border px-4 pr-10 text-sm outline-none focus:outline-none focus:ring-0 focus:border-border/80 transition-colors shadow-sm rounded-xl tracking-widest placeholder:tracking-normal`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  name="confirm-reset-password-field"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer focus:outline-none select-none flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="mt-2.5 px-1">
                <p className="text-[10.5px] font-medium text-amber-500/90 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  Note: For security, you cannot reuse your previous password.
                </p>
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading || !password || password !== confirmPassword}
                className={`w-full ${hClass} bg-gradient-to-b from-zinc-800 to-black dark:from-white dark:to-zinc-200 text-white dark:text-black font-semibold text-[15px] flex items-center justify-center transition-all disabled:opacity-50 mt-5 shadow-md group cursor-pointer`}
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                   <>
                     <span className="mr-2">Reset Password Securely</span>
                     <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                   </>
                )}
              </motion.button>

              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={() => setState("EMAIL_ENTRY")}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Sign In</span>
                </button>
              </div>
            </motion.form>
          )}

          {state === "PROFILE_SETUP" && (
            <div className="w-full max-w-[500px] mx-auto relative pb-4">
              <AnimatePresence mode="wait">
                {profileStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="w-full space-y-4"
                  >
                    <div className="text-center mb-6 flex flex-col items-center">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-muted border border-border mb-3 shadow-sm"
                      >
                        <ShieldCheck className="w-6 h-6 text-foreground" strokeWidth={1.5} />
                      </motion.div>
                      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-gold mb-1">ACCOUNT SETUP</p>
                      <h3 className="text-xl font-bold text-foreground tracking-tight">Your Details</h3>
                      <p className="text-[13px] text-muted-foreground mt-1">Let's get to know you better.</p>
                    </div>
                    
                    <div className="space-y-4 text-left">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground ml-1 mb-1.5 block">Display Name</label>
                        <input
                          type="text"
                          required
                          placeholder="John Doe"
                          className={`w-full ${hClass} bg-background/50 backdrop-blur-sm border border-border px-4 text-sm focus:border-gold outline-none transition-all shadow-sm rounded-xl`}
                          value={profile.displayName}
                          onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground ml-1 mb-1.5 block">Batch / Employee Number</label>
                        <input
                          type="text"
                          required
                          placeholder="EMP-1001"
                          className={`w-full ${hClass} bg-background/50 backdrop-blur-sm border border-border px-4 text-sm focus:border-gold outline-none transition-all shadow-sm rounded-xl uppercase`}
                          value={profile.batchNumber}
                          onChange={(e) => setProfile({ ...profile, batchNumber: e.target.value.toUpperCase() })}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!profile.displayName || !profile.batchNumber}
                      onClick={() => setProfileStep(2)}
                      className={`w-full ${hClass} bg-gradient-to-b from-zinc-800 to-black dark:from-white dark:to-zinc-200 text-white dark:text-black font-semibold text-[15px] flex items-center justify-center transition-all disabled:opacity-50 shadow-md rounded-xl mt-6 group`}
                    >
                      Continue <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </motion.div>
                )}

                {profileStep === 2 && (
                  <motion.form
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleProfileSubmit}
                    className="w-full space-y-4"
                  >
                    <div className="text-center mb-6 flex flex-col items-center">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-muted border border-border mb-3 shadow-sm"
                      >
                        <ShieldCheck className="w-6 h-6 text-foreground" strokeWidth={1.5} />
                      </motion.div>
                      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-gold mb-1">ACCOUNT SETUP</p>
                      <h3 className="text-xl font-bold text-foreground tracking-tight">Workspace Preferences</h3>
                      <p className="text-[13px] text-muted-foreground mt-1">Configure your workspace preferences.</p>
                    </div>
                    
                    <div className="space-y-4 text-left">
                      <div className="relative">
                        <label className="text-xs font-semibold text-muted-foreground ml-1 mb-1.5 block">Time Zone</label>
                        <div 
                          className={`w-full ${hClass} bg-background/50 backdrop-blur-sm border border-border px-4 text-sm flex items-center justify-between shadow-sm rounded-xl cursor-pointer hover:border-gold/50 transition-colors`}
                          onClick={() => setTzOpen(!tzOpen)}
                        >
                          <span className="truncate">{profile.timezone}</span>
                          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        
                        <AnimatePresence>
                          {tzOpen && (
                            <motion.div 
                              initial={{ opacity: 0, y: -5, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -5, scale: 0.98 }}
                              className="absolute bottom-14 z-50 w-full mb-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
                            >
                              <div className="p-2 border-b border-border bg-muted/20">
                                <input 
                                  type="text" 
                                  placeholder="Search timezones..." 
                                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-gold transition-colors"
                                  value={tzSearch}
                                  onChange={(e) => setTzSearch(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                />
                              </div>
                              <div className="max-h-48 overflow-y-auto p-1 scrollbar-thin">
                                {timezones.filter(tz => tz.toLowerCase().includes(tzSearch.toLowerCase())).slice(0, 50).map(tz => (
                                  <div 
                                    key={tz} 
                                    className={`px-3 py-2 text-xs rounded-md cursor-pointer transition-colors ${profile.timezone === tz ? 'bg-gold/10 text-gold font-medium' : 'hover:bg-muted text-foreground'}`}
                                    onClick={() => { setProfile({ ...profile, timezone: tz }); setTzOpen(false); setTzSearch(""); }}
                                  >
                                    {tz}
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground ml-1 mb-1.5 block">Language (Optional)</label>
                        <input
                          type="text"
                          placeholder="English"
                          className={`w-full ${hClass} bg-background/50 backdrop-blur-sm border border-border px-4 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-all shadow-sm rounded-xl`}
                          value={profile.language}
                          onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 mt-6 w-full">
                      <button
                        type="button"
                        onClick={() => setProfileStep(1)}
                        className={`w-1/3 ${hClass} bg-muted text-muted-foreground font-semibold text-[14px] flex items-center justify-center transition-all hover:bg-muted/80 rounded-xl shadow-sm`}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !profile.timezone}
                        className={`flex-1 ${hClass} bg-gradient-to-b from-zinc-800 to-black dark:from-white dark:to-zinc-200 text-white dark:text-black font-semibold text-[14px] flex items-center justify-center transition-all disabled:opacity-50 shadow-md rounded-xl group`}
                      >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                          <>Save & Continue <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                        )}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          )}

          {state === "ORGANIZATION_SETUP" && (
            <motion.form key="org" {...fadeSlideProps} onSubmit={handleOrgSubmit} className="flex flex-col gap-4 w-full max-w-[460px] mx-auto p-1">
              <div className="text-center mb-1 flex flex-col items-center">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 mb-2 shadow-sm text-gold"
                >
                  <ShieldCheck className="w-5 h-5 text-gold dark:text-[#F0BC2B]" strokeWidth={1.8} />
                </motion.div>
                <p className="text-[10px] font-bold tracking-widest text-gold uppercase mb-0.5">Authentication</p>
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground">Create Your Organization</h2>
                <p className="text-xs text-muted-foreground mt-1 font-medium">Complete your organization setup to access your workspace.</p>
              </div>

              {orgStep === 1 && (
                <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} className="flex flex-col gap-4">
                  {/* Logo Upload */}
                  <div className="w-full flex flex-col gap-1.5">
                    <div 
                      className={`flex items-center gap-4 p-3.5 rounded-xl border-2 border-dashed transition-all ${isDragging ? 'border-gold bg-gold/5 scale-[1.01]' : 'border-border/80 bg-muted/20 hover:bg-muted/30'} group`}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        handleLogoFile(e.dataTransfer.files?.[0]);
                      }}
                    >
                      <div className="relative w-14 h-14 rounded-full border border-border/80 bg-background flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:border-gold/50 transition-colors pointer-events-none">
                        {orgLogo ? (
                          <img src={orgLogo} alt="Logo preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                            <UploadCloud className="w-5 h-5 text-gold" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground mb-0.5">Organization Logo</p>
                        <p className="text-[11px] text-muted-foreground font-medium mb-2">PNG, JPG or SVG • Max 2 MB</p>
                        <div className="flex items-center gap-2">
                          <input 
                            type="file" 
                            accept="image/png, image/jpeg, image/svg+xml" 
                            ref={logoInputRef}
                            className="hidden" 
                            onChange={(e) => {
                              handleLogoFile(e.target.files?.[0]);
                            }}
                          />
                          <button type="button" onClick={() => logoInputRef.current?.click()} className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors">
                            {orgLogo ? "Replace Logo" : "Upload Logo"}
                          </button>
                          {orgLogo && (
                            <button type="button" onClick={() => { setOrgLogo(""); if(logoInputRef.current) logoInputRef.current.value = ""; }} className="text-[11px] font-bold text-red-500 hover:text-red-400 transition-colors">
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Organization Name & Live Preview */}
                  <div className="flex flex-col gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground ml-0.5">Organization Name</label>
                      <input
                        type="text"
                        required
                        placeholder="ManMadhan Global"
                        className="w-full h-11 rounded-xl bg-background border border-border px-3.5 text-xs font-medium focus:border-gold outline-none transition-all shadow-sm focus:ring-2 focus:ring-gold/20"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground ml-0.5 font-medium">The name displayed throughout your workspace.</p>
                    </div>

                    {/* Live Preview Card */}
                    {(orgName || workspaceId) && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="w-full rounded-xl border border-border/80 bg-muted/20 p-3 flex items-center gap-3 shadow-sm">
                        <div className="w-10 h-10 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
                          {orgLogo ? (
                            <img src={orgLogo} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <Building className="w-4 h-4 text-gold" />
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-xs font-bold text-foreground truncate">{orgName || "Organization Name"}</p>
                          <p className="text-[10px] text-muted-foreground font-medium truncate mt-0.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {workspaceId || "workspace-id"}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setOrgStep(2)}
                    disabled={!orgName || workspaceId.length < 2}
                    className="w-full h-11 bg-gold hover:bg-[#F0BC2B] text-black font-bold text-xs flex items-center justify-center transition-all disabled:opacity-50 shadow-sm rounded-xl mt-1 cursor-pointer"
                  >
                    Continue <ArrowRight className="ml-1.5 w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {orgStep === 2 && (
                <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground ml-0.5">Select Community Hubs</label>
                      <span className="text-[10px] text-gold font-bold">Both Selected by Default</span>
                    </div>
                    
                    {/* Two Distinct Interactive Toggleable Community Hubs */}
                    <div className="grid grid-cols-1 gap-2.5">
                      {/* Hub 1 */}
                      <button
                        type="button"
                        onClick={() => toggleHub("hub-1")}
                        className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                          selectedHubs.includes("hub-1")
                            ? "border-gold/60 bg-gold/10 shadow-sm"
                            : "border-border/60 bg-muted/10 opacity-60 hover:opacity-100 hover:bg-muted/20"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${
                          selectedHubs.includes("hub-1") ? "bg-gold/20 text-gold" : "bg-muted border border-border text-muted-foreground"
                        }`}>
                          H1
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-foreground">ManMadhan Hub - 1</p>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gold/20 text-gold border border-gold/30">
                                Admin Only
                              </span>
                              <CheckCircle2 className={`w-4 h-4 transition-colors ${selectedHubs.includes("hub-1") ? "text-gold" : "text-muted-foreground/30"}`} />
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Executive Strategy, High-Level Approvals, 8-Stage Governance & Settings.
                          </p>
                        </div>
                      </button>

                      {/* Hub 2 */}
                      <button
                        type="button"
                        onClick={() => toggleHub("hub-2")}
                        className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                          selectedHubs.includes("hub-2")
                            ? "border-gold/60 bg-gold/10 shadow-sm"
                            : "border-border/60 bg-muted/10 opacity-60 hover:opacity-100 hover:bg-muted/20"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${
                          selectedHubs.includes("hub-2") ? "bg-gold/20 text-gold" : "bg-muted border border-border text-muted-foreground"
                        }`}>
                          H2
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-foreground">ManMadhan Hub - 2</p>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                                Admin + Member
                              </span>
                              <CheckCircle2 className={`w-4 h-4 transition-colors ${selectedHubs.includes("hub-2") ? "text-gold" : "text-muted-foreground/30"}`} />
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Task Execution, Project Workspaces, Leaderboard & Collaborative Documents.
                          </p>
                        </div>
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground ml-0.5 font-medium">
                      No typing required. CEO can select both Hub-1 (Executive Strategy) and Hub-2 (Operations).
                    </p>
                  </div>

                  <div className="flex gap-2 mt-2 w-full">
                    <button
                      type="button"
                      onClick={() => setOrgStep(1)}
                      className="w-1/3 h-11 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs flex items-center justify-center transition-all rounded-xl shadow-sm"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || orgLoadingStep > 0}
                      className="flex-1 h-11 bg-gold hover:bg-[#F0BC2B] text-black font-bold text-xs flex items-center justify-center transition-all disabled:opacity-50 shadow-sm rounded-xl cursor-pointer px-4"
                    >
                      {orgLoadingStep > 0 ? (
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap overflow-hidden">
                          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-black" />
                          <span className="text-xs font-bold text-black truncate">
                            {orgLoadingStep === 1 ? "Connecting..." :
                             orgLoadingStep === 2 ? "Creating Organization..." :
                             orgLoadingStep === 3 ? "Configuring Hubs..." :
                             orgLoadingStep === 4 ? "Applying Security..." :
                             orgLoadingStep === 5 ? "Preparing Dashboard..." :
                             "Organization Ready!"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <span>Complete Setup & Enter Workspace</span>
                          <ArrowRight className="w-4 h-4 shrink-0" />
                        </div>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.form>
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
      <div className={`flex justify-center ${isMobile ? "gap-4 mt-6 text-[10px]" : "gap-6 mt-10 text-[11px]"} font-medium text-muted-foreground opacity-70`}>
        <a href="#" className="hover:text-foreground hover:opacity-100 transition-all">Privacy</a>
        <a href="#" className="hover:text-foreground hover:opacity-100 transition-all">Terms</a>
        <a href="#" className="hover:text-foreground hover:opacity-100 transition-all">Support</a>
      </div>

    </div>
  );
}