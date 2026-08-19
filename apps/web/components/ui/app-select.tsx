"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search, X } from "lucide-react";

export interface AppSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  color?: string; // e.g. "bg-emerald-500", "bg-amber-500", etc.
  icon?: React.ElementType;
}

export interface AppSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
  triggerClassName?: string;
  label?: string;
  id?: string;
}

export function AppSelect({
  value,
  onChange,
  options,
  placeholder = "Select option...",
  disabled = false,
  searchable = false,
  triggerClassName = "",
  label,
  id,
}: AppSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placement: "top" | "bottom" }>({
    top: 0,
    left: 0,
    width: 220,
    placement: "bottom",
  });
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const filteredOptions = searchable && searchTerm.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.sublabel && o.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : options;

  const selectedOption = options.find((o) => o.value === value);

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = Math.min(filteredOptions.length * 42 + (searchable ? 48 : 12), 260);
    const spaceBelow = window.innerHeight - rect.bottom;

    const placement = spaceBelow < dropdownHeight && rect.top > dropdownHeight ? "top" : "bottom";
    const top = placement === "top" ? rect.top - dropdownHeight - 6 : rect.bottom + 6;

    let left = rect.left;
    const safeMargin = 12;
    if (left + rect.width > window.innerWidth - safeMargin) {
      left = window.innerWidth - rect.width - safeMargin;
    }
    if (left < safeMargin) left = safeMargin;

    setCoords({
      top,
      left,
      width: Math.max(rect.width, 180),
      placement,
    });
  }, [filteredOptions.length, searchable]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      setSearchTerm("");
      updateCoords();
      const currIdx = filteredOptions.findIndex((o) => o.value === value);
      setHighlightedIndex(currIdx >= 0 ? currIdx : 0);
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen && !isMobile) {
      updateCoords();
      const handleResize = () => updateCoords();
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [isOpen, isMobile, updateCoords]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          onChange(filteredOptions[highlightedIndex].value);
          setIsOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, filteredOptions, highlightedIndex, onChange]);

  const IconComp = selectedOption?.icon;

  return (
    <div className="relative inline-block w-full font-sans select-none">
      {label && (
        <label htmlFor={id} className="block text-[11px] font-semibold text-[#9AA4B2] mb-1 uppercase tracking-wider">
          {label}
        </label>
      )}
      <button
        id={id}
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full h-8 px-3 bg-[#0B0E13] border border-white/15 rounded-lg text-xs text-[#F4F7F5] flex items-center justify-between transition-all outline-none disabled:opacity-50 cursor-pointer hover:border-gold/50 ${
          isOpen ? "ring-1 ring-gold border-gold" : ""
        } ${triggerClassName}`}
      >
        <span className="truncate flex items-center gap-2 min-w-0">
          {selectedOption?.color && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.color}`} />
          )}
          {IconComp && <IconComp className="w-3.5 h-3.5 text-gold shrink-0" />}
          {selectedOption ? (
            <span className="font-semibold truncate">{selectedOption.label}</span>
          ) : (
            <span className="text-[#667085] truncate">{placeholder}</span>
          )}
          {selectedOption?.badge && (
            <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-gold uppercase tracking-wider">
              {selectedOption.badge}
            </span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#9AA4B2] transition-transform shrink-0 ml-1.5 ${isOpen ? "rotate-180 text-gold" : ""}`} />
      </button>

      {/* Desktop Popover Portal */}
      {mounted && isOpen && !isMobile && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 999999,
          }}
          className="bg-[#0F1218] border border-white/20 text-[#F4F7F5] rounded-xl shadow-2xl overflow-hidden py-1 max-h-[260px] flex flex-col font-sans backdrop-blur-md animate-in fade-in-50 duration-100"
        >
          {searchable && (
            <div className="p-2 border-b border-white/10 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-[#667085]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search options..."
                  className="w-full h-7 pl-8 pr-2.5 text-[11px] bg-[#0B0E13] border border-white/10 rounded-md text-[#F4F7F5] placeholder:text-[#667085] focus:outline-none focus:border-gold"
                  autoFocus
                />
              </div>
            </div>
          )}
          <div className="overflow-y-auto flex-1 py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-[#667085] font-medium">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;
                const OptIcon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-gold/15 text-gold font-bold"
                        : isHighlighted
                        ? "bg-[#141820] text-[#F4F7F5]"
                        : "text-[#9AA4B2] hover:bg-[#141820] hover:text-[#F4F7F5]"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      {opt.color && <span className={`w-2 h-2 rounded-full shrink-0 ${opt.color}`} />}
                      {OptIcon && <OptIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-gold" : "text-[#667085]"}`} />}
                      <div className="truncate min-w-0">
                        <div className="font-semibold leading-snug truncate">{opt.label}</div>
                        {opt.sublabel && (
                          <div className="text-[10px] text-[#667085] font-normal truncate">{opt.sublabel}</div>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-gold shrink-0 ml-1.5" />}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Mobile Bottom Sheet Portal */}
      {mounted && isOpen && isMobile && createPortal(
        <div className="fixed inset-0 z-[999999] flex flex-col justify-end bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative bg-[#0F1218] border-t border-white/15 text-[#F4F7F5] rounded-t-2xl shadow-2xl max-h-[75vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 z-10 pb-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <span className="text-xs font-bold text-[#F4F7F5] uppercase tracking-wider">
                {label || placeholder}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-[#9AA4B2] hover:bg-white/10 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {searchable && (
              <div className="p-3 border-b border-white/10 shrink-0">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 absolute left-3 text-[#667085]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search options..."
                    className="w-full h-9 pl-9 pr-3 text-xs bg-[#0B0E13] border border-white/10 rounded-lg text-[#F4F7F5] placeholder:text-[#667085] focus:outline-none focus:border-gold"
                  />
                </div>
              </div>
            )}
            <div className="overflow-y-auto p-2 space-y-1 max-h-[55vh]">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-[#667085] font-medium">
                  No matching options
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  const OptIcon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-left text-xs flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-gold/15 text-gold font-bold border border-gold/30"
                          : "text-[#F4F7F5] hover:bg-[#141820] border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate min-w-0">
                        {opt.color && <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.color}`} />}
                        {OptIcon && <OptIcon className={`w-4 h-4 shrink-0 ${isSelected ? "text-gold" : "text-[#667085]"}`} />}
                        <div className="truncate min-w-0">
                          <div className="font-semibold leading-snug truncate text-xs">{opt.label}</div>
                          {opt.sublabel && (
                            <div className="text-[10.5px] text-[#667085] font-normal truncate mt-0.5">{opt.sublabel}</div>
                          )}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-gold shrink-0 ml-2" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
