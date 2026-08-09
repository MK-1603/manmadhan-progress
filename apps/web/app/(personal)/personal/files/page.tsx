"use client";

import { useEffect, useState } from "react";
import { Search, Folder, File, UploadCloud, LayoutGrid, List, FileText, Image as ImageIcon, CheckSquare, Trash, Lock } from "lucide-react";
import apiClient from "@/lib/api-client";
import Link from "next/link";

type PersonalFile = {
  id: string;
  name: string;
  url: string;
  fileType?: string;
  fileSize?: number;
  createdAt: string;
};

type PersonalFolder = {
  id: string;
  name: string;
};

export default function FilesPage() {
  const [files, setFiles] = useState<PersonalFile[]>([]);
  const [folders, setFolders] = useState<PersonalFolder[]>([]);
  const [view, setView] = useState<"list" | "grid">("grid");
  const [loading, setLoading] = useState(true);

  // Simple UI state for the prototype
  const [isUploading, setIsUploading] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadSize, setUploadSize] = useState("");

  const fetchData = async () => {
    try {
      const [filesRes, foldersRes] = await Promise.all([
        apiClient.get(`/personal/files`),
        apiClient.get(`/personal/files/folders`)
      ]);
      setFiles(filesRes.data.data);
      setFolders(foldersRes.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMockUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName || !uploadUrl) return;
    
    setIsUploading(true);
    try {
      await apiClient.post(`/personal/files`, {
        name: uploadName,
        url: uploadUrl, // Mocking Cloudinary URL
        fileSize: parseInt(uploadSize) || 1024,
        fileType: uploadName.split('.').pop()?.toUpperCase() || "FILE"
      });
      setUploadName("");
      setUploadUrl("");
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground font-sans flex flex-col">
      <header className="px-6 md:px-10 pt-8 pb-6 border-b border-border bg-card shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <span>Personal</span> / <span className="text-foreground">Storage</span>
            </div>
            <h1 className="text-3xl font-bold mb-4">Files</h1>
            
            {/* Storage Summary Mock */}
            <div className="flex flex-col gap-2 w-full max-w-sm">
              <div className="flex justify-between text-xs font-semibold">
                <span>1.2 GB used</span>
                <span className="text-muted-foreground">of 10 GB (Cloudinary)</span>
              </div>
              <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[12%] rounded-full" />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Search files..." className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-xl focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex border border-border rounded-xl overflow-hidden bg-background">
              <button onClick={() => setView("list")} className={`p-2 transition-colors ${view === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"}`}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setView("grid")} className={`p-2 transition-colors ${view === "grid" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <Link href="/personal/vault" className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
              <Lock className="w-4 h-4" /> Vault
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10 w-full flex-1 grid lg:grid-cols-12 gap-8">
        
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3 space-y-8">
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">Locations</h3>
            <button className="w-full flex items-center gap-3 px-3 py-2 bg-accent/80 text-foreground font-semibold rounded-xl">
              <Folder className="w-4 h-4" /> All Files
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground hover:bg-accent/50 font-medium rounded-xl transition-colors">
              <CheckSquare className="w-4 h-4" /> Projects
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground hover:bg-accent/50 font-medium rounded-xl transition-colors">
              <FileText className="w-4 h-4" /> Notes & Books
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground hover:bg-accent/50 font-medium rounded-xl transition-colors">
              <Trash className="w-4 h-4" /> Trash
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Upload File</h3>
            <form onSubmit={handleMockUpload} className="space-y-3">
              <input type="text" value={uploadName} onChange={e=>setUploadName(e.target.value)} placeholder="File Name (e.g. system.pdf)" required className="w-full text-sm px-3 py-2 rounded-lg border border-input bg-background" />
              <input type="url" value={uploadUrl} onChange={e=>setUploadUrl(e.target.value)} placeholder="Cloudinary URL" required className="w-full text-sm px-3 py-2 rounded-lg border border-input bg-background" />
              <button disabled={isUploading} type="submit" className="w-full flex items-center justify-center gap-2 py-2 bg-foreground text-background font-bold text-sm rounded-lg hover:bg-foreground/90 disabled:opacity-50">
                <UploadCloud className="w-4 h-4" /> {isUploading ? "Uploading..." : "Upload"}
              </button>
            </form>
          </div>
        </aside>

        {/* Main File Area */}
        <section className="lg:col-span-9">
          {loading ? (
            <div className="flex items-center justify-center py-20 opacity-50">
              <Folder className="w-12 h-12 animate-pulse" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border/60 rounded-3xl bg-card/25">
              <UploadCloud className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-1">No files yet</h3>
              <p className="text-sm text-muted-foreground">Upload documents, images, and resources to link to your workspace.</p>
            </div>
          ) : (
            <div className={view === "grid" ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-2"}>
              {files.map(file => (
                <div key={file.id} className={
                  view === "grid" 
                    ? "group bg-card border border-border rounded-2xl p-4 hover:border-foreground/30 hover:shadow-md transition-all flex flex-col items-center text-center gap-3 cursor-pointer relative"
                    : "group bg-card border border-border rounded-xl p-3 hover:bg-accent/30 transition-all flex items-center gap-4 cursor-pointer"
                }>
                  <div className={view === "grid" ? "w-16 h-16 rounded-xl bg-accent flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors" : "w-10 h-10 shrink-0 rounded-lg bg-accent flex items-center justify-center text-muted-foreground"}>
                    {file.fileType === "PNG" || file.fileType === "JPG" || file.fileType === "WEBP" ? (
                      <ImageIcon className={view === "grid" ? "w-8 h-8" : "w-5 h-5"} />
                    ) : (
                      <File className={view === "grid" ? "w-8 h-8" : "w-5 h-5"} />
                    )}
                  </div>
                  <div className={view === "grid" ? "w-full overflow-hidden" : "flex-1 min-w-0 flex items-center justify-between"}>
                    <div>
                      <h4 className="font-bold text-sm truncate">{file.name}</h4>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {file.fileType} • {(file.fileSize || 0) / 1000} KB
                      </div>
                    </div>
                    {view === "list" && (
                      <div className="text-xs text-muted-foreground">{new Date(file.createdAt).toLocaleDateString()}</div>
                    )}
                  </div>
                  
                  {/* Mock Action */}
                  {view === "grid" && (
                    <a href={file.url} target="_blank" rel="noreferrer" className="absolute inset-0 z-10" />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
