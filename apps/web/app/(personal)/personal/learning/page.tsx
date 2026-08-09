"use client";

import { useEffect, useState } from "react";
import { Plus, Brain, Target, CheckCircle2, ChevronRight, Play } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PersonalSkillAddModal } from "@/components/personal/personal-skill-add-modal";

type Skill = {
  id: string;
  name: string;
  description?: string;
  category: string;
  currentLevel: string;
  targetLevel: string;
  progressPercent: number;
  status: string;
};

type Session = {
  id: string;
  topic?: string;
  durationMinutes: number;
  date: string;
};

export default function LearningPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // New session state
  const [sessionTopic, setSessionTopic] = useState("");
  const [sessionDuration, setSessionDuration] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [isLogging, setIsLogging] = useState(false);

  const fetchSkills = async () => {
    try {
      const result = await apiClient.get(`/personal/learning`);
      const data = result.data?.data ?? [];
      setSkills(data);
      if (data.length > 0 && !selectedSkillId) {
        setSelectedSkillId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async (id: string) => {
    try {
      const result = await apiClient.get(`/personal/learning/${id}/sessions`);
      setSessions(result.data?.data ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  useEffect(() => {
    if (selectedSkillId) {
      fetchSessions(selectedSkillId);
    }
  }, [selectedSkillId]);

  const logSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkillId || !sessionDuration) return;

    try {
      await apiClient.post(`/personal/learning/${selectedSkillId}/sessions`, {
        topic: sessionTopic,
        durationMinutes: sessionDuration,
        notes: sessionNotes
      });
      setSessionTopic("");
      setSessionDuration("");
      setSessionNotes("");
      setIsLogging(false);
      fetchSessions(selectedSkillId);
      fetchSkills(); // refresh progress
    } catch (e) {
      console.error("Failed to log session");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground font-sans flex flex-col">
      <header className="px-6 md:px-10 pt-8 pb-6 border-b border-border bg-card shrink-0">
        <div className="max-w-6xl mx-auto flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <span>Personal</span> / <span className="text-foreground">Development</span>
            </div>
            <h1 className="text-3xl font-bold">Learning Paths</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-lg">
              Define target skills, track study sessions, and link books or podcasts to your learning journey.
            </p>
          </div>
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-xl font-bold text-sm shadow-sm hover:bg-foreground/90 transition-all active:scale-95">
            <Plus className="w-4 h-4" /> New Skill
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-10 w-full flex-1 grid lg:grid-cols-12 gap-8">
        {loading ? (
          <div className="lg:col-span-12 flex items-center justify-center py-20 animate-pulse">
            <Brain className="w-12 h-12 text-muted-foreground/30" />
          </div>
        ) : skills.length === 0 ? (
          <div className="lg:col-span-12 text-center py-20 border border-dashed border-border/60 rounded-3xl bg-card/25 max-w-3xl mx-auto w-full">
            <Brain className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-1">No skills mapped</h3>
            <p className="text-sm text-muted-foreground mb-6">Choose a skill to start developing and tracking your mastery.</p>
            <button onClick={() => setOpen(true)} className="px-5 py-2.5 bg-foreground text-background font-bold rounded-xl text-sm">Add Skill</button>
          </div>
        ) : (
          <>
            {/* Sidebar List */}
            <aside className="lg:col-span-4 space-y-3">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-2">Your Skills</h2>
              {skills.map(skill => (
                <button 
                  key={skill.id}
                  onClick={() => setSelectedSkillId(skill.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedSkillId === skill.id ? "bg-card border-foreground/30 shadow-sm" : "bg-transparent border-border hover:border-foreground/20"}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-base leading-tight truncate">{skill.name}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-accent text-muted-foreground px-2 py-0.5 rounded-md">
                      {skill.category}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-muted-foreground font-medium">{skill.currentLevel}</span>
                    <span className="text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3"/> {skill.targetLevel}</span>
                  </div>
                  <div className="h-1.5 w-full bg-accent rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${skill.progressPercent}%` }} />
                  </div>
                </button>
              ))}
            </aside>

            {/* Main Skill View */}
            <section className="lg:col-span-8">
              {selectedSkillId && skills.find(s => s.id === selectedSkillId) && (
                <div className="space-y-6">
                  <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold">{skills.find(s => s.id === selectedSkillId)?.name}</h2>
                      <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                        {skills.find(s => s.id === selectedSkillId)?.description || "No description provided."}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black">{skills.find(s => s.id === selectedSkillId)?.progressPercent}%</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">Mastery</div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Log Session Form */}
                    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm h-fit">
                      <h3 className="font-bold mb-4 flex items-center gap-2"><Play className="w-4 h-4 text-emerald-500 fill-current" /> Log Study Session</h3>
                      <form onSubmit={logSession} className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Topic / Focus</label>
                          <input type="text" value={sessionTopic} onChange={e=>setSessionTopic(e.target.value)} required placeholder="e.g. React Hooks" className="w-full h-10 px-3 text-sm rounded-xl border border-input bg-background focus:ring-2 focus:ring-ring" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Duration (Minutes)</label>
                          <input type="number" value={sessionDuration} onChange={e=>setSessionDuration(e.target.value)} required min="1" placeholder="60" className="w-full h-10 px-3 text-sm rounded-xl border border-input bg-background focus:ring-2 focus:ring-ring" />
                        </div>
                        <button type="submit" className="w-full py-2.5 bg-foreground text-background font-bold text-sm rounded-xl hover:bg-foreground/90 transition-colors">
                          Save Session
                        </button>
                      </form>
                    </div>

                    {/* Session History */}
                    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                      <h3 className="font-bold mb-4">Recent Sessions</h3>
                      <div className="space-y-3">
                        {sessions.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl">No sessions logged yet.</p>
                        ) : (
                          sessions.map(s => (
                            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-background">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold truncate">{s.topic || "General Study"}</h4>
                                <div className="text-xs text-muted-foreground">{new Date(s.date).toLocaleDateString()}</div>
                              </div>
                              <div className="text-sm font-bold shrink-0">{s.durationMinutes}m</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <PersonalSkillAddModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSave={() => fetchSkills()}
      />
    </div>
  );
}
