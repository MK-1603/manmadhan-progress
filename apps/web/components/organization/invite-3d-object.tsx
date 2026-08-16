"use client";

import React from "react";
import { motion } from "framer-motion";
import { UserPlus, Shield, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";

export function Invite3dObject() {
  return (
    <div className="w-full h-[120px] rounded-[14px] bg-[#F8F9FA]/80 dark:bg-[#07090D]/80 border border-[#E5E7EB] dark:border-[#272D36] p-3 flex items-center justify-between relative overflow-hidden select-none shadow-xs group">
      
      {/* Background Subtle Grid Effect */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[radial-gradient(#B28D18_1px,transparent_1px)] dark:bg-[radial-gradient(#C9A52A_1px,transparent_1px)] [background-size:12px_12px]" />

      {/* Left Content / Meta */}
      <div className="space-y-1 z-10 max-w-[170px]">
        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#B28D18] dark:text-[#C9A52A]">
          <Sparkles className="w-3 h-3" />
          <span>Team Dispatch</span>
        </div>
        <h4 className="font-bold text-[13px] text-[#17202A] dark:text-[#F2F4F7] leading-tight">
          Organization Node
        </h4>
        <p className="text-[10.5px] text-[#667085] dark:text-[#8B95A5] leading-snug">
          Direct assignment & role-based RBAC invitation.
        </p>
      </div>

      {/* Right 3D Animated Node Illustration */}
      <div className="relative w-[110px] h-[90px] flex items-center justify-center z-10 shrink-0">
        
        {/* Outer Connection Rings */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute w-[80px] h-[80px] rounded-full border border-dashed border-[#B28D18]/30 dark:border-[#C9A52A]/30 pointer-events-none"
        />

        {/* Central 3D Card Surface */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-[74px] h-[52px] rounded-[12px] bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA] dark:from-[#15191F] dark:to-[#0B0D10] border border-[#B28D18]/40 dark:border-[#C9A52A]/40 shadow-lg flex flex-col items-center justify-center p-1.5 text-center relative group-hover:border-[#B28D18] dark:group-hover:border-[#C9A52A] transition-colors"
        >
          {/* Top Gold Accent Bar */}
          <div className="w-6 h-1 rounded-full bg-[#B28D18] dark:bg-[#C9A52A] mb-1 opacity-80" />
          
          <div className="flex items-center gap-1 text-[9.5px] font-extrabold text-[#B28D18] dark:text-[#C9A52A] tracking-wider">
            <UserPlus className="w-3 h-3 stroke-[2.5]" />
            <span>INVITE</span>
          </div>
          
          <span className="text-[7.5px] font-mono text-[#667085] dark:text-[#8B95A5] uppercase">NODE +</span>
        </motion.div>

        {/* Floating Side Nodes */}
        <motion.div
          animate={{ x: [0, -3, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-0 top-3 w-5 h-5 rounded-full bg-[#B28D18]/15 dark:bg-[#C9A52A]/15 border border-[#B28D18]/40 dark:border-[#C9A52A]/40 flex items-center justify-center text-[#B28D18] dark:text-[#C9A52A]"
        >
          <Shield className="w-2.5 h-2.5" />
        </motion.div>

        <motion.div
          animate={{ x: [0, 3, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-0 bottom-3 w-5 h-5 rounded-full bg-[#B28D18]/15 dark:bg-[#C9A52A]/15 border border-[#B28D18]/40 dark:border-[#C9A52A]/40 flex items-center justify-center text-[#B28D18] dark:text-[#C9A52A]"
        >
          <CheckCircle2 className="w-2.5 h-2.5" />
        </motion.div>
      </div>
    </div>
  );
}
