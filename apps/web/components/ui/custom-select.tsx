"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  color?: string; // Optional custom indicator color (e.g. for Priority)
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select option...",
  disabled = false,
  triggerClassName = "",
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
    const dropdownHeight = Math.min(options.length * 40 + 12, 240);
    const spaceBelow = window.innerHeight - rect.bottom;

    const placement = spaceBelow < dropdownHeight && rect.top > dropdownHeight ? "top" : "bottom";
    const top = placement === "top" ? rect.top - dropdownHeight - 6 : rect.bottom + 6;

    let left = rect.left;
    const safeMargin = 8;
    if (left + rect.width > window.innerWidth - safeMargin) {
      left = window.innerWidth - rect.width - safeMargin;
    }
    if (left < safeMargin) left = safeMargin;

    setCoords({
      top,
      left,
      width: rect.width, // Trigger-anchored exact width
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
      const handleScroll = () => setIsOpen(false); // Close on parent/window scroll
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

  return (
    <div className="relative inline-block w-full font-sans">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full h-[36px] px-3 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[7px] text-[11.5px] text-[#17202A] dark:text-[#F2F4F7] flex items-center justify-between transition-all outline-none disabled:opacity-50 cursor-pointer ${
          isOpen ? "ring-1 ring-[#C9A52A] border-[#C9A52A] dark:ring-[#D4B12F] dark:border-[#D4B12F]" : ""
        } ${triggerClassName}`}
      >
        <span className="truncate flex items-center gap-1.5">
          {selectedOption?.color && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.color}`} />
          )}
          {selectedOption ? (
            <span className="font-semibold">{selectedOption.label}</span>
          ) : (
            <span className="text-[#667085] dark:text-[#8B95A5]">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#667085] dark:text-[#8B95A5] transition-transform shrink-0 ${isOpen ? "rotate-180 text-[#C9A52A]" : ""}`} />
      </button>

      {mounted && isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 999999,
          }}
          className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] shadow-2xl overflow-hidden py-1 max-h-[240px] overflow-y-auto font-sans animate-in fade-in-50 duration-100"
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
                className={`w-full px-3 py-2 text-left text-[11.5px] flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[#C9A52A]/10 text-[#C9A52A] dark:text-[#D4B12F] font-bold"
                    : isHighlighted
                    ? "bg-[#F3F4F6] dark:bg-[#181D24] text-[#17202A] dark:text-[#F2F4F7]"
                    : "text-[#17202A] dark:text-[#F2F4F7]"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.color && <span className={`w-2 h-2 rounded-full shrink-0 ${opt.color}`} />}
                  <div className="truncate">
                    <div className="font-semibold leading-snug truncate">{opt.label}</div>
                    {opt.sublabel && (
                      <div className="text-[10px] text-[#667085] dark:text-[#8B95A5] font-normal truncate">{opt.sublabel}</div>
                    )}
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#C9A52A] dark:text-[#D4B12F] shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
