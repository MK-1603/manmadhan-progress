"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, User, Mail, Calendar, Folder, CheckSquare, Clock, Users, AlertTriangle, CheckCircle2, ShieldCheck, Briefcase, Activity, FileText
} from "lucide-react";
import Link from "next/link";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

interface PersonDetailDrawerProps {
  person: any | null;
  onClose: () => void;
}

export function PersonDetailDrawer({ person, onClose }: PersonDetailDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  useBodyScrollLock(!!person);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key press
  useEffect(() => {
    if (!person) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedTask) {
          setSelectedTask(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [person, selectedTask, onClose]);

  if (!person || !mounted) return null;

  const role = (person.role || "MEMBER").toUpperCase();
  const isCeo = role === "CEO";
  const isCoCeo = role.includes("CO");
  const isPendingInvite = (person.status || "").toUpperCase().includes("PENDING") || (person.status || "").toUpperCase() === "SENT";

  const recentWork = Array.isArray(person.recentWork) ? person.recentWork : [];

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] select-none">
        
        {/* BackdropScrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          onTouchMove={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-[1px] z-[60]"
        />

        {/* 1. DESKTOP CENTERED MODAL (≥ 768px) */}
        <div className="hidden md:flex fixed inset-0 z-[70] items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="w-full max-w-[560px] max-h-[min(760px,calc(100vh-48px))] rounded-[20px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] shadow-2xl flex flex-col overflow-hidden text-[#17202A] dark:text-[#F2F4F7] pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-4 border-b border-[#E5E7EB] dark:border-[#272D36] shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-full bg-[#B28D18]/15 dark:bg-[#C9A52A]/15 text-[#B28D18] dark:text-[#C9A52A] border border-[#B28D18]/30 font-bold text-base flex items-center justify-center shrink-0">
                  {(person.name || person.displayName || "U").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h3 className="text-[17px] font-bold text-[#17202A] dark:text-[#F2F4F7] truncate leading-tight">
                    {person.name || person.displayName || "Member"}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 text-[#B28D18] dark:text-[#C9A52A] border border-[#B28D18]/20 dark:border-[#C9A52A]/20">
                      {person.role || "Member"}
                    </span>
                    <span className={`text-[11px] font-medium flex items-center gap-1 ${
                      isPendingInvite
                        ? "text-amber-600 dark:text-amber-400"
                        : person.status === "ACTIVE"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isPendingInvite
                          ? "bg-amber-500 animate-pulse"
                          : person.status === "ACTIVE"
                          ? "bg-emerald-500 animate-pulse"
                          : "bg-rose-500"
                      }`} />
                      {isPendingInvite ? "Pending Invitation" : person.status || "Active"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                aria-label="Close modal"
                className="p-1.5 text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#07090D] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div data-scrollable="true" className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
              
              {/* REPORTS TO SECTION */}
              <div className="p-3.5 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[12px] space-y-1 text-[12.5px]">
                <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">REPORTS TO</span>
                <p className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  {isCeo
                    ? "Organization Founder / Head"
                    : isCoCeo
                    ? "Sai Krishnan · CEO"
                    : person.managerName
                    ? `${person.managerName} · CO-CEO`
                    : "Organization Leadership"}
                </p>
              </div>

              {/* WORK SUMMARY */}
              <div className="space-y-2">
                <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">WORK</span>
                <div className="grid grid-cols-2 gap-2.5 text-[12px]">
                  <div className="p-3.5 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] space-y-0.5">
                    <span className="text-[10px] text-[#667085] dark:text-[#8B95A5] uppercase block font-medium">Active Projects</span>
                    <span className="text-[20px] font-mono font-extrabold text-[#B28D18] dark:text-[#C9A52A]">{person.projectsCount ?? 0}</span>
                  </div>
                  <div className="p-3.5 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] space-y-0.5">
                    <span className="text-[10px] text-[#667085] dark:text-[#8B95A5] uppercase block font-medium">Assigned Tasks</span>
                    <span className="text-[20px] font-mono font-extrabold text-[#17202A] dark:text-[#F2F4F7]">{person.tasksCount ?? 0}</span>
                  </div>
                  <div className="p-3.5 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] space-y-0.5">
                    <span className="text-[10px] text-[#667085] dark:text-[#8B95A5] uppercase block font-medium">Completed</span>
                    <span className="text-[20px] font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{person.completedTasks ?? 0}</span>
                  </div>
                  <div className="p-3.5 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] space-y-0.5">
                    <span className="text-[10px] text-[#667085] dark:text-[#8B95A5] uppercase block font-medium">Overdue</span>
                    <span className="text-[20px] font-mono font-extrabold text-rose-600 dark:text-rose-400">{person.overdueTasks ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* TODAY SUMMARY */}
              <div className="space-y-2">
                <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">TODAY</span>
                <div className="grid grid-cols-2 gap-2.5 text-[12px]">
                  <div className="p-3 rounded-[10px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-between">
                    <span className="text-[#667085] dark:text-[#8B95A5]">Focus Time:</span>
                    <span className="font-mono font-bold text-[#17202A] dark:text-[#F2F4F7]">{person.focusTime ?? "0h 0m"}</span>
                  </div>
                  <div className="p-3 rounded-[10px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-between">
                    <span className="text-[#667085] dark:text-[#8B95A5]">Sessions:</span>
                    <span className="font-mono font-bold text-[#17202A] dark:text-[#F2F4F7]">{person.sessionsCount ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* PERFORMANCE SCORE */}
              <div className="space-y-2">
                <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">PERFORMANCE</span>
                <div className="grid grid-cols-2 gap-2.5 text-[12px]">
                  <div className="p-3 rounded-[10px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-between">
                    <span className="text-[#667085] dark:text-[#8B95A5]">On-Time:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{person.onTimeRate ? `${person.onTimeRate}%` : "—"}</span>
                  </div>
                  <div className="p-3 rounded-[10px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-between">
                    <span className="text-[#667085] dark:text-[#8B95A5]">Approval:</span>
                    <span className="font-mono font-bold text-[#B28D18] dark:text-[#C9A52A]">{person.approvalRate ? `${person.approvalRate}%` : "—"}</span>
                  </div>
                </div>
              </div>

              {/* RECENT WORK */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">RECENT WORK</span>
                  <Link href="/ceo/tasks" onClick={onClose} className="text-[11px] font-bold text-[#B28D18] dark:text-[#C9A52A] hover:underline">
                    View all work →
                  </Link>
                </div>

                <div className="space-y-2">
                  {recentWork.map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedTask(item)}
                      className="p-3 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] hover:border-[#B28D18]/50 dark:hover:border-[#C9A52A]/50 transition-colors cursor-pointer space-y-1.5 text-[12px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#17202A] dark:text-[#F2F4F7] truncate max-w-[280px]">{item.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                          item.status === "Completed"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10.5px] text-[#667085] dark:text-[#8B95A5]">
                        <span>Project: {item.projectName}</span>
                        <span>Due: {item.deadline}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-between text-[11.5px] shrink-0 bg-[#F9FAFB] dark:bg-[#111419]">
              <div className="flex items-center gap-1.5 text-[#667085] dark:text-[#8B95A5]">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate max-w-[220px]">{person.email}</span>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] font-bold text-[12px] rounded-[9px] hover:brightness-105 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>

        {/* 2. MOBILE BOTTOM SHEET (< 768px) */}
        <div className="md:hidden fixed inset-x-0 bottom-0 z-[70] flex flex-col justify-end pointer-events-none">
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="w-full max-h-[85dvh] rounded-t-[22px] bg-[#FFFFFF] dark:bg-[#15191F] border-t border-[#E5E7EB] dark:border-[#272D36] shadow-2xl flex flex-col overflow-hidden text-[#17202A] dark:text-[#F2F4F7] pointer-events-auto pb-[max(16px,env(safe-area-inset-bottom))]"
          >
            {/* Mobile Sheet Handle */}
            <div className="w-full flex justify-center pt-2.5 pb-1 shrink-0">
              <div className="w-9 h-1 rounded-full bg-[#E5E7EB] dark:bg-[#272D36]" />
            </div>

            {/* Mobile Header */}
            <div className="flex items-center justify-between p-4 pb-3 border-b border-[#E5E7EB] dark:border-[#272D36] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#B28D18]/15 dark:bg-[#C9A52A]/15 text-[#B28D18] dark:text-[#C9A52A] border border-[#B28D18]/30 font-bold text-sm flex items-center justify-center shrink-0">
                  {(person.name || person.displayName || "U").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7] truncate leading-tight">
                    {person.name || person.displayName || "Member"}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 text-[#B28D18] dark:text-[#C9A52A] border border-[#B28D18]/20 dark:border-[#C9A52A]/20">
                      {person.role || "Member"}
                    </span>
                    <span className={`text-[10.5px] font-medium flex items-center gap-1 ${
                      isPendingInvite
                        ? "text-amber-600 dark:text-amber-400"
                        : person.status === "ACTIVE"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isPendingInvite
                          ? "bg-amber-500 animate-pulse"
                          : person.status === "ACTIVE"
                          ? "bg-emerald-500 animate-pulse"
                          : "bg-rose-500"
                      }`} />
                      {isPendingInvite ? "Pending Invitation" : person.status || "Active"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                aria-label="Close sheet"
                className="p-1.5 text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Scrollable Sheet Content */}
            <div data-scrollable="true" className="flex-1 overflow-y-auto overscroll-contain touch-pan-y p-5 pt-3 space-y-4">
              
              {/* REPORTS TO SECTION */}
              <div className="p-3 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[12px] space-y-1 text-[12px]">
                <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">REPORTS TO</span>
                <p className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  {isCeo
                    ? "Organization Founder / Head"
                    : isCoCeo
                    ? "Sai Krishnan · CEO"
                    : person.managerName
                    ? `${person.managerName} · CO-CEO`
                    : "Organization Leadership"}
                </p>
              </div>

              {/* WORK SUMMARY */}
              <div className="space-y-2">
                <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">WORK</span>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="p-3 rounded-[10px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] space-y-0.5">
                    <span className="text-[9.5px] text-[#667085] dark:text-[#8B95A5] uppercase block font-medium">Active Projects</span>
                    <span className="text-[18px] font-mono font-extrabold text-[#B28D18] dark:text-[#C9A52A]">{person.projectsCount ?? 0}</span>
                  </div>
                  <div className="p-3 rounded-[10px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] space-y-0.5">
                    <span className="text-[9.5px] text-[#667085] dark:text-[#8B95A5] uppercase block font-medium">Assigned Tasks</span>
                    <span className="text-[18px] font-mono font-extrabold text-[#17202A] dark:text-[#F2F4F7]">{person.tasksCount ?? 0}</span>
                  </div>
                  <div className="p-3 rounded-[10px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] space-y-0.5">
                    <span className="text-[9.5px] text-[#667085] dark:text-[#8B95A5] uppercase block font-medium">Completed</span>
                    <span className="text-[18px] font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{person.completedTasks ?? 0}</span>
                  </div>
                  <div className="p-3 rounded-[10px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] space-y-0.5">
                    <span className="text-[9.5px] text-[#667085] dark:text-[#8B95A5] uppercase block font-medium">Overdue</span>
                    <span className="text-[18px] font-mono font-extrabold text-rose-600 dark:text-rose-400">{person.overdueTasks ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* TODAY SUMMARY */}
              <div className="space-y-2">
                <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">TODAY</span>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="p-3 rounded-[10px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-between">
                    <span className="text-[#667085] dark:text-[#8B95A5]">Focus Time:</span>
                    <span className="font-mono font-bold text-[#17202A] dark:text-[#F2F4F7]">{person.focusTime ?? "0h 0m"}</span>
                  </div>
                  <div className="p-3 rounded-[10px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-between">
                    <span className="text-[#667085] dark:text-[#8B95A5]">Sessions:</span>
                    <span className="font-mono font-bold text-[#17202A] dark:text-[#F2F4F7]">{person.sessionsCount ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* PERFORMANCE SCORE */}
              <div className="space-y-2">
                <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">PERFORMANCE</span>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="p-3 rounded-[10px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-between">
                    <span className="text-[#667085] dark:text-[#8B95A5]">On-Time:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{person.onTimeRate ? `${person.onTimeRate}%` : "—"}</span>
                  </div>
                  <div className="p-3 rounded-[10px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-between">
                    <span className="text-[#667085] dark:text-[#8B95A5]">Approval:</span>
                    <span className="font-mono font-bold text-[#B28D18] dark:text-[#C9A52A]">{person.approvalRate ? `${person.approvalRate}%` : "—"}</span>
                  </div>
                </div>
              </div>

              {/* RECENT WORK */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">RECENT WORK</span>
                  <Link href="/ceo/tasks" onClick={onClose} className="text-[11px] font-bold text-[#B28D18] dark:text-[#C9A52A] hover:underline">
                    View all work →
                  </Link>
                </div>

                <div className="space-y-2">
                  {recentWork.map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedTask(item)}
                      className="p-3 rounded-[10px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] hover:border-[#B28D18]/50 dark:hover:border-[#C9A52A]/50 transition-colors cursor-pointer space-y-1 text-[12px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#17202A] dark:text-[#F2F4F7] truncate max-w-[220px]">{item.title}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          item.status === "Completed"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#667085] dark:text-[#8B95A5]">
                        <span>Project: {item.projectName}</span>
                        <span>Due: {item.deadline}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Mobile Sheet Footer */}
            <div className="p-3.5 border-t border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-between text-[11px] shrink-0 bg-[#F9FAFB] dark:bg-[#111419]">
              <div className="flex items-center gap-1.5 text-[#667085] dark:text-[#8B95A5]">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate max-w-[180px]">{person.email}</span>
              </div>
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] font-bold text-[11.5px] rounded-[8px] hover:brightness-105 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>

        {/* Task Detail Inspection Modal */}
        <AnimatePresence>
          {selectedTask && (
            <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-[#15191F] border border-[#272D36] rounded-[18px] p-5 space-y-4 text-[#F2F4F7] shadow-2xl"
              >
                <div className="flex items-start justify-between border-b border-[#272D36] pb-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A52A] block">
                      TASK INSPECTION
                    </span>
                    <h4 className="text-[15px] font-bold leading-snug">{selectedTask.title}</h4>
                  </div>
                  <button onClick={() => setSelectedTask(null)} className="p-1 text-[#8B95A5] hover:text-[#F2F4F7]">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5 text-[12.5px]">
                  <div className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#07090D] border border-[#272D36]">
                    <span className="text-[#8B95A5]">Project:</span>
                    <span className="font-semibold">{selectedTask.projectName}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#07090D] border border-[#272D36]">
                    <span className="text-[#8B95A5]">Assigned to:</span>
                    <span className="font-semibold">{selectedTask.assignedTo || person.name}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#07090D] border border-[#272D36]">
                    <span className="text-[#8B95A5]">Supervisor:</span>
                    <span className="font-semibold">{selectedTask.supervisor}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-[10px] bg-[#07090D] border border-[#272D36] space-y-0.5">
                      <span className="text-[10px] text-[#8B95A5] uppercase block">Priority</span>
                      <span className="font-bold text-[#C9A52A]">{selectedTask.priority}</span>
                    </div>
                    <div className="p-2.5 rounded-[10px] bg-[#07090D] border border-[#272D36] space-y-0.5">
                      <span className="text-[10px] text-[#8B95A5] uppercase block">Deadline</span>
                      <span className="font-bold text-[#F2F4F7]">{selectedTask.deadline}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#07090D] border border-[#272D36]">
                    <span className="text-[#8B95A5]">Approval State:</span>
                    <span className="font-bold text-emerald-400">{selectedTask.approvalStatus || "Approved"}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#272D36] flex justify-end">
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="px-4 py-2 rounded-[9px] bg-[#C9A52A] text-[#0B0D10] font-bold text-[12px] cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </AnimatePresence>,
    document.body
  );
}
