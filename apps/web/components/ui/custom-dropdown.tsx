"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search, X, Filter } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  dotColor?: string;
}

interface CustomDropdownProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  minDropdownWidth?: number;
  isMoreFilters?: boolean;
  moreFiltersContent?: React.ReactNode;
  activeFilterCount?: number;
  onClearFilters?: () => void;
}

export function CustomDropdown({
  label,
  value,
  onChange,
  options,
  placeholder = "All",
  searchable = false,
  searchPlaceholder = "Search people...",
  disabled = false,
  className = "",
  minDropdownWidth = 200,
  isMoreFilters = false,
  moreFiltersContent,
  activeFilterCount = 0,
  onClearFilters,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placement: "top" | "bottom" }>({
    top: 0,
    left: 0,
    width: 200,
    placement: "bottom",
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  // Filter options if search enabled
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(q))
    );
  }, [options, searchable, searchQuery]);

  const updateCoords = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = isMoreFilters ? 320 : Math.min((searchable ? 1 : 0) + filteredOptions.length * 40 + 16, 280);
    const spaceBelow = window.innerHeight - rect.bottom;

    const placement = spaceBelow < dropdownHeight && rect.top > dropdownHeight ? "top" : "bottom";
    const top = placement === "top" ? rect.top - dropdownHeight - 6 : rect.bottom + 6;

    const computedWidth = Math.max(rect.width, minDropdownWidth);
    let left = rect.left;
    const safeMargin = 8;
    if (left + computedWidth > window.innerWidth - safeMargin) {
      left = window.innerWidth - computedWidth - safeMargin;
    }
    if (left < safeMargin) left = safeMargin;

    setCoords({
      top,
      left,
      width: computedWidth,
      placement,
    });
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updateCoords();
      setSearchQuery("");
      const currIdx = filteredOptions.findIndex((o) => o.value === value);
      setHighlightedIndex(currIdx >= 0 ? currIdx : 0);
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      if (searchable && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      const handleResize = () => updateCoords();
      const handleScroll = () => setIsOpen(false);
      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleScroll, true);
      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleScroll, true);
      };
    }
  }, [isOpen, searchable]);

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
      } else if (e.key === "ArrowDown" && !isMoreFilters) {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp" && !isMoreFilters) {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      } else if (e.key === "Enter" && !isMoreFilters) {
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
  }, [isOpen, filteredOptions, highlightedIndex, onChange, isMoreFilters]);

  // Display trigger label
  const triggerDisplay = isMoreFilters
    ? label
    : `${label}: ${selectedOption ? selectedOption.label : placeholder}`;

  const isActiveValue = isMoreFilters ? activeFilterCount > 0 : value !== "All" && value !== "";

  return (
    <div className={`relative inline-block ${className} font-sans`}>
      {/* ── TRIGGER BUTTON ── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`h-[36px] px-3.5 bg-background border border-border rounded-[8px] text-foreground flex items-center justify-between gap-2 transition-all outline-none disabled:opacity-50 cursor-pointer hover:border-amber-500/60 dark:hover:border-gold/60 ${
          isOpen
            ? "ring-2 ring-amber-500/30 border-amber-500 shadow-xs"
            : ""
        } ${isActiveValue ? "border-amber-500/50 bg-amber-500/5" : ""}`}
      >
        <span className="truncate flex items-center gap-2 text-[12px] font-semibold">
          {isMoreFilters && <Filter className="w-3.5 h-3.5 text-amber-600 dark:text-gold shrink-0" />}
          {selectedOption?.dotColor && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.dotColor}`} />
          )}
          <span className="truncate">{triggerDisplay}</span>
          {isMoreFilters && activeFilterCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white dark:bg-gold dark:text-black text-[10px] font-extrabold">
              {activeFilterCount}
            </span>
          )}
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-amber-600 dark:text-gold" : ""
          }`}
        />
      </button>

      {/* ── POPOVER MENU OVERLAY ── */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 999999,
            }}
            className="bg-popover border border-border text-popover-foreground rounded-[10px] shadow-2xl overflow-hidden py-1.5 font-sans animate-in fade-in-50 zoom-in-95 duration-100"
          >
            {/* Search Input for Owner / Assignee */}
            {searchable && !isMoreFilters && (
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-[32px] pl-8 pr-2.5 bg-background border border-border rounded-[6px] text-[11.5px] text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Custom Content for More Filters */}
            {isMoreFilters ? (
              <div className="p-3 space-y-3">
                {moreFiltersContent}
                {onClearFilters && (
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        onClearFilters();
                        setIsOpen(false);
                      }}
                      className="text-[11.5px] font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear Filters
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-3 py-1 rounded-[6px] bg-amber-500 text-white dark:bg-gold dark:text-black text-[11.5px] font-bold cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Options List */
              <div className="max-h-[220px] overflow-y-auto divide-y divide-border/30">
                {filteredOptions.length === 0 ? (
                  <div className="p-3 text-center text-muted-foreground text-[11.5px]">
                    No options found
                  </div>
                ) : (
                  filteredOptions.map((opt, idx) => {
                    const isSelected = opt.value === value;
                    const isHighlighted = idx === highlightedIndex;

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setIsOpen(false);
                        }}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full px-3 py-2 text-left text-[12px] flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-amber-500/15 text-amber-600 dark:text-gold font-bold"
                            : isHighlighted
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground hover:bg-accent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {opt.dotColor && <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`} />}
                          <div className="truncate">
                            <div className="font-bold leading-snug truncate">{opt.label}</div>
                            {opt.sublabel && (
                              <div className="text-[10.5px] text-muted-foreground font-normal truncate">
                                {opt.sublabel}
                              </div>
                            )}
                          </div>
                        </div>

                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-gold shrink-0 ml-2 stroke-[2.5]" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
