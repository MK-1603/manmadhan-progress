"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { LoaderCircle } from "lucide-react";

type ConfirmOptions = {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  action?: () => Promise<void>;
};

type ConfirmContextType = {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
};

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<{ resolve: (value: boolean) => void } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const confirm = useCallback((opts: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      if (typeof opts === "string") {
        setOptions({
          title: "Confirm Action",
          description: opts,
          confirmLabel: "Confirm",
          variant: "destructive"
        });
      } else {
        setOptions(opts);
      }
      setIsOpen(true);
      setResolver({ resolve });
    });
  }, []);

  const handleConfirm = async () => {
    if (!resolver) return;
    if (options?.action) {
      setIsProcessing(true);
      try {
        await options.action();
        setIsOpen(false);
        resolver.resolve(true);
      } catch (error) {
        console.error("Confirmation action failed:", error);
        // Do not close modal on error so user can see it failed and retry
      } finally {
        setIsProcessing(false);
        if (!isOpen) setResolver(null); // Clean up only if we closed it
      }
    } else {
      setIsOpen(false);
      resolver.resolve(true);
      setResolver(null);
    }
  };

  const handleCancel = () => {
    if (!resolver) return;
    setIsOpen(false);
    resolver.resolve(false);
    setResolver(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ResponsiveModal isOpen={isOpen} onClose={handleCancel} className="max-w-[400px]">
        {options && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-[#171717] dark:text-[#F5F5F5] mb-2">
              {options.title}
            </h2>
            <div className="text-sm text-[#71717A] dark:text-[#A1A1AA] mb-6">
              {options.description}
            </div>
            <div className="flex flex-col-reverse md:flex-row md:justify-end gap-3 w-full">
              <button
                onClick={handleCancel}
                disabled={isProcessing}
                className="w-full md:w-auto px-4 py-2.5 md:py-2 rounded-xl md:rounded-lg font-medium text-[15px] md:text-sm text-[#171717] dark:text-[#F5F5F5] bg-[#F4F4F5] dark:bg-[#1D1D1D] hover:bg-[#E5E7EB] dark:hover:bg-[#333333] transition-colors"
              >
                {options.cancelLabel || "Cancel"}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className={`w-full md:w-auto px-4 py-2.5 md:py-2 rounded-xl md:rounded-lg font-medium text-[15px] md:text-sm text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 ${
                  options.variant === "destructive" 
                    ? "bg-red-600 hover:bg-red-700" 
                    : "bg-[#171717] dark:bg-[#F5F5F5] dark:text-[#080808] hover:bg-[#333333] dark:hover:bg-[#E5E7EB]"
                }`}
              >
                {isProcessing ? <LoaderCircle className="w-4 h-4 animate-spin" /> : null}
                {options.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        )}
      </ResponsiveModal>
    </ConfirmContext.Provider>
  );
};
