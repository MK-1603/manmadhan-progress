"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../../components/auth/auth-context";

function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { verifyOtp } = useAuth();
  const router = useRouter();
  
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push("/");
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setLoading(true);
    setError("");
    try {
      await verifyOtp(token, otp);
      // Redirection is handled in the context
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="p-8 max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Verify Authentication Code</h2>
        <p className="text-slate-400 mb-6 text-center text-sm">
          We've sent a 6-digit code to your email.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-3 text-center text-2xl tracking-widest focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            maxLength={6}
            required
          />
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Verify Code"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">Loading...</div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}
