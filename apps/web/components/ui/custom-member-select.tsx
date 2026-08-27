"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, Check, ChevronDown, User } from "lucide-react";

interface MemberOption {
  id: string;
  name?: string;
  displayName?: string;
  email: string;
  role?: string;
  avatar?: string | null;
}

interface CustomMemberSelectProps {
  value: string;
  onChange: (memberId: string) => void;
  members: MemberOption[];
  placeholder?: string;
  disabled?: boolean;
}

export function CustomMemberSelect({
  value,
  onChange,
  members,
  placeholder = "Select assigned Member",
  disabled = false,
}: CustomMemberSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedMember = useMemo(() => {
    return members.find((m) => m.id === value || (m as any).userId === value);
  }, [members, value]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        (m.name || m.displayName || "").toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  }, [members, search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative w-full text-xs font-sans">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full h-[42px] px-3.5 rounded-[10px] bg-background border transition-all flex items-center justify-between gap-2 cursor-pointer ${
          isOpen
            ? "border-amber-500/80 dark:border-gold ring-1 ring-amber-500/30"
            : "border-border hover:border-amber-500/50"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {selectedMember ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-600 dark:text-gold font-bold border border-amber-500/20 flex items-center justify-center text-[10px] shrink-0">
              {(selectedMember.name || selectedMember.displayName || "M").charAt(0).toUpperCase()}
            </div>
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-foreground truncate">
                {selectedMember.name || selectedMember.displayName || selectedMember.email}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9.5px] font-bold uppercase shrink-0">
                Assigned to you
              </span>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}

        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-[46px] z-50 bg-popover border border-border text-popover-foreground rounded-[14px] shadow-xl overflow-hidden p-2 space-y-2 max-h-[260px] flex flex-col">
          {/* Search Bar */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              autoFocus
              placeholder="Search team members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-[8px] text-[11.5px] text-foreground outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Members List */}
          <div className="overflow-y-auto flex-1 divide-y divide-border/50 pr-1">
            {filteredMembers.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-[11.5px]">
                No assigned team members found.
              </div>
            ) : (
              filteredMembers.map((m) => {
                const isSelected = value === m.id || value === (m as any).userId;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      onChange(m.id || (m as any).userId);
                      setIsOpen(false);
                    }}
                    className={`p-2 rounded-[8px] flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-amber-500/10 text-amber-600 dark:text-gold font-bold"
                        : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-amber-500/15 text-amber-600 dark:text-gold font-bold border border-amber-500/20 flex items-center justify-center text-[10.5px] shrink-0">
                        {(m.name || m.displayName || "M").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[12px] text-foreground truncate">
                          {m.name || m.displayName || "Team Member"}
                        </p>
                        <p className="text-[10.5px] text-muted-foreground truncate">
                          {m.email}
                        </p>
                      </div>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-amber-600 dark:text-gold shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
