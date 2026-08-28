"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  GitBranch, CheckCircle2, AlertCircle, RefreshCw,
  ExternalLink, Shield, Loader2, Unlink, Github, Plus
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
  const [accounts, setAccounts] = useState<{ accountA: GitHubAccount | null; accountB: GitHubAccount | null }>({
    accountA: null,
    accountB: null,
  });
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<"ACCOUNT_A" | "ACCOUNT_B">("ACCOUNT_A");
  const [selectedRepo, setSelectedRepo] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [branches, setBranches] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [projectGithub, setProjectGithub] = useState<any>(null);
  const [showSecondarySlot, setShowSecondarySlot] = useState(false);

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
    const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") || "" : "";
    const returnUrl = typeof window !== "undefined" ? window.location.href : "";
    const state = encodeURIComponent(JSON.stringify({ slot, workspaceId: wsId, returnUrl }));
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/v1\/?$/, "");
    const targetUrl = apiBase
      ? `${apiBase}/api/v1/github/oauth/start?slot=${slot}&state=${state}`
      : `/api/v1/github/oauth/start?slot=${slot}&state=${state}`;
    window.location.href = targetUrl;
  };

  const loadRepos = async (slot: "ACCOUNT_A" | "ACCOUNT_B") => {
    setLoadingRepos(true);
    setError(null);
    setRepos([]);
    try {
      const res = await apiClient.get(`/github/repos?slot=${slot}`);
      if (res.data?.success) setRepos(res.data.data || []);
      else setError(res.data?.error || "Could not load repositories.");
    } catch (e: any) {
      setError(e.response?.data?.error || "Could not load repositories.");
    } finally {
      setLoadingRepos(false);
    }
  };

  const loadBranches = async (repoFullName: string) => {
    setBranches([]);
    try {
      const res = await apiClient.get(`/github/branches?slot=${selectedSlot}&repo=${encodeURIComponent(repoFullName)}`);
      if (res.data?.success) setBranches(res.data.data || ["main"]);
    } catch {
      setBranches(["main"]);
    }
  };

  const handleRepoSelect = (repoFullName: string) => {
    setSelectedRepo(repoFullName);
    loadBranches(repoFullName);
  };

  const handleConnectRepo = async () => {
    if (!selectedRepo) {
      setError("Please select a repository.");
      return;
    }
    setConnecting(true);
    setError(null);
    setSuccess(null);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
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
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (slot: "ACCOUNT_A" | "ACCOUNT_B") => {
    try {
      await apiClient.post("/github/disconnect-account", { accountSlot: slot });
      await fetchAccounts();
    } catch {}
  };

  const primaryAccount = accounts.accountA || accounts.accountB;
  const activeAccount = selectedSlot === "ACCOUNT_A" ? accounts.accountA : accounts.accountB;

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px] p-4 sm:p-5 space-y-4 text-[#17202A] dark:text-[#F2F4F7] font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-3">
        <div className="flex items-center gap-2.5">
          <Github className="w-4 h-4 text-[#C9A52A] dark:text-[#D4B12F]" />
          <div>
            <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em] block">
              GitHub Repository Connection
            </span>
            <h2 className="text-[14px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
              Source Control & Development Activity
            </h2>
          </div>
        </div>

        {!accounts.accountB && (
          <button
            type="button"
            onClick={() => setShowSecondarySlot(!showSecondarySlot)}
            className="text-[11.5px] font-semibold text-[#C9A52A] dark:text-[#D4B12F] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add GitHub Account
          </button>
        )}
      </div>

      {/* Security Notice */}
      <div className="flex items-start gap-2.5 p-3 rounded-[9px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[12px]">
        <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-[#667085] dark:text-[#8B95A5]">
          <p className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">Secure GitHub OAuth Authorization</p>
          <p>Authorizes via GitHub OAuth. ManMadhan Progress connects to authorized repositories without storing tokens locally.</p>
        </div>
      </div>

      {/* Active Repository Connection Status */}
      {projectGithub ? (
        <div className="p-4 rounded-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 space-y-2 text-[12.5px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4.5 h-4.5" />
              <span>Repository Connected</span>
            </div>
            <a
              href={`https://github.com/${projectGithub.repositoryName || projectGithub.repository}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold underline hover:opacity-80"
            >
              Open Repository <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 font-mono text-[12px] text-[#17202A] dark:text-[#F2F4F7]">
            <div>
              <span className="text-[10px] text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block font-sans">Repository</span>
              <span className="font-bold">{projectGithub.repositoryName || projectGithub.repository || "—"}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block font-sans">Branch</span>
              <span className="font-bold">{projectGithub.branch || "main"}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block font-sans">Status</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">● Synchronized</span>
            </div>
          </div>
        </div>
      ) : primaryAccount ? (
        <div className="p-4 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Authorized GitHub Account</p>
              <p className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> @{primaryAccount.username}
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadRepos(selectedSlot)}
              className="px-3 h-[32px] rounded-[7px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[11.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-1 hover:bg-[#F3F4F6] cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Load Repositories
            </button>
          </div>

          {loadingRepos ? (
            <div className="flex items-center gap-2 py-2 text-[12px] text-[#667085] dark:text-[#8B95A5]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9A52A] dark:text-[#D4B12F]" /> Fetching repositories from @{primaryAccount.username}…
            </div>
          ) : repos.length > 0 ? (
            <div className="space-y-2 pt-1">
              <label className="block text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Select Repository to Bind</label>
              <select
                value={selectedRepo}
                onChange={(e) => handleRepoSelect(e.target.value)}
                className="w-full h-[40px] px-3.5 rounded-[9px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
              >
                <option value="">Choose a repository…</option>
                {repos.map((r: any) => (
                  <option key={r.full_name || r.id} value={r.full_name}>{r.full_name}</option>
                ))}
              </select>

              {selectedRepo && branches.length > 0 && (
                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider mb-1">Target Branch</label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full h-[40px] px-3.5 rounded-[9px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
                  >
                    {branches.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">Click &ldquo;Load Repositories&rdquo; to choose a repository for this project.</p>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-center space-y-3">
          <Github className="w-8 h-8 text-[#C9A52A] dark:text-[#D4B12F] mx-auto opacity-80" />
          <div>
            <h3 className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Connect GitHub Account</h3>
            <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] max-w-sm mx-auto mt-0.5">
              Authorize ManMadhan Progress via GitHub OAuth to connect repositories and sync development activity.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOAuthConnect("ACCOUNT_A")}
            className="inline-flex items-center gap-2 px-5 h-[40px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <ExternalLink className="w-4 h-4" /> Connect GitHub
          </button>
        </div>
      )}

      {/* Banners */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[12px]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[12px]">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />{success}
        </div>
      )}

      {/* Connect Repo Button */}
      {selectedRepo && primaryAccount && (
        <button
          type="button"
          onClick={handleConnectRepo}
          disabled={connecting}
          className="flex items-center gap-2 px-4 h-[40px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
        >
          {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
          {connecting ? "Connecting…" : `Connect ${selectedRepo}`}
        </button>
      )}
    </div>
  );
}
