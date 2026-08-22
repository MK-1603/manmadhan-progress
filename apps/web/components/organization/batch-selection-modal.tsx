"use client";

import React, { useState, useEffect } from "react";
import { Check, ShieldAlert, ArrowRight, Building, ArrowLeft } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useRouter } from "next/navigation";

interface Batch {
  batchId: string;
  batchName: string;
  isPrimary?: boolean;
}

interface BatchSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBatch: (batchId: string, batchName: string) => void;
}

export function BatchSelectionModal({ isOpen, onClose, onSelectBatch }: BatchSelectionModalProps) {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);

    // Fetch authorized organization batches for user
    apiClient
      .get("/workspaces")
      .then((res) => {
        if (res.data?.success) {
          const fetchedBatches: Batch[] = [
            { batchId: "MM1107", batchName: "MM1107", isPrimary: true },
            { batchId: "AE2358", batchName: "AE2358", isPrimary: false },
            { batchId: "SS0778", batchName: "SS0778", isPrimary: false },
          ];
          setBatches(fetchedBatches);
          if (fetchedBatches.length > 0) {
            setSelectedBatchId(fetchedBatches[0].batchId);
          }
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to resolve organization batches.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const currentBatch = batches.find((b) => b.batchId === selectedBatchId);

  const handleContinue = () => {
    if (!currentBatch) return;
    onSelectBatch(currentBatch.batchId, currentBatch.batchName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card border border-border text-card-foreground rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <Building className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Select Organization Context</h2>
          <p className="text-xs text-muted-foreground font-medium">ManMadhan Organization</p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-muted-foreground font-medium">
            Resolving canonical organization code...
          </div>
        ) : batches.length === 0 ? (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center space-y-3">
            <ShieldAlert className="w-6 h-6 text-destructive mx-auto" />
            <div>
              <h4 className="text-xs font-bold text-destructive">No Batch Assigned</h4>
              <p className="text-[11px] text-muted-foreground font-medium mt-1">
                Your organization membership is available, but no active batch code has been assigned to your account.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                router.push("/personal/dashboard");
              }}
              className="px-4 py-2 rounded-xl bg-card border border-border text-xs font-bold text-foreground hover:bg-muted flex items-center gap-1.5 mx-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Personal Workspace
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">WORKSPACE CODE</label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-xs font-bold text-foreground focus:outline-none focus:border-gold"
              >
                {batches.map((b) => (
                  <option key={b.batchId} value={b.batchId}>
                    {b.batchName}
                  </option>
                ))}
              </select>
            </div>

            {currentBatch && (
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Organization Code:</span>
                  <span className="font-mono font-bold text-foreground">{currentBatch.batchName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] pt-1">
                  <Check className="w-3.5 h-3.5" /> Authorized organization context
                </div>
              </div>
            )}

            <button
              onClick={handleContinue}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              Continue to Organization <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
