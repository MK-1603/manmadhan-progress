"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, Check, Search, Cpu, Zap, BrainCircuit } from "lucide-react";
import { MobileSheet } from "@/components/ui/mobile-sheet";

export interface AIModelItem {
  id: string;
  name: string;
  provider: "OpenAI" | "Anthropic" | "Google" | "Meta";
  category: "Recommended" | "Reasoning" | "Multimodal" | "Fast";
  desc: string;
  badge?: string;
}

export const AI_MODELS: AIModelItem[] = [
  {
    id: "gpt-5.6",
    name: "GPT-5.6 Execution",
    provider: "OpenAI",
    category: "Recommended",
    desc: "Default execution model for predictive planning and task breakdown.",
    badge: "Default",
  },
  {
    id: "claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    category: "Reasoning",
    desc: "Superior deep reasoning and analytical synthesis.",
    badge: "Deep Analysis",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "Google",
    category: "Multimodal",
    desc: "Long-context understanding and document analysis.",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    category: "Fast",
    desc: "Ultra-fast response for micro-prompts and quick suggestions.",
  },
];

interface ModelSelectorProps {
  currentModelId?: string;
  onSelectModel?: (modelId: string) => void;
  compact?: boolean;
}

export function ModelSelector({
  currentModelId = "gpt-5.6",
  onSelectModel,
  compact = false,
}: ModelSelectorProps) {
  const [selectedId, setSelectedId] = useState(currentModelId);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const currentModel = AI_MODELS.find((m) => m.id === selectedId) || AI_MODELS[0];

  const handleSelect = (modelId: string) => {
    setSelectedId(modelId);
    if (onSelectModel) onSelectModel(modelId);
    setIsOpen(false);
  };

  const filteredModels = AI_MODELS.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative inline-block text-left">
      {/* TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border/80 hover:border-gold/50 text-foreground transition-all shadow-sm cursor-pointer"
      >
        <div className="w-5 h-5 rounded-md bg-gold/10 flex items-center justify-center text-gold">
          <Sparkles className="w-3 h-3" />
        </div>
        <span className="text-xs font-bold tracking-tight">{currentModel.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform" />
      </button>

      {/* DESKTOP POPOVER (MD+) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="hidden md:block absolute left-0 bottom-full mb-2 w-80 rounded-2xl bg-popover border border-border text-popover-foreground shadow-2xl z-50 p-3 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-2 pb-2.5 border-b border-border/50">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search AI models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1 pt-2">
              {filteredModels.map((m) => {
                const isSelected = m.id === selectedId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelect(m.id)}
                    className={`w-full text-left p-2.5 rounded-xl border flex items-start justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-gold/10 border-gold/40 text-foreground"
                        : "bg-transparent border-transparent hover:bg-muted/60"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold">{m.name}</span>
                        {m.badge && (
                          <span className="px-1.5 py-0.2 bg-gold/20 text-gold text-[9px] font-extrabold rounded-md uppercase">
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">{m.desc}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-gold shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE SHEET (<MD) */}
      <MobileSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Select Intelligence Model"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted border border-border">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            {filteredModels.map((m) => {
              const isSelected = m.id === selectedId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelect(m.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border flex items-start justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-gold/10 border-gold/40 text-foreground"
                      : "bg-card border-border hover:bg-muted/60"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{m.name}</span>
                      {m.badge && (
                        <span className="px-2 py-0.5 bg-gold/20 text-gold text-[10px] font-extrabold rounded-md uppercase">
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">{m.desc}</p>
                  </div>
                  {isSelected && <Check className="w-5 h-5 text-gold shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>
        </div>
      </MobileSheet>
    </div>
  );
}
