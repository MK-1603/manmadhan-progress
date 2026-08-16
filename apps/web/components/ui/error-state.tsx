"use client";

import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Home, Search, Compass, Headphones, ExternalLink, Sparkles, 
  ShieldAlert, Lock, KeyRound, WifiOff, AlertTriangle, RefreshCw, LogIn,
  FolderX, CheckSquare, Building2, UserX, Clock, ServerOff, Instagram
} from "lucide-react";
import Link from "next/link";

export type ErrorStateType =
  | "404"
  | "403"
  | "401"
  | "500"
  | "503"
  | "OFFLINE"
  | "ACCOUNT_NOT_FOUND"
  | "PROJECT_NOT_FOUND"
  | "TASK_NOT_FOUND"
  | "ORGANIZATION_NOT_FOUND"
  | "RESET_EXPIRED"
  | "RESET_INVALID"
  | "MAINTENANCE"
  | "RATE_LIMITED"
  | "PERMISSION_RESTRICTED"
  | "RESOURCE_DELETED"
  | "UNKNOWN";

interface ErrorStateConfig {
  eyebrow: string;
  statusText: string;
  title: string;
  description: string;
  primaryText: string;
  primaryHref?: string;
  secondaryText?: string;
  secondaryHref?: string;
  quoteDesktop: string;
  quoteMobile: string;
  icon: any;
}

