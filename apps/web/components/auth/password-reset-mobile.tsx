"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Check, ArrowRight, ArrowLeft, Loader2, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function PasswordResetMobile({ error }: { error: string | null }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const rules = [
    { label: "Minimum 12 characters", valid: password.length >= 12 },
    { label: "Uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "Lowercase letter", valid: /[a-z]/.test(password) },
    { label: "Number", valid: /\d/.test(password) },
    { label: "Special character", valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    { label: "Passwords match", valid: password.length > 0 && password === confirmPassword },
  ];

  const allRulesValid = rules.every((r) => r.valid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRulesValid) return;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm">
      {/* Bottom Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full bg-white rounded-t-[32px] flex flex-col max-h-[95vh] overflow-hidden"
      >
        {/* Drag Handle */}
        <div className="w-full flex justify-center pt-4 pb-2">
          <div className="w-12 h-1.5 rounded-full bg-zinc-200" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-12 pt-4">
          <div className="flex items-center gap-3 mb-6">
            <img src="https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png" alt="ManMadhan Progress Logo" className="w-8 h-8 rounded-md shadow-sm border border-zinc-200/50 object-cover" />
            <div>
              <h1 className="font-extrabold tracking-tight text-[15px] leading-tight text-zinc-900">ManMadhan Progress</h1>
              <p className="text-[11px] font-semibold tracking-wider uppercase text-zinc-500">Secure Account Recovery</p>
            </div>
          </div>

          {error ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-7 h-7 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-3">
                {error === "expired" ? "Link Expired" : "Invalid Link"}
              </h2>
              <p className="text-[15px] text-zinc-600 mb-8 leading-relaxed">
                {error === "expired" 
                  ? "This password reset link has expired for your security." 
                  : "This password reset link is invalid or has already been used."}
              </p>
              <Link href="/login" className="flex items-center justify-center h-14 rounded-2xl bg-zinc-900 text-white font-medium text-[16px] w-full">
                Return to Sign In
              </Link>
            </div>
          ) : success ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-3">Password Updated</h2>
              <p className="text-[15px] text-zinc-600 mb-8 leading-relaxed">Your master password has been changed securely. All previous sessions have been revoked.</p>
              <Link href="/login" className="flex items-center justify-center h-14 rounded-2xl bg-zinc-900 text-white font-medium text-[16px] w-full gap-2">
                Sign In Now <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2">Password Reset</h2>
                <p className="text-[14px] text-zinc-500 font-medium">Establish a new secure master password.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-zinc-900">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-14 px-4 rounded-2xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all text-[16px] text-zinc-900 font-medium"
                      placeholder="Enter new password"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-zinc-500 uppercase tracking-wider">
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-zinc-900">Confirm Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-14 px-4 rounded-2xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all text-[16px] text-zinc-900 font-medium"
                    placeholder="Confirm new password"
                  />
                </div>

                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 mt-2">
                  <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                    {rules.map((rule, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-300 \${rule.valid ? 'bg-emerald-500' : 'bg-zinc-200'}`}>
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                        <span className={`text-[12px] font-medium transition-colors duration-300 \${rule.valid ? 'text-zinc-900' : 'text-zinc-500'}`}>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!allRulesValid || loading}
                  className="w-full h-14 mt-6 rounded-2xl bg-zinc-900 text-white font-medium text-[16px] flex items-center justify-center transition-all disabled:opacity-50 hover:bg-zinc-800"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Reset Password"}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-zinc-100 flex items-center justify-between">
                <Link href="/login" className="flex items-center gap-1.5 text-[14px] font-semibold text-zinc-500">
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </Link>
                <div className="flex items-center gap-1 text-[12px] text-zinc-400 font-medium">
                  <KeyRound className="w-3.5 h-3.5" /> Secure Session
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
