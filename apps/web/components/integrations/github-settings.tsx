"use client";

import React, { useState, useEffect } from "react";
import { GitBranch, CheckCircle2, AlertCircle, RefreshCw, Key, ExternalLink } from "lucide-react";
import apiClient from "@/lib/api-client";

export function DualGitHubSettings() {
  const [accounts, setAccounts] = useState<{ accountA: any; accountB: any }>({ accountA: null, accountB: null });
  const [activeSlot, setActiveSlot] = useState<"ACCOUNT_A" | "ACCOUNT_B">("ACCOUNT_A");
  const [tokenInput, setTokenInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      const res = await apiClient.get("/github/accounts");
      if (res.data?.success && res.data.data) {
        setAccounts(res.data.data);
      }
    } catch (e) {
      console.error("Failed to fetch GitHub accounts:", e);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleConnect = async () => {
    if (!usernameInput.trim() || !tokenInput.trim()) {
      setError("Please provide both your GitHub Username and Personal Access Token.");
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const res = await apiClient.post("/github/connect-account", {
        accountSlot: activeSlot,
        username: usernameInput.trim(),
        token: tokenInput.trim(),
      });

      if (res.data?.success) {
        setSuccessMsg(`Successfully connected ${activeSlot === "ACCOUNT_A" ? "GitHub Account A" : "GitHub Account B"} (${usernameInput.trim()})`);
        setTokenInput("");
        setUsernameInput("");
        await fetchAccounts();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to connect GitHub account.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async (slot: "ACCOUNT_A" | "ACCOUNT_B") => {
    try {
      await apiClient.post("/github/disconnect-account", { accountSlot: slot });
      await fetchAccounts();
    } catch (e) {
      console.error("Disconnect error:", e);
    }
  };

  return (
    <div className="bg-[#151515] border border-[#292929] rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-[#292929] pb-4">
        <div>
          <span className="text-[11px] font-semibold text-[#E3AA18] uppercase tracking-wider">Dual GitHub Integration Engine</span>
          <h2 className="text-base font-semibold text-[#F5F5F5] flex items-center gap-2 mt-0.5">
            <GitBranch className="w-4 h-4 text-[#E3AA18]" />
            GitHub Dual Account Management
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ACCOUNT A CARD */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${accounts.accountA ? "bg-[#65C466]/5 border-[#65C466]/30" : "bg-[#111111] border-[#292929]"}`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#F5F5F5]">GitHub Account A</span>
              <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${accounts.accountA ? "bg-[#65C466]/10 text-[#65C466] border border-[#65C466]/20" : "bg-[#242424] text-[#858585]"}`}>
                {accounts.accountA ? "CONNECTED" : "NOT CONNECTED"}
              </span>
            </div>

            {accounts.accountA ? (
              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-[#F5F5F5] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#65C466]" />
                  @{accounts.accountA.username}
                </p>
                <p className="text-[#858585] text-[11px]">
                  Last synced: {accounts.accountA.lastSyncAt ? new Date(accounts.accountA.lastSyncAt).toLocaleString() : "Just now"}
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#858585]">Primary developer account for repository synchronization and PR evidence.</p>
            )}
          </div>

          {accounts.accountA ? (
            <button
              onClick={() => handleDisconnect("ACCOUNT_A")}
              className="w-full py-2 rounded-xl border border-[#E05252]/20 text-[#E05252] hover:bg-[#E05252]/10 text-xs font-semibold transition-colors"
            >
              Disconnect Account A
            </button>
          ) : (
            <button
              onClick={() => setActiveSlot("ACCOUNT_A")}
              className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors ${activeSlot === "ACCOUNT_A" ? "bg-[#E3AA18] text-[#0A0A0A]" : "border border-[#2A2A2A] text-[#BDBDBD] hover:text-[#F5F5F5]"}`}
            >
              Select to Connect Account A
            </button>
          )}
        </div>

        {/* ACCOUNT B CARD */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${accounts.accountB ? "bg-[#65C466]/5 border-[#65C466]/30" : "bg-[#111111] border-[#292929]"}`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#F5F5F5]">GitHub Account B</span>
              <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${accounts.accountB ? "bg-[#65C466]/10 text-[#65C466] border border-[#65C466]/20" : "bg-[#242424] text-[#858585]"}`}>
                {accounts.accountB ? "CONNECTED" : "NOT CONNECTED"}
              </span>
            </div>

            {accounts.accountB ? (
              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-[#F5F5F5] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#65C466]" />
                  @{accounts.accountB.username}
                </p>
                <p className="text-[#858585] text-[11px]">
                  Last synced: {accounts.accountB.lastSyncAt ? new Date(accounts.accountB.lastSyncAt).toLocaleString() : "Just now"}
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#858585]">Secondary organization / work account for isolated project bindings.</p>
            )}
          </div>

          {accounts.accountB ? (
            <button
              onClick={() => handleDisconnect("ACCOUNT_B")}
              className="w-full py-2 rounded-xl border border-[#E05252]/20 text-[#E05252] hover:bg-[#E05252]/10 text-xs font-semibold transition-colors"
            >
              Disconnect Account B
            </button>
          ) : (
            <button
              onClick={() => setActiveSlot("ACCOUNT_B")}
              className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors ${activeSlot === "ACCOUNT_B" ? "bg-[#E3AA18] text-[#0A0A0A]" : "border border-[#2A2A2A] text-[#BDBDBD] hover:text-[#F5F5F5]"}`}
            >
              Select to Connect Account B
            </button>
          )}
        </div>
      </div>

      {/* CONNECT FORM */}
      <div className="p-5 rounded-2xl bg-[#111111] border border-[#292929] space-y-4">
        <h3 className="text-[12px] font-semibold text-[#D6D6D6] uppercase tracking-[0.06em] flex items-center gap-2">
          <Key className="w-4 h-4 text-[#E3AA18]" />
          CONNECT {activeSlot === "ACCOUNT_A" ? "GITHUB ACCOUNT A" : "GITHUB ACCOUNT B"} CREDENTIALS
        </h3>

        {error && (
          <div className="p-3 rounded-xl bg-[#E05252]/10 border border-[#E05252]/20 text-[#E05252] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-[#65C466]/10 border border-[#65C466]/20 text-[#65C466] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#D6D6D6] uppercase tracking-[0.06em] mb-1.5">
              GITHUB USERNAME
            </label>
            <input
              type="text"
              placeholder="e.g. octocat"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#151515] border border-[#2A2A2A] text-sm text-[#F5F5F5] placeholder-[#777777] focus:outline-none focus:border-[#E3AA18]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#D6D6D6] uppercase tracking-[0.06em] mb-1.5">
              PERSONAL ACCESS TOKEN (REPO SCOPE)
            </label>
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#151515] border border-[#2A2A2A] text-sm text-[#F5F5F5] placeholder-[#777777] focus:outline-none focus:border-[#E3AA18]"
            />
          </div>
        </div>

        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="w-full py-2.5 rounded-xl bg-[#E3AA18] hover:bg-[#F0BC2B] text-[#0A0A0A] text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          {isLoading ? (
            <span>Verifying Credentials & Binding Account...</span>
          ) : (
            <>
              <GitBranch className="w-3.5 h-3.5" />
              Connect {activeSlot === "ACCOUNT_A" ? "Account A" : "Account B"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
