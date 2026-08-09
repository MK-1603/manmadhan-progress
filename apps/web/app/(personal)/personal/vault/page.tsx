"use client";

import { useState, useEffect } from "react";
import { Lock, Unlock, File, Shield, FileText, UploadCloud, Search } from "lucide-react";
import apiClient from "@/lib/api-client";

export default function VaultPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  
  // Auth state
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vault Content
  const [files, setFiles] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);

  // Note Draft
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setUnlocking(true);
    setError(null);
    try {
      const res = await apiClient.post(`/personal/vault/unlock`, { password });
      if (res.data.success) {
        setToken(res.data.data.token);
        setIsUnlocked(true);
      } else {
        setError(res.data.error);
      }
    } catch (e: any) {
      setError(e.response?.data?.error || "Unlock failed");
    } finally {
      setUnlocking(false);
    }
  };

  const lockVault = () => {
    setIsUnlocked(false);
    setToken(null);
    setFiles([]);
    setNotes([]);
    setPassword("");
  };

  useEffect(() => {
    if (isUnlocked && token) {
      fetchVaultContent();
    }
  }, [isUnlocked, token]);

  const fetchVaultContent = async () => {
    setLoadingContent(true);
    try {
      // Create an API client instance with the vault token
      const headers = { "x-vault-token": token };
      const [filesRes, notesRes] = await Promise.all([
        apiClient.get(`/personal/vault/files`, { headers }),
        apiClient.get(`/personal/vault/notes`, { headers })
      ]);
      setFiles(filesRes.data.data);
      setNotes(notesRes.data.data);
    } catch (e: any) {
      if (e.response?.status === 403) {
        lockVault(); // Token expired
      }
    } finally {
      setLoadingContent(false);
    }
  };

  const saveSecureNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTitle || !token) return;
    try {
      await apiClient.post(`/personal/vault/notes`, { title: draftTitle, body: draftBody }, { headers: { "x-vault-token": token } });
      setDraftTitle("");
      setDraftBody("");
      fetchVaultContent();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="h-screen bg-background flex items-center justify-center p-6 text-foreground font-sans relative overflow-hidden">
        {/* Subtle security pattern background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 z-10">
          <div className="bg-card border border-border rounded-3xl p-8 md:p-10 shadow-2xl flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
              <Shield className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Personal Vault</h1>
            <p className="text-sm text-muted-foreground mb-8">Enter your security PIN or password to unlock your protected files and notes.</p>
            
            <form onSubmit={handleUnlock} className="w-full space-y-4">
              <input 
                type="password" 
                value={password}
                onChange={e=>setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full text-center tracking-widest text-lg font-mono px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary"
                autoFocus
              />
              {error && <div className="text-xs font-bold text-red-500 bg-red-500/10 py-2 rounded-lg">{error}</div>}
              
              <button disabled={unlocking || !password} type="submit" className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl transition-all hover:bg-primary/90 disabled:opacity-50">
                {unlocking ? "Verifying..." : "Unlock Vault"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground font-sans flex flex-col">
      <header className="px-6 md:px-10 pt-8 pb-6 border-b border-border bg-card shrink-0 relative overflow-hidden">
        {/* Warning border for vault */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-500"></div>
        <div className="max-w-6xl mx-auto flex justify-between items-end relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-wider mb-2">
              <Unlock className="w-3.5 h-3.5" /> Vault Unlocked
            </div>
            <h1 className="text-3xl font-bold">Personal Vault</h1>
          </div>
          <button onClick={lockVault} className="px-5 py-2.5 border border-border font-bold text-sm rounded-xl hover:bg-accent transition-colors flex items-center gap-2">
            <Lock className="w-4 h-4" /> Lock Vault
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-10 w-full flex-1 grid lg:grid-cols-2 gap-8">
        
        {/* Secure Notes Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Secure Notes</h2>
          </div>
          
          <form onSubmit={saveSecureNote} className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
            <input type="text" value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} placeholder="Note Title" className="w-full text-lg font-bold bg-transparent border-none outline-none" required />
            <textarea value={draftBody} onChange={e=>setDraftBody(e.target.value)} placeholder="Write something confidential..." className="w-full min-h-[100px] text-sm bg-transparent border-none outline-none resize-y" />
            <div className="flex justify-end">
              <button disabled={!draftTitle} type="submit" className="px-4 py-2 bg-foreground text-background font-bold text-sm rounded-lg disabled:opacity-50">Save Secure Note</button>
            </div>
          </form>

          <div className="space-y-3">
            {notes.map(note => (
              <div key={note.id} className="bg-card/50 border border-border p-4 rounded-xl">
                <h3 className="font-bold">{note.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{note.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Secure Files Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2"><File className="w-5 h-5 text-primary" /> Protected Files</h2>
          </div>
          
          <div className="bg-card border border-dashed border-border p-8 rounded-2xl flex flex-col items-center justify-center text-center">
            <Shield className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <h3 className="font-bold mb-1">Move files to Vault</h3>
            <p className="text-sm text-muted-foreground">Go to your normal Files manager and select "Move to Vault" to protect them.</p>
          </div>

          <div className="space-y-2">
            {files.map(f => (
              <div key={f.id} className="flex items-center justify-between bg-card border border-border p-3 rounded-xl">
                <div className="flex items-center gap-3">
                  <File className="w-5 h-5 text-muted-foreground" />
                  <span className="font-semibold text-sm">{f.name}</span>
                </div>
                <button className="text-xs font-bold text-primary hover:underline">Download</button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
