"use client";

import React, { useState } from "react";
import { X, FolderKanban, AlertCircle } from "lucide-react";
import apiClient from "@/lib/api-client";
import { GlobalSheet } from "@/components/ui/global-sheet";

interface PersonalCreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project?: any) => void;
}

export function PersonalCreateProjectModal({
  isOpen,
  onClose,
  onSuccess,
}: PersonalCreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await apiClient.post("/personal/projects", {
        name: name.trim(),
        description: description.trim() || undefined,
        deadline: deadline || undefined,
        priority,
        status: "Planning",
      });

      if (res.data?.success) {
        // Reset form
        setName("");
        setDescription("");
        setDeadline("");
        setPriority("Medium");
        onSuccess(res.data.data);
      } else {
        setError(res.data?.error || "Failed to create project.");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error || err.message || "Failed to create project."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setDeadline("");
    setPriority("Medium");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const footer = (
    <div className="flex items-center justify-end gap-3 w-full">
      <button
        type="button"
        onClick={handleClose}
        className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="personal-create-project-form"
        disabled={isSubmitting || !name.trim()}
        className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50"
      >
        {isSubmitting ? "Creating..." : "Create Project"}
      </button>
    </div>
  );

  return (
    <GlobalSheet
      open={isOpen}
      onClose={handleClose}
      title="New Project"
      subtitle="PERSONAL WORKSPACE"
      footerActions={footer}
      desktopMode="modal"
      desktopMaxWidth="max-w-md"
    >
      <form id="personal-create-project-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
            Project Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Personal Portfolio Website"
            autoFocus
            className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-foreground/40 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
            className="w-full p-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-foreground/40 transition-colors resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-foreground/40"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
              Deadline
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-foreground/40"
            />
          </div>
        </div>
      </form>
    </GlobalSheet>
  );
}
