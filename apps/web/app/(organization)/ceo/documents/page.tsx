"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText, Upload, Search, Folder, FolderOpen, File,
  ChevronRight, Loader2, AlertCircle, RefreshCw, X,
  FileImage, FileSpreadsheet, Code, Download, CheckCircle2,
} from "lucide-react";
import apiClient from "@/lib/api-client";

/* ── file-type icon helper ── */
function FileIcon({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  const ext = name?.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return <FileImage className={`${className} text-purple-500`} />;
  if (["xls","xlsx","csv"].includes(ext)) return <FileSpreadsheet className={`${className} text-green-600`} />;
  if (["js","ts","tsx","jsx","json","py","sql"].includes(ext)) return <Code className={`${className} text-blue-500`} />;
  if (ext === "pdf") return <FileText className={`${className} text-red-500`} />;
  return <File className={`${className} text-muted-foreground`} />;
}

function fmtSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString();
}

/* ── virtual folder tree (built from API or default) ── */
const DEFAULT_TREE = [
  {
    id: "projects", name: "Projects", icon: "folder", children: [
      { id: "proj-hub",   name: "ManMadhan Progress Hub",   children: [] },
    ],
  },
  {
    id: "organization", name: "Organization", icon: "folder", children: [
      { id: "org-policies", name: "Policies",      children: [] },
      { id: "org-reports",  name: "Reports",       children: [] },
      { id: "org-meetings", name: "Meeting Notes", children: [] },
    ],
  },
  { id: "shared", name: "Shared", icon: "folder", children: [] },
];

