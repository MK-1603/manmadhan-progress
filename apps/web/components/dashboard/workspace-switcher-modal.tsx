"use client";

import React, { useState, useEffect } from "react";
import { X, Building, User as UserIcon, Check, Info } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import apiClient from "@/lib/api-client";
import { AnimatePresence, motion } from "framer-motion";

interface WorkspaceSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitched?: (workspaceName: string) => void;
}

export function WorkspaceSwitcherModal({
  isOpen,
  onClose,
  onSwitched,
}: WorkspaceSwitcherModalProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const [orgWorkspace, setOrgWorkspace] = useState<any>(null);
  const [switching, setSwitching] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isPersonal = pathname?.startsWith("/personal");
  const userRole = (user?.role || "CEO").toUpperCase() as "CEO" | "CO_CEO" | "MEMBER";

  useEffect(() => {
    if (!isOpen) return;
    apiClient
      .get("/workspaces")
      .then((res) => {
        if (res.data.success && Array.isArray(res.data.data)) {
          const org = res.data.data.find(
            (w: any) => w.type !== "personal" && w.name !== "Personal Workspace"
          );
          if (org) setOrgWorkspace(org);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const realBatchId = orgWorkspace?.batchNumber || user?.batchNumber;
  const realOrgName = orgWorkspace?.name && orgWorkspace.name !== "Personal Workspace" ? orgWorkspace.name : undefined;
  const personalDisplayName = user?.displayName || user?.name || "Personal Workspace";

  const handleSwitch = (target: "personal" | "org") => {
    if (switching) return;
    setSwitching(true);

    const name = target === "personal" ? personalDisplayName : (realOrgName || "Organization Workspace");
    
    if (target === "personal") {
      localStorage.setItem("activeWorkspaceType", "personal");
      if (onSwitched) onSwitched("Personal Workspace");
      setToastMessage("Switched to Personal Workspace");
      setTimeout(() => {
        onClose();
        router.push("/personal/dashboard");
        setSwitching(false);
      }, 300);
    } else {
      localStorage.setItem("activeWorkspaceType", "organization");
      if (orgWorkspace?.id) {
        localStorage.setItem("workspaceId", orgWorkspace.id);
      }
      if (onSwitched) onSwitched(realOrgName || "Organization Workspace");
      setToastMessage(`Switched to ${realOrgName || "Organization Workspace"}`);
      setTimeout(() => {
        onClose();
        const targetDash =
          userRole.includes("CO")
            ? "/co-ceo/dashboard"
            : userRole.includes("MEMBER")
            ? "/member/dashboard"
            : "/ceo/dashboard";
        router.push(targetDash);
        setSwitching(false);
      }, 300);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Desktop Centered Modal / Mobile Bottom Sheet */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="relative w-full max-w-[460px] bg-card border border-border rounded-3xl shadow-2xl overflow-hidden z-10 p-5 space-y-4 font-sans text-xs text-foreground"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-extrabold text-foreground tracking-tight">
                Switch Workspace
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choose the workspace you want to use.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Toast feedback */}
          {toastMessage && (
            <div className="p-2.5 rounded-xl bg-[#C9A52A]/10 border border-[#C9A52A]/30 text-[#C9A52A] font-extrabold text-xs text-center animate-pulse">
              ✓ {toastMessage}
            </div>
          )}

          {/* Organization Workspace Group */}
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">
              ORGANIZATION WORKSPACE
            </span>

            <button
              type="button"
              onClick={() => handleSwitch("org")}
              className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                !isPersonal
                  ? "bg-[#C9A52A]/10 border-[#C9A52A]/40 text-foreground font-semibold shadow-xs"
                  : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border/80"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-xl border shrink-0 ${!isPersonal ? "bg-[#C9A52A]/20 border-[#C9A52A]/30 text-[#C9A52A]" : "bg-card border-border text-muted-foreground"}`}>
                  <Building className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-extrabold text-xs text-foreground truncate">
                    {realOrgName || "Organization Workspace"}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    Organization Workspace
                  </span>
                </div>
              </div>
              {!isPersonal && <Check className="w-4 h-4 text-[#C9A52A] shrink-0" />}
            </button>
          </div>

          {/* Personal Workspace Group */}
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">
              PERSONAL WORKSPACE
            </span>

            <button
              type="button"
              onClick={() => handleSwitch("personal")}
              className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                isPersonal
                  ? "bg-[#C9A52A]/10 border-[#C9A52A]/40 text-foreground font-semibold shadow-xs"
                  : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border/80"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-xl border shrink-0 ${isPersonal ? "bg-[#C9A52A]/20 border-[#C9A52A]/30 text-[#C9A52A]" : "bg-card border-border text-muted-foreground"}`}>
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-extrabold text-xs text-foreground truncate">
                    Personal Workspace
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    Private workspace
                  </span>
                </div>
              </div>
              {isPersonal && <Check className="w-4 h-4 text-[#C9A52A] shrink-0" />}
            </button>
          </div>

          {/* Footer Tip */}
          <div className="p-3 rounded-2xl bg-muted/50 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
            <Info className="w-4 h-4 text-[#C9A52A] shrink-0" />
            <span>Tip: Switch between your organization and personal workspace without leaving the application.</span>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
