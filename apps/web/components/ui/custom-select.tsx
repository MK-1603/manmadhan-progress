"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  color?: string; // e.g. "bg-emerald-500", "bg-rose-500", etc.
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  minDropdownWidth?: number;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select option...",
  disabled = false,
  className = "",
  triggerClassName = "",
  size = "md",
  icon,
  minDropdownWidth = 180,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placement: "top" | "bottom" }>({
    top: 0,
    left: 0,
    width: 200,
    placement: "bottom",
  });
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  const updateCoords = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = Math.min(options.length * 40 + 12, 260);
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
      const currIdx = options.findIndex((o) => o.value === value);
      setHighlightedIndex(currIdx >= 0 ? currIdx : 0);
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      const handleResize = () => updateCoords();
      const handleScroll = () => setIsOpen(false);
      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleScroll, true);
      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleScroll, true);
      };
    }
  }, [isOpen]);

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
        setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          onChange(options[highlightedIndex].value);
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
  }, [isOpen, options, highlightedIndex, onChange]);

  const sizeClasses = {
    sm: "h-[34px] px-2.5 text-[11.5px]",
    md: "h-[42px] px-3.5 text-[12.5px]",
    lg: "h-[46px] px-4 text-[13px]",
  }[size];

  return (
    <div className={`relative inline-block ${className || "w-full"} font-sans`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full ${sizeClasses} bg-background border border-border rounded-[10px] text-foreground flex items-center justify-between transition-all outline-none disabled:opacity-50 cursor-pointer hover:border-amber-500/60 dark:hover:border-gold/60 ${
          isOpen
            ? "ring-2 ring-amber-500/30 border-amber-500 dark:ring-gold/30 dark:border-gold shadow-sm"
            : ""
        } ${triggerClassName}`}
      >
        <span className="truncate flex items-center gap-2">
          {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
          {selectedOption?.color && (
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${selectedOption.color}`} />
          )}
          {selectedOption ? (
            <span className="font-semibold truncate">{selectedOption.label}</span>
          ) : (
            <span className="text-muted-foreground font-normal truncate">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 ml-1 text-muted-foreground transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-amber-600 dark:text-gold" : ""
          }`}
        />
      </button>

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
            className="bg-popover border border-border text-popover-foreground rounded-[12px] shadow-2xl overflow-hidden py-1.5 max-h-[260px] overflow-y-auto font-sans animate-in fade-in-50 zoom-in-95 duration-100"
          >
            {options.map((opt, idx) => {
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
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    {opt.color && <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.color}`} />}
                    <div className="truncate">
                      <div className="font-semibold leading-snug truncate">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-[10.5px] text-muted-foreground font-normal truncate">
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-gold shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