export default function CEODocumentsPage() {
  const [folders, setFolders]       = useState<any[]>(DEFAULT_TREE);
  const [files, setFiles]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [activeFolderName, setActiveFolderName] = useState("All Documents");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["projects", "organization"]));
  const [activeTab, setActiveTab]   = useState<"all"|"pending"|"approved">("all");

  /* upload state */
  const [uploading, setUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles]   = useState<File[]>([]);
  const [uploadError, setUploadError]       = useState("");
  const [uploadSuccess, setUploadSuccess]   = useState("");
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fetchDocuments = useCallback(async (folderId?: string | null) => {
    setLoading(true); setError("");
    try {
      const wsId = localStorage.getItem("workspaceId");
      if (!wsId) return;
      const param = folderId ? `&folderId=${folderId}` : "";
      const res   = await apiClient.get(`/folders?workspaceId=${wsId}${param}`);
      if (res.data.success) {
        if (res.data.data?.folders?.length) setFolders(res.data.data.folders);
        setFiles(res.data.data?.files ?? []);
      } else setError("Failed to load documents.");
    } catch { setError("Unable to load documents."); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectFolder = (id: string, name: string) => {
    setActiveFolder(id);
    setActiveFolderName(name);
    fetchDocuments(id);
  };

  const filtered = files.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = (f.name || f.title || "").toLowerCase().includes(q);
    const matchTab =
      activeTab === "all"      ? true :
      activeTab === "pending"  ? f.status === "PENDING" || f.status === "Under Review" :
      activeTab === "approved" ? f.status === "APPROVED" || f.status === "Approved" :
      true;
    return matchSearch && matchTab;
  });

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    setUploadedFiles(prev => [...prev, ...dropped]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleUpload = async () => {
    if (!uploadedFiles.length) return;
    setUploading(true); setUploadError(""); setUploadSuccess("");
    try {
      const wsId = localStorage.getItem("workspaceId");
      const form = new FormData();
      uploadedFiles.forEach(f => form.append("files", f));
      if (wsId)         form.append("workspaceId", wsId);
      if (activeFolder) form.append("folderId", activeFolder);

      await apiClient.post("/folders/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: e => setUploadProgress(Math.round((e.loaded / (e.total ?? 1)) * 100)),
      });

      setUploadSuccess(`${uploadedFiles.length} file${uploadedFiles.length > 1 ? "s" : ""} uploaded.`);
      setUploadedFiles([]);
      setShowUploadPanel(false);
      fetchDocuments(activeFolder);
    } catch (e: any) {
      setUploadError(e.response?.data?.error || "Upload failed.");
    } finally {
      setUploading(false); setUploadProgress(0);
    }
  };

  /* ── folder tree renderer ── */
  const renderTree = (nodes: any[], depth = 0): React.ReactNode =>
    nodes.map(node => {
      const isExpanded = expandedFolders.has(node.id);
      const isActive   = activeFolder === node.id;
      return (
        <div key={node.id}>
          <button
            type="button"
            onClick={() => {
              if (node.children?.length) toggleFolder(node.id);
              selectFolder(node.id, node.name);
            }}
            className={`
              w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-[12px] transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold
              ${isActive ? "bg-gold/10 text-foreground font-semibold" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground font-medium"}
            `}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            {node.children?.length > 0 ? (
              isExpanded
                ? <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                : <Folder className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 shrink-0 opacity-50" />
            )}
            <span className="truncate flex-1">{node.name}</span>
            {node.children?.length > 0 && (
              <ChevronRight className={`w-3 h-3 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
            )}
          </button>
          {isExpanded && node.children?.length > 0 && (
            <div>{renderTree(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });

  return (
    <div className="flex h-full bg-background overflow-hidden">

      {/* ── sidebar: folder tree ── */}
      <aside className="hidden md:flex flex-col w-56 lg:w-64 shrink-0 border-r border-border bg-card overflow-y-auto">
        <div className="px-4 pt-5 pb-3 border-b border-border">
          <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest">
            Documents
          </span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5" aria-label="Folder tree">
          <button
            type="button"
            onClick={() => { setActiveFolder(null); setActiveFolderName("All Documents"); fetchDocuments(null); }}
            className={`
              w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors text-left
              ${!activeFolder ? "bg-gold/10 text-foreground font-semibold" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}
            `}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" /> All Documents
          </button>
          {renderTree(folders)}
        </nav>
      </aside>

      {/* ── main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-5 md:px-7 pt-6 pb-16" style={{ scrollbarWidth: "none" }}>
          <div className="space-y-5 max-w-[960px]">

            {/* page header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                  ManMadhan · CEO
                </p>
                <h1 className="text-[22px] font-bold text-foreground tracking-tight leading-none">
                  {activeFolderName}
                </h1>
                <p className="text-[12px] text-muted-foreground mt-1.5">
                  Organization documents, project files, specifications and reports.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => fetchDocuments(activeFolder)}
                  className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground transition-colors"
                  aria-label="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowUploadPanel(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold hover:bg-gold-hover text-[#111827] text-[12px] font-semibold transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-[12px] text-muted-foreground">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
                <button onClick={() => fetchDocuments(activeFolder)} className="ml-auto font-semibold text-foreground hover:text-gold transition-colors">Retry</button>
              </div>
            )}

            {uploadSuccess && (
              <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-[12px] text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" /> {uploadSuccess}
              </div>
            )}

            {/* search + tabs */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search documents..."
                  className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold"
                />
              </div>
              <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
                {(["all","pending","approved"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors capitalize ${activeTab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* files grid */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 text-gold animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center border border-border border-dashed rounded-2xl">
                <FileText className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-[13px] font-semibold text-foreground">No documents here</p>
                <p className="text-[12px] text-muted-foreground">
                  {search ? "No files match your search." : "Upload a document to get started."}
                </p>
                {!search && (
                  <button
                    onClick={() => setShowUploadPanel(true)}
                    className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold hover:bg-gold-hover text-[#111827] text-[12px] font-semibold transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Document
                  </button>
                )}
              </div>
            ) : (
              <div className="border border-border rounded-2xl overflow-hidden bg-card divide-y divide-border">
                {/* table head */}
                <div className="hidden sm:grid grid-cols-[1fr_120px_100px_120px_80px] gap-4 px-5 py-3 bg-muted/30">
                  {["Name","Type","Size","Uploaded","Status"].map(h => (
                    <span key={h} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{h}</span>
                  ))}
                </div>
                {filtered.map(f => (
                  <div key={f.id} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px_120px_80px] gap-2 sm:gap-4 items-center px-5 py-3.5 hover:bg-muted/20 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileIcon name={f.name || f.title || ""} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-foreground truncate">{f.name || f.title || "Untitled"}</p>
                        {f.folderPath && (
                          <p className="text-[10px] text-muted-foreground truncate">{f.folderPath}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{f.mimeType || f.documentType || "File"}</span>
                    <span className="text-[11px] text-muted-foreground">{fmtSize(f.fileSize || f.size)}</span>
                    <span className="text-[11px] text-muted-foreground">{f.createdAt ? timeAgo(f.createdAt) : "—"}</span>
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${
                        f.status === "APPROVED" || f.status === "Approved"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}>
                        {f.status || "Draft"}
                      </span>
                      <a
                        href={f.url || f.fileUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-all"
                        aria-label="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── upload panel (right drawer) ── */}
      {showUploadPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
              <div>
                <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest">Upload</p>
                <h2 className="text-[16px] font-bold text-foreground mt-0.5">Upload Document</h2>
                {activeFolder && <p className="text-[11px] text-muted-foreground mt-0.5">To: {activeFolderName}</p>}
              </div>
              <button onClick={() => { setShowUploadPanel(false); setUploadedFiles([]); setUploadError(""); }} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              {uploadError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-card border border-border rounded-xl text-[12px] text-muted-foreground">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {uploadError}
                </div>
              )}

              {/* drop zone */}
              <div
                role="button"
                tabIndex={0}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={e => e.key === "Enter" && fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold
                  ${isDragging ? "border-gold bg-gold/5" : "border-border hover:border-gold/50 bg-muted/20"}
                `}
              >
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-[13px] font-semibold text-foreground">Drop files here or click to browse</p>
                <p className="text-[11px] text-muted-foreground mt-1">PDF, DOCX, XLSX, PPTX, PNG, JPG, ZIP — max 50 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.zip,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileSelect}
                />
              </div>

              {/* selected files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 px-3.5 py-3 border border-border rounded-xl bg-muted/20">
                      <FileIcon name={f.name} className="w-4 h-4" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-foreground truncate">{f.name}</p>
                        <p className="text-[10px] text-muted-foreground">{fmtSize(f.size)}</p>
                      </div>
                      {uploading && (
                        <div className="w-16">
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        </div>
                      )}
                      {!uploading && (
                        <button onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <button onClick={() => { setShowUploadPanel(false); setUploadedFiles([]); }} className="px-4 py-2 rounded-xl border border-border text-[12px] font-semibold text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadedFiles.length}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gold hover:bg-gold-hover text-[#111827] text-[12px] font-bold transition-colors disabled:opacity-50"
              >
                {uploading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading {uploadProgress}%</>
                  : <><Upload className="w-3.5 h-3.5" /> Upload {uploadedFiles.length > 0 ? `${uploadedFiles.length} file${uploadedFiles.length > 1 ? "s" : ""}` : ""}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