const ERROR_CONFIGS: Record<ErrorStateType, ErrorStateConfig> = {
  "404": {
    eyebrow: "OOPS! PAGE NOT FOUND",
    statusText: "404",
    title: "We can't find this page.",
    description: "The page you're looking for doesn't exist or may have been moved. Let's get you back on track.",
    primaryText: "Go to Dashboard",
    primaryHref: "/dashboard",
    secondaryText: "Go Back",
    quoteDesktop: "Keep moving forward. Every path leads to progress.",
    quoteMobile: "Focus on progress, not perfection.",
    icon: Search,
  },
  "403": {
    eyebrow: "ACCESS RESTRICTED",
    statusText: "403",
    title: "You don't have access to this page.",
    description: "Your account is signed in, but you don't have permission to view this resource. Contact your administrator if you believe this is incorrect.",
    primaryText: "Go to Dashboard",
    primaryHref: "/dashboard",
    secondaryText: "Go Back",
    quoteDesktop: "Access follows responsibility.",
    quoteMobile: "Access follows responsibility.",
    icon: Lock,
  },
  "401": {
    eyebrow: "SESSION EXPIRED",
    statusText: "401",
    title: "Your session has expired.",
    description: "For your security, we've signed you out of your account. Please sign in again to continue where you left off.",
    primaryText: "Sign In",
    primaryHref: "/login",
    secondaryText: "Go to Dashboard",
    secondaryHref: "/dashboard",
    quoteDesktop: "Your session ended. Your progress didn't.",
    quoteMobile: "Your session ended. Your progress didn't.",
    icon: KeyRound,
  },
  "OFFLINE": {
    eyebrow: "CONNECTION LOST",
    statusText: "OFFLINE",
    title: "You're currently offline.",
    description: "Your internet connection is unavailable. Reconnect to continue monitoring real-time tasks, projects, and goals.",
    primaryText: "Try Again",
    secondaryText: "Go to Dashboard",
    secondaryHref: "/dashboard",
    quoteDesktop: "Stay focused. We'll reconnect.",
    quoteMobile: "Stay focused. We'll reconnect.",
    icon: WifiOff,
  },
  "ACCOUNT_NOT_FOUND": {
    eyebrow: "ACCOUNT NOT FOUND",
    statusText: "404",
    title: "We couldn't find this account.",
    description: "The account may have been removed, moved, or the information provided may be incorrect.",
    primaryText: "Back to Login",
    primaryHref: "/login",
    secondaryText: "Go to Dashboard",
    secondaryHref: "/dashboard",
    quoteDesktop: "Verify credentials and continue forward.",
    quoteMobile: "Verify credentials and try again.",
    icon: UserX,
  },
  "PROJECT_NOT_FOUND": {
    eyebrow: "PROJECT NOT FOUND",
    statusText: "404",
    title: "This project is no longer available.",
    description: "It may have been removed, archived, or your access permissions may have changed.",
    primaryText: "Back to Projects",
    primaryHref: "/dashboard/projects",
    secondaryText: "Go to Dashboard",
    secondaryHref: "/dashboard",
    quoteDesktop: "Build step by step.",
    quoteMobile: "Build step by step.",
    icon: FolderX,
  },
  "TASK_NOT_FOUND": {
    eyebrow: "TASK NOT FOUND",
    statusText: "404",
    title: "We couldn't find this task.",
    description: "It may have been completed, removed, or you may no longer have access to this workspace item.",
    primaryText: "Back to Tasks",
    primaryHref: "/dashboard/tasks",
    secondaryText: "Go to Dashboard",
    secondaryHref: "/dashboard",
    quoteDesktop: "Keep tracking your focus goals.",
    quoteMobile: "Keep tracking your focus goals.",
    icon: CheckSquare,
  },
  "ORGANIZATION_NOT_FOUND": {
    eyebrow: "WORKSPACE UNAVAILABLE",
    statusText: "404",
    title: "We couldn't find this workspace.",
    description: "The organization workspace may have been removed or your organization membership access may have changed.",
    primaryText: "Go to Dashboard",
    primaryHref: "/dashboard",
    secondaryText: "Contact Support",
    quoteDesktop: "Structure brings clarity.",
    quoteMobile: "Structure brings clarity.",
    icon: Building2,
  },
  "RESET_EXPIRED": {
    eyebrow: "LINK EXPIRED",
    statusText: "410",
    title: "This reset link has expired.",
    description: "For your security, password reset links are valid for 15 minutes. Please request a new link to recover your account.",
    primaryText: "Request New Link",
    primaryHref: "/forgot-password",
    secondaryText: "Back to Login",
    secondaryHref: "/login",
    quoteDesktop: "Security first, always.",
    quoteMobile: "Security first, always.",
    icon: Clock,
  },
  "RESET_INVALID": {
    eyebrow: "INVALID LINK",
    statusText: "400",
    title: "This reset link isn't valid.",
    description: "The link may be corrupted or has already been used. Request a new password reset link.",
    primaryText: "Request New Link",
    primaryHref: "/forgot-password",
    secondaryText: "Back to Login",
    secondaryHref: "/login",
    quoteDesktop: "Security first, always.",
    quoteMobile: "Security first, always.",
    icon: ShieldAlert,
  },
  "500": {
    eyebrow: "SYSTEM ERROR",
    statusText: "500",
    title: "We couldn't complete that request.",
    description: "An unexpected server error occurred on our end. Please try again or head back to your workspace.",
    primaryText: "Try Again",
    secondaryText: "Go to Dashboard",
    secondaryHref: "/dashboard",
    quoteDesktop: "Focus on progress, not perfection.",
    quoteMobile: "Focus on progress, not perfection.",
    icon: AlertTriangle,
  },
  "503": {
    eyebrow: "SERVICE UNAVAILABLE",
    statusText: "503",
    title: "ManMadhan Progress is temporarily unavailable.",
    description: "We're performing brief infrastructure updates. Please try again in a moment.",
    primaryText: "Try Again",
    secondaryText: "Contact Support",
    quoteDesktop: "Maintenance builds resilience.",
    quoteMobile: "Maintenance builds resilience.",
    icon: ServerOff,
  },
  "MAINTENANCE": {
    eyebrow: "SCHEDULED MAINTENANCE",
    statusText: "503",
    title: "We're making improvements.",
    description: "ManMadhan Progress is undergoing scheduled upgrades to enhance workspace performance.",
    primaryText: "Refresh Page",
    quoteDesktop: "Building a faster, sharper workspace.",
    quoteMobile: "Building a faster workspace.",
    icon: RefreshCw,
  },
  "RATE_LIMITED": {
    eyebrow: "RATE LIMITED",
    statusText: "429",
    title: "Too many requests.",
    description: "You've made too many requests in a short time. Please wait a moment before trying again.",
    primaryText: "Try Again",
    quoteDesktop: "Pace your focus.",
    quoteMobile: "Pace your focus.",
    icon: Clock,
  },
  "PERMISSION_RESTRICTED": {
    eyebrow: "ACTION RESTRICTED",
    statusText: "403",
    title: "You don't have permission for this action.",
    description: "Your role does not allow this operation. Contact your organization administrator or CO-CEO.",
    primaryText: "Go Back",
    quoteDesktop: "Access follows responsibility.",
    quoteMobile: "Access follows responsibility.",
    icon: Lock,
  },
  "RESOURCE_DELETED": {
    eyebrow: "RESOURCE REMOVED",
    statusText: "410",
    title: "This resource is no longer available.",
    description: "The item you requested has been permanently removed.",
    primaryText: "Go to Dashboard",
    primaryHref: "/dashboard",
    quoteDesktop: "Keep moving forward.",
    quoteMobile: "Keep moving forward.",
    icon: FolderX,
  },
  "UNKNOWN": {
    eyebrow: "UNEXPECTED ISSUE",
    statusText: "ERROR",
    title: "Something unexpected happened.",
    description: "An unhandled condition occurred. Try again or return to the dashboard.",
    primaryText: "Go to Dashboard",
    primaryHref: "/dashboard",
    secondaryText: "Try Again",
    quoteDesktop: "Stay focused, keep building.",
    quoteMobile: "Stay focused, keep building.",
    icon: AlertTriangle,
  },
};

