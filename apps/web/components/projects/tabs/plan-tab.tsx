"use client";

import { useState } from "react";
import { Edit3, Check, Save } from "lucide-react";
import apiClient from "@/lib/api-client";

export function ProjectPlanTab({ project }: { project: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState(project.plan || {});

  const handleChange = (field: string, value: string) => {
    setPlan({ ...plan, [field]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      await apiClient.patch(`/projects/${project.id}?workspaceId=${workspaceId}`, {
        plan
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: "expectedOutcome", label: "Expected Outcome", placeholder: "What is the desired final state?" },
    { id: "scope", label: "Project Scope", placeholder: "What is included in this project?" },
    { id: "outOfScope", label: "Out of Scope", placeholder: "What is explicitly excluded?" },
    { id: "successCriteria", label: "Success Criteria", placeholder: "How will we measure success? (e.g. [ ] 10k users)" },
    { id: "risks", label: "Risks & Mitigation", placeholder: "Risk: Server crashes. Mitigation: Auto-scaling." },
  ];

  return (
    <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm animate-in fade-in duration-300">
      <header className="px-8 py-6 border-b border-border flex items-center justify-between bg-muted/10">
        <div>
          <h2 className="text-xl font-bold text-foreground">Execution Plan</h2>
          <p className="text-sm text-muted-foreground mt-1">Define the boundaries, risks, and criteria for this project.</p>
        </div>
        
        {isEditing ? (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsEditing(false)} 
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Plan"}
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-5 py-2 bg-muted text-foreground text-sm font-bold rounded-lg hover:bg-muted/80 transition-colors"
          >
            <Edit3 className="w-4 h-4" /> Edit Plan
          </button>
        )}
      </header>

      <div className="p-8 space-y-8">
        {sections.map(section => (
          <div key={section.id} className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              {section.label}
            </h3>
            
            {isEditing ? (
              <textarea
                value={plan[section.id] || ""}
                onChange={(e) => handleChange(section.id, e.target.value)}
                placeholder={section.placeholder}
                className="w-full min-h-[100px] text-sm bg-muted rounded-xl p-4 border border-transparent focus:border-primary outline-none transition-colors"
              />
            ) : (
              <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap min-h-[40px] p-4 rounded-xl bg-muted/20 border border-border/50">
                {plan[section.id] || <span className="text-muted-foreground italic">Not defined</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
