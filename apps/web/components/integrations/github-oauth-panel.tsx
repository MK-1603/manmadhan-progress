"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  GitBranch, CheckCircle2, AlertCircle, RefreshCw,
  ExternalLink, Shield, Loader2, Unlink,
} from "lucide-react";
import apiClient from "@/lib/api-client";

interface GitHubOAuthPanelProps {
  projectId: string;
  project: any;
}

interface GitHubAccount {
  id: string;
  slot: "ACCOUNT_A" | "ACCOUNT_B";
  username: string;
  avatarUrl?: string;
  connectedAt?: string;
  lastSyncAt?: string;
}

export function GitHubOAuthPanel({ projectId, project }: GitHubOAuthPanelProps) {
  const [accounts, setAccounts]             = useState<{ accountA: GitHubAccount | null; accountB: GitHubAccount | null }>({ accountA: null, accountB: null });
  const [repos, setRepos]                   = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot]     = useState<"ACCOUNT_A" | "ACCOUNT_B">("ACCOUNT_A");
  const [selectedRepo, setSelectedRepo]     = useState("");
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [branches, setBranches]             = useState<string[]>([]);
  const [connecting, setConnecting]         = useState(false);
  const [loadingRepos, setLoadingRepos]     = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [success, setSuccess]               = useState<string | null>(null);
  const [projectGithub, setProjectGithub]   = useState<any>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await apiClient.get("/github/accounts");
      if (res.data?.success) setAccounts(res.data.data);
    } catch {}
  }, []);

  const fetchProjectGithub = useCallback(async () => {
    try {
      const res = await apiClient.get(`/org/projects/${projectId}`);
      if (res.data?.success) setProjectGithub(res.data.data?.github || null);
    } catch {}
  }, [projectId]);

  useEffect(() => {
    fetchAccounts();
    fetchProjectGithub();
  }, [fetchAccounts, fetchProjectGithub]);

  const handleOAuthConnect = (slot: "ACCOUNT_A" | "ACCOUNT_B") => {
    // Initiate GitHub OAuth flow — redirects to GitHub, returns via callback
    const wsId = localStorage.getItem("workspaceId") || "";
    const state = encodeURIComponent(JSON.stringify({ slot, workspaceId: wsId, returnUrl: window.location.href }));
    window.location.href = `/api/v1/github/oauth/start?slot=${slot}&state=${state}`;
  };

  const loadRepos = async (slot: "ACCOUNT_A" | "ACCOUNT_B") => {
    setLoadingRepos(true); setError(null); setRepos([]);
    try {
      const res = await apiClient.get(`/github/repos?slot=${slot}`);
      if (res.data?.success) setRepos(res.data.data || []);
      else setError(res.data?.error || "Could not load repositories.");
    } catch (e: any) {
      setError(e.response?.data?.error || "Could not load repositories.");
    } finally { setLoadingRepos(false); }
  };

  const loadBranches = async (repoFullName: string) => {
    setBranches([]);
    try {
      const res = await apiClient.get(`/github/branches?slot=${selectedSlot}&repo=${encodeURIComponent(repoFullName)}`);
      if (res.data?.success) setBranches(res.data.data || ["main"]);
    } catch { setBranches(["main"]); }
  };

  const handleRepoSelect = (repoFullName: string) => {
    setSelectedRepo(repoFullName);
    loadBranches(repoFullName);
  };

  const handleConnectRepo = async () => {
    if (!selectedRepo) { setError("Please select a repository."); return; }
    setConnecting(true); setError(null); setSuccess(null);
    try {
      const wsId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(`/org/projects/${projectId}/github/connect`, {
        workspaceId: wsId,
        accountSlot: selectedSlot,
        repository: selectedRepo,
        branch: selectedBranch || "main",
      });
      if (res.data?.success) {
        setSuccess(`Repository ${selectedRepo} connected on branch ${selectedBranch}.`);
        fetchProjectGithub();
      } else {
        setError(res.data?.error || "Failed to connect repository.");
      }
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to connect repository.");
    } finally { setConnecting(false); }
  };

  const handleDisconnect = async (slot: "ACCOUNT_A" | "ACCOUNT_B") => {
    try {
      await apiClient.post("/github/disconnect-account", { accountSlot: slot });
      await fetchAccounts();
    } catch {}
  };

  const activeAccount = selectedSlot === "ACCOUNT_A" ? accounts.accountA : accounts.accountB;

  return (
    <div className="bg-[#151515] border border-[#292929] rounded-2xl p-6 space-y-6">

      {/* header */}
      <div className="flex items-center gap-3 border-b border-[#292929] pb-4">
        <GitBranch className="w-5 h-5 text-[#E3AA18]" />
        <div>
          <span className="text-[11px] font-semibold text-[#E3AA18] uppercase tracking-wider block">GitHub Integration</span>
          <h2 className="text-base font-semibold text-[#F5F5F5]">Connect Repository</h2>
        </div>
      </div>

      {/* security notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[#111111] border border-[#2A2A2A]">
        <Shield className="w-4 h-4 text-[#65C466] shrink-0 mt-0.5" />
        <div className="text-xs text-[#858585] space-y-0.5">
          <p className="font-semibold text-[#F5F5F5]">Secure GitHub OAuth Authorization</p>
          <p>ManMadhan Progress uses GitHub OAuth — you are never asked to type your GitHub password or personal access token into this application. Authorization happens securely on GitHub's own servers.</p>
        </div>
      </div>

      {/* existing project connection */}
      {projectGithub && (
        <div className="p-4 rounded-xl bg-[#65C466]/5 border border-[#65C466]/20 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#65C466]" />
            <span className="text-xs font-semibold text-[#65C466]">Repository Connected</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#858585] block text-[10px] uppercase tracking-wider">Repository</span>
              <span className="text-[#F5F5F5] font-semibold">{projectGithub.repositoryName || projectGithub.repository || "—"}</span>
            </div>
            <div>
              <span className="text-[#858585] block text-[10px] uppercase tracking-wider">Branch</span>
              <span className="text-[#F5F5F5] font-semibold">{projectGithub.branch || "main"}</span>
            </div>
          </div>
        </div>
      )}

      {/* slot selector */}
      <div className="space-y-3">
        <span className="text-[11px] font-semibold text-[#858585] uppercase tracking-widest block">Select GitHub Account</span>
        <div className="grid grid-cols-2 gap-3">
          {(["ACCOUNT_A", "ACCOUNT_B"] as const).map((slot) => {
            const acc = slot === "ACCOUNT_A" ? accounts.accountA : accounts.accountB;
            const label = slot === "ACCOUNT_A" ? "Account A" : "Account B";
            return (
              <div
                key={slot}
                className={`p-4 rounded-xl border space-y-3 transition-colors
                  ${acc ? "bg-[#65C466]/5 border-[#65C466]/20" : "bg-[#111111] border-[#2A2A2A]"}
                  ${selectedSlot === slot ? "ring-1 ring-[#E3AA18]" : ""}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#F5F5F5]">GitHub {label}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                    ${acc ? "bg-[#65C466]/10 text-[#65C466] border border-[#65C466]/20" : "bg-[#242424] text-[#858585]"}`}>
                    {acc ? "Connected" : "Not connected"}
                  </span>
                </div>

                {acc ? (
                  <p className="text-xs font-semibold text-[#F5F5F5] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#65C466]" /> @{acc.username}
                  </p>
                ) : (
                  <p className="text-[11px] text-[#858585]">Not connected. Click below to authorize via GitHub OAuth.</p>
                )}

                <div className="flex flex-col gap-2">
                  {acc ? (
                    <>
                      <button
                        type="button"
                        onClick={() => { setSelectedSlot(slot); loadRepos(slot); }}
                        className={`w-full py-2 rounded-xl text-[11px] font-semibold transition-colors
                          ${selectedSlot === slot ? "bg-[#E3AA18] text-[#0A0A0A]" : "border border-[#2A2A2A] text-[#BDBDBD] hover:bg-[#1D1D1D] hover:text-[#F5F5F5]"}`}
                      >
                        {selectedSlot === slot ? "Selected" : "Use This Account"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDisconnect(slot)}
                        className="w-full py-1.5 rounded-xl border border-[#E05252]/20 text-[#E05252] hover:bg-[#E05252]/10 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
                      >
                        <Unlink className="w-3 h-3" /> Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOAuthConnect(slot)}
                      className="w-full py-2 rounded-xl bg-[#E3AA18] hover:bg-[#F0BC2B] text-[#0A0A0A] text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Connect via GitHub OAuth
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* repo selector — only if account selected */}
      {activeAccount && (
        <div className="space-y-3 p-4 rounded-xl bg-[#111111] border border-[#2A2A2A]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#858585] uppercase tracking-widest">Select Repository</span>
            <button
              type="button"
              onClick={() => loadRepos(selectedSlot)}
              className="flex items-center gap-1 text-[11px] text-[#858585] hover:text-[#F5F5F5] transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          {loadingRepos ? (
            <div className="flex items-center gap-2 py-2 text-xs text-[#858585]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading repositories…
            </div>
          ) : repos.length > 0 ? (
            <select
              value={selectedRepo}
              onChange={e => handleRepoSelect(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#151515] border border-[#2A2A2A] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#E3AA18]"
            >
              <option value="">Choose a repository…</option>
              {repos.map((r: any) => (
                <option key={r.full_name || r.id} value={r.full_name}>{r.full_name}</option>
              ))}
            </select>
          ) : (
            <p className="text-[11px] text-[#858585]">Click Refresh to load repositories from @{activeAccount.username}.</p>
          )}

          {selectedRepo && branches.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-widest block mb-1.5">Branch</span>
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#151515] border border-[#2A2A2A] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#E3AA18]"
              >
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* error / success */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#E05252]/10 border border-[#E05252]/20 text-[#E05252] text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#65C466]/10 border border-[#65C466]/20 text-[#65C466] text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />{success}
        </div>
      )}

      {/* connect button */}
      {selectedRepo && (
        <button
          type="button"
          onClick={handleConnectRepo}
          disabled={connecting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E3AA18] hover:bg-[#F0BC2B] text-[#0A0A0A] text-xs font-bold transition-colors disabled:opacity-50"
        >
          {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
          {connecting ? "Connecting…" : `Connect ${selectedRepo}`}
        </button>
      )}
    </div>
  );
}