// ── Minimalist Product-Designed Missing Path Architectural Scene ──
function MissingPathIllustration({ statusText }: { statusText: string }) {
  return (
    <div className="relative w-full max-w-[380px] xl:max-w-[420px] aspect-[4/3.2] flex items-center justify-center">
      {/* Subtle Ambient Gold Glow */}
      <div className="absolute w-64 h-64 rounded-full bg-[#D9A514]/10 blur-3xl pointer-events-none" />

      <svg 
        className="w-full h-full text-[#D9A514] overflow-visible" 
        viewBox="0 0 440 340" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pathGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1E232E" />
            <stop offset="100%" stopColor="#12151C" />
          </linearGradient>
          <linearGradient id="goldEdgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5C84C" />
            <stop offset="100%" stopColor="#876205" />
          </linearGradient>
          <filter id="plaqueShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Isometric Grid Floor Accent Lines */}
        <path d="M 40,280 L 400,280" stroke="currentColor" strokeWidth="0.75" opacity="0.08" strokeDasharray="4 6" />
        <path d="M 40,220 L 400,220" stroke="currentColor" strokeWidth="0.75" opacity="0.06" strokeDasharray="4 6" />
        
        {/* Pathway Segment 1 (Foreground Start -> Interrupted Break Edge) */}
        <g filter="url(#plaqueShadow)">
          <path 
            d="M 50,300 L 175,210 L 225,210 L 100,300 Z" 
            fill="url(#pathGrad)" 
            stroke="url(#goldEdgeGrad)" 
            strokeWidth="1.5" 
          />
          {/* Pathway Center Guidelines */}
          <path d="M 75,300 L 200,210" stroke="#D9A514" strokeWidth="1" strokeDasharray="6 6" opacity="0.35" />
        </g>

        {/* Visual Gap / Missing Path Break */}
        <path d="M 200,210 L 255,170" stroke="#D9A514" strokeWidth="1.5" strokeDasharray="3 5" opacity="0.3" />

        {/* Pathway Segment 2 (Post-Break -> Destination) */}
        <g filter="url(#plaqueShadow)" opacity="0.85">
          <path 
            d="M 255,170 L 325,120 L 365,120 L 295,170 Z" 
            fill="url(#pathGrad)" 
            stroke="url(#goldEdgeGrad)" 
            strokeWidth="1.2" 
          />
        </g>

        {/* Minimalist Destination Architecture Frame */}
        <g transform="translate(320, 75)" filter="url(#plaqueShadow)">
          <rect x="0" y="0" width="55" height="55" rx="14" fill="#141720" stroke="url(#goldEdgeGrad)" strokeWidth="1.5" />
          <circle cx="27.5" cy="27.5" r="12" fill="#1D222E" stroke="#D9A514" strokeWidth="1" />
          <circle cx="27.5" cy="27.5" r="4" fill="#F5C84C" />
        </g>

        {/* Grounded Physical Plaque Marker (Sitting on the Edge of the Interrupted Path) */}
        <g transform="translate(145, 155)" filter="url(#plaqueShadow)">
          <rect x="0" y="0" width="135" height="75" rx="18" fill="#111318" stroke="url(#goldEdgeGrad)" strokeWidth="2" />
          <path d="M 2,16 C 2,8 8,2 16,2 L 119,2 C 127,2 133,8 133,16" fill="none" stroke="#F5C84C" strokeWidth="1.2" opacity="0.5" />
          
          <text x="67.5" y="48" textAnchor="middle" fill="#F5C84C" fontSize="32" fontWeight="900" fontFamily="sans-serif" letterSpacing="1.5">
            {statusText}
          </text>
        </g>

        {/* Empty Premium Portrait Frame Placeholder (Integrated beside navigation, NO generic silhouette!) */}
        <g transform="translate(25, 175)" filter="url(#plaqueShadow)">
          <rect x="0" y="0" width="60" height="70" rx="14" fill="#141720" stroke="url(#goldEdgeGrad)" strokeWidth="1.5" />
          <rect x="5" y="5" width="50" height="60" rx="10" fill="#1C202B" stroke="#2B303C" strokeWidth="1" />
          <circle cx="30" cy="28" r="10" fill="none" stroke="#D9A514" strokeWidth="1" opacity="0.4" />
          <path d="M 16,52 C 16,42 22,38 30,38 C 38,38 44,42 44,52" fill="none" stroke="#D9A514" strokeWidth="1" opacity="0.4" />
        </g>
      </svg>
    </div>
  );
}

