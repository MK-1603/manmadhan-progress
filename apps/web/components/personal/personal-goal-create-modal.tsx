import { useState } from "react";
import { X, Target } from "lucide-react";
import apiClient from "@/lib/api-client";

export function PersonalGoalCreateModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: any) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Personal");
  const [priority, setPriority] = useState("Medium");
  const [targetDate, setTargetDate] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");
  const [motivation, setMotivation] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setSaving(true);
    setError(null);

    try {
      const res = await apiClient.post("/personal/goals", {
        name,
        description,
        category,
        priority,
        targetDate: targetDate || undefined,
        targetValue: targetValue || undefined,
        unit: unit || undefined,
        motivation,
      });

      if (res.data.success) {
        onSave(res.data.data);
        setName("");
        setDescription("");
        setCategory("Personal");
        setPriority("Medium");
        setTargetDate("");
        setTargetValue("");
        setUnit("");
        setMotivation("");
        onClose();
      } else {
        setError(res.data.error || "Failed to create goal");
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">New Goal</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded-md transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">{error}</div>}

          <div>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Goal Name (e.g. Run a Marathon)"
              className="w-full text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50 px-0"
            />
          </div>

          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full text-sm bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50 px-0 resize-none h-16"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 text-sm px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring">
                <option>Personal</option>
                <option>Career</option>
                <option>Learning</option>
                <option>Financial</option>
                <option>Health</option>
                <option>Project</option>
                <option>Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full h-9 text-sm px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Target Date</label>
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full h-9 text-sm px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Target Value (Numeric)</label>
              <input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="e.g. 50" className="w-full h-9 text-sm px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Unit (Optional)</label>
              <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. books, km, kg" className="w-full h-9 text-sm px-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Motivation</label>
            <textarea
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="Why is this important to you?"
              className="w-full text-sm rounded-lg border border-input bg-background p-3 focus:outline-none focus:ring-2 focus:ring-ring resize-none h-20"
            />
          </div>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-end bg-accent/10">
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium hover:text-muted-foreground">Cancel</button>
            <button onClick={handleSubmit} disabled={saving || !name} className="px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg disabled:opacity-50 transition-colors">
              {saving ? "Creating..." : "Create Goal"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
