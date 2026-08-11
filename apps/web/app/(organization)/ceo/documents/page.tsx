"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Search, Loader2, AlertCircle, File, Folder, Upload } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";

export default function CEODocumentsPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchDocuments = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(`/folders?workspaceId=${workspaceId}`);
      if (res.data.success) {
        setFolders(res.data.data?.folders || []);
        setFiles(res.data.data?.files || []);
      }
    } catch { setError("Unable to load documents"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDocuments(); }, []);

  const filtered = files.filter(f => (f.name || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Organization documents and files</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors">
          <Upload className="w-4 h-4" /> Upload
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
      </div>

      {error && <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {folders.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Folders</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {folders.map((f: any) => (
                  <PremiumCard key={f.id} className="hover:border-border/80 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <Folder className="w-5 h-5 text-amber-500 shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate">{f.name}</span>
                    </div>
                  </PremiumCard>
                ))}
              </div>
            </div>
          )}

          <div>
            {files.length === 0 && folders.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No documents yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Upload PRDs, architecture docs, research files, and reports</p>
                <button className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 mx-auto transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Upload Document
                </button>
              </div>
            ) : filtered.length > 0 ? (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Files</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.map((f: any) => (
                    <PremiumCard key={f.id} className="hover:border-border/80 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <File className="w-5 h-5 text-blue-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                          <p className="text-xs text-muted-foreground">{f.mimeType || "File"}</p>
                        </div>
                      </div>
                    </PremiumCard>
                  ))}
                </div>
              </>
            ) : search ? (
              <p className="text-sm text-muted-foreground text-center py-8">No documents match your search</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