export interface ErrorStateProps {
  type?: ErrorStateType;
  customEyebrow?: string;
  customTitle?: string;
  customDescription?: string;
  primaryActionText?: string;
  primaryActionHref?: string;
  onPrimaryAction?: () => void;
  secondaryActionText?: string;
  secondaryActionHref?: string;
  onSecondaryAction?: () => void;
  returnUrl?: string;
}

export function ErrorState({
  type = "404",
  customEyebrow,
  customTitle,
  customDescription,
  primaryActionText,
  primaryActionHref,
  onPrimaryAction,
  secondaryActionText,
  secondaryActionHref,
  onSecondaryAction,
  returnUrl,
}: ErrorStateProps) {
  const router = useRouter();
  const config = ERROR_CONFIGS[type] || ERROR_CONFIGS["404"];

  const eyebrow = customEyebrow || config.eyebrow;
  const title = customTitle || config.title;
  const description = customDescription || config.description;
  const primaryText = primaryActionText || config.primaryText;
  const secondaryText = secondaryActionText || config.secondaryText;

  const handlePrimaryClick = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
      return;
    }
    
    if (type === "401" && returnUrl && typeof window !== "undefined") {
      try {
        sessionStorage.setItem("returnUrl", returnUrl);
      } catch (e) {
        // ignore
      }
    }

    const href = primaryActionHref || (type === "401" && returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : config.primaryHref);
    if (href) {
      router.push(href);
    } else {
      window.location.reload();
    }
  };

  const handleSecondaryClick = () => {
    if (onSecondaryAction) {
      onSecondaryAction();
      return;
    }
    const href = secondaryActionHref || config.secondaryHref;
    if (href) {
      router.push(href);
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#F8F9FA] dark:bg-[#060806] text-[#17202A] dark:text-[#F2F4F7] font-sans selection:bg-[#D4AF37]/30 relative overflow-x-hidden flex flex-col items-center justify-between transition-colors duration-200">
      
      {/* Ambient Lighting & Grid Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#D4AF37]/10 via-transparent to-transparent pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)`,
          backgroundSize: '36px 36px'
        }}
      />

      {/* Main Container Envelope */}
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 md:px-12 flex flex-col min-h-[100dvh] relative z-10 py-4 space-y-6">
        
        {/* ── HEADER BAR ── */}
        <header className="h-[56px] lg:h-[64px] shrink-0 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/60">
          <Link href="/dashboard" className="flex items-center gap-3 group transition-opacity hover:opacity-90">
            <img
              src="https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png"
              alt="ManMadhan Progress Logo"
              className="w-9 h-9 rounded-xl shadow-md border border-zinc-300 dark:border-zinc-700/60 object-cover"
            />
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold text-base lg:text-lg text-zinc-900 dark:text-white tracking-tight">ManMadhan</span>
                <span className="font-extrabold text-base lg:text-lg text-[#D9A514] tracking-tight">Progress</span>
              </div>
              <p className="text-[8px] lg:text-[9px] font-extrabold tracking-[0.2em] text-[#D9A514] uppercase mt-0.5">
                TRACK. FOCUS. ACHIEVE.
              </p>
            </div>
          </Link>

          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 dark:bg-zinc-900/90 dark:hover:bg-zinc-800 dark:border-zinc-700/60 text-xs font-semibold dark:text-zinc-300 dark:hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
        </header>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* ── DESKTOP HERO SECTION (>= 1024px): 60% LEFT / 40% RIGHT ───────── */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <main className="hidden lg:grid lg:grid-cols-12 gap-8 items-center flex-1 min-h-0 py-2 my-auto">
          
          {/* LEFT CONTENT COLUMN (7 cols / 60% Desktop) */}
          <div className="lg:col-span-7 space-y-4 text-left">
            
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9A514]/10 border border-[#D9A514]/25 text-[#D9A514] text-[10px] lg:text-[11px] font-extrabold tracking-[0.2em] uppercase">
              <Sparkles className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
              <span>{eyebrow}</span>
            </div>

            {/* Fluid Status Code */}
            <h1 className="text-7xl xl:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#D9A514] via-[#F5C84C] to-[#D9A514] tracking-tight leading-none">
              {config.statusText}
            </h1>

            {/* Title & Body */}
            <div className="space-y-2 max-w-xl">
              <h2 className="text-3xl xl:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight leading-tight">
                {title}
              </h2>
              <p className="text-xs lg:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                {description}
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <button
                onClick={handlePrimaryClick}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#D9A514] hover:bg-[#E8B623] active:bg-[#C2930F] text-zinc-950 font-bold text-xs lg:text-sm transition-all duration-200 shadow-lg shadow-[#D9A514]/15 cursor-pointer"
              >
                <Home className="w-4 h-4 text-zinc-950" />
                <span>{primaryText}</span>
              </button>

              {secondaryText && (
                <button
                  onClick={handleSecondaryClick}
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 dark:bg-zinc-900/90 dark:hover:bg-zinc-800 dark:border-zinc-700/80 dark:text-white font-semibold text-xs lg:text-sm transition-all duration-200 cursor-pointer shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                  <span>{secondaryText}</span>
                </button>
              )}
            </div>

            {/* SUPPORT LINK */}
            <div className="pt-1">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                Need help?{" "}
                <a
                  href="mailto:support@manmadhanprogress.com"
                  className="text-[#D9A514] hover:underline font-semibold flex items-center gap-1 transition-colors"
                >
                  Contact support <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>

          {/* RIGHT PRODUCT-DESIGNED MISSING PATH ILLUSTRATION COLUMN (5 cols / 40% Desktop) */}
          <div className="lg:col-span-5 flex items-center justify-center relative py-0">
            <MissingPathIllustration statusText={config.statusText} />
          </div>

        </main>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* ── MOBILE HERO SECTION (< 1024px): SINGLE COLUMN CLEAN COMPOS ──── */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <main className="flex lg:hidden flex-col items-center justify-center text-center py-4 my-auto space-y-3.5">
          
          {/* Warning Emblem Icon */}
          <div className="w-13 h-13 rounded-full bg-[#D9A514]/10 border border-[#D9A514]/30 flex items-center justify-center text-[#D9A514]">
            <AlertTriangle className="w-6 h-6 text-[#D9A514]" />
          </div>

          {/* Eyebrow */}
          <div className="text-[10px] font-extrabold tracking-[0.2em] text-[#D9A514] uppercase">
            ManMadhan Warning
          </div>

          {/* Large Gold Status Code */}
          <h1 className="text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#D9A514] via-[#F5C84C] to-[#D9A514] tracking-tight leading-none">
            {config.statusText}
          </h1>

          {/* Title */}
          <div className="space-y-1 max-w-xs">
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              The page is not available. Come back.
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              {description}
            </p>
          </div>

          {/* Compact Mobile Missing-Path Architectural Visual */}
          <div className="w-full max-w-[240px] flex items-center justify-center my-1">
            <MissingPathIllustration statusText={config.statusText} />
          </div>

          {/* Primary Action Button (Full Width Mobile) */}
          <button
            onClick={handlePrimaryClick}
            className="w-full max-w-xs h-12 rounded-xl bg-[#D9A514] hover:bg-[#E8B623] text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#D9A514]/15 cursor-pointer"
          >
            <Home className="w-4 h-4 text-zinc-950" />
            <span>Go Back Home</span>
          </button>

          {/* Mobile Quote Card */}
          <div className="w-full max-w-xs p-3.5 rounded-xl bg-white border border-zinc-200 dark:bg-[#111318] dark:border-zinc-800/70 text-center space-y-1 mt-1 shadow-sm">
            <p className="text-xs text-zinc-700 dark:text-zinc-300 italic">
              “ {config.quoteMobile} ”
            </p>
            <p className="text-[10px] font-bold text-[#D9A514]">
              — ManMadhan Payaluga
            </p>
          </div>

        </main>

        {/* ── DESKTOP QUOTE CARD ── */}
        <div className="hidden lg:block my-2 py-3 px-6 rounded-2xl bg-white border border-zinc-200 dark:bg-[#111318] dark:border-zinc-800/70 text-center shrink-0 shadow-sm">
          <p className="text-xs lg:text-sm text-zinc-700 dark:text-zinc-300 italic">
            “ {config.quoteDesktop} ”
          </p>
          <p className="text-xs font-bold text-[#D9A514] mt-1">
            — ManMadhan Payaluga
          </p>
        </div>

        {/* ── DESKTOP HELP CARDS (3 Columns) ── */}
        <div className="hidden lg:grid grid-cols-3 gap-4 pt-3 border-t border-zinc-200 dark:border-zinc-800/60 pb-3 shrink-0 text-left">
          <div className="p-3.5 rounded-xl bg-white border border-zinc-200/90 dark:bg-[#111318] dark:border-zinc-800/70 hover:border-[#D9A514]/40 transition-all duration-200 group flex items-start gap-3.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-[#D9A514]/10 border border-[#D9A514]/20 flex items-center justify-center shrink-0 text-[#D9A514]">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">CHECK THE URL</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Make sure the web address is typed correctly and try again.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-zinc-200/90 dark:bg-[#111318] dark:border-zinc-800/70 hover:border-[#D9A514]/40 transition-all duration-200 group flex items-start gap-3.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-[#D9A514]/10 border border-[#D9A514]/20 flex items-center justify-center shrink-0 text-[#D9A514]">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">GO TO DASHBOARD</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Navigate back to the dashboard and continue your work.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-zinc-200/90 dark:bg-[#111318] dark:border-zinc-800/70 hover:border-[#D9A514]/40 transition-all duration-200 group flex items-start gap-3.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-[#D9A514]/10 border border-[#D9A514]/20 flex items-center justify-center shrink-0 text-[#D9A514]">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">CONTACT SUPPORT</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                If the problem persists, our support team is here to help.
              </p>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="py-2 border-t border-zinc-200 dark:border-zinc-800/40 text-center text-[11px] text-zinc-500 font-medium shrink-0 flex flex-col items-center justify-center gap-1">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[#D9A514] hover:underline font-semibold transition-colors"
          >
            <Instagram className="w-3.5 h-3.5 text-[#D9A514]" />
            <span>Instagram</span>
          </a>
          <p>© 2026 ManMadhan Progress. All rights reserved.</p>
        </footer>

      </div>
    </div>
  );
}
