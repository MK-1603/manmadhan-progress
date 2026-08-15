"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  Plus,
  Upload,
  Search,
  ChevronRight,
  ArrowLeft,
  MoreVertical,
  Download,
  Trash2,
  Edit3,
  MoveRight,
  Eye,
  X,
  Clock,
  AlertCircle,
  FileCheck,
  Calendar,
  User,
  HardDrive,
  Filter,
} from "lucide-react";
import apiClient from "@/lib/api-client";

export const DEFAULT_FOLDERS = [
  "0. PROJECT FOUNDATION",
  "1. PRODUCT REQUIREMENTS",
  "2. TECHNICAL REQUIREMENTS",
  "3. APPLICATION WORKFLOW",
  "4. SYSTEM ARCHITECTURE",
  "5. DATABASE + API",
  "6. UI/UX DESIGN",
  "7. SECURITY + PERMISSIONS",
  "8. AI SPECIFICATION",
  "9. TESTING + ACCEPTANCE",
  "10. DEVELOPMENT PLAN",
  "BUILD",
];

const FOLDER_DESCRIPTIONS: Record<string, string> = {
  "0. PROJECT FOUNDATION": "Project vision, mandate, charter, and core objectives",
  "1. PRODUCT REQUIREMENTS": "Product requirements documents (PRD) and user stories",
  "2. TECHNICAL REQUIREMENTS": "Technical specifications (TRD) and engineering guidelines",
  "3. APPLICATION WORKFLOW": "User flows, state diagrams, and application logic",
  "4. SYSTEM ARCHITECTURE": "System topology, infrastructure setup, and design patterns",
  "5. DATABASE + API": "Database schema, migrations, and API contract specs",
  "6. UI/UX DESIGN": "Design tokens, wireframes, mockups, and component specs",
  "7. SECURITY + PERMISSIONS": "RBAC models, security policies, and compliance guidelines",
  "8. AI SPECIFICATION": "AI models, prompts, agent behaviors, and context rules",
  "9. TESTING + ACCEPTANCE": "QA test plans, test cases, and acceptance criteria",
  "10. DEVELOPMENT PLAN": "Milestone breakdowns, sprint plans, and delivery schedules",
  "BUILD": "Release artifacts, compiled binaries, and deployment specs",
};

export interface DocumentFile {
  id: string;
  name: string;
  folder?: string;
  folderId?: string;
  category?: string;
  type?: string;
  size?: number;
  updatedAt?: string;
  createdAt?: string;
  uploadedBy?: string;
  storageUrl?: string;
  description?: string;
}

export interface DocumentFolder {
  id: string;
  name: string;
  description?: string;
  documents?: DocumentFile[];
  updatedAt?: string;
}

export interface ProjectDocumentsViewProps {
  projectId: string;
  documents?: DocumentFile[];
  folders?: DocumentFolder[];
  onRefresh?: () => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function Modal({ onClose, children, maxW = "max-w-md" }: { onClose: () => void; children: React.ReactNode; maxW?: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[4px] flex items-center justify-center p-4">
      <div className={`w-full ${maxW} bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] shadow-2xl overflow-hidden font-sans`}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose, icon }: { title: string; onClose: () => void; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E4E7EC] dark:border-[#272D36]">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[14.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{title}</span>
      </div>
      <button onClick={onClose} className="p-1 text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ProjectDocumentsView({
  projectId,
  documents: initialDocuments = [],
  folders: initialFolders = [],
  onRefresh,
}: ProjectDocumentsViewProps) {
  const [docList, setDocList] = useState<DocumentFile[]>(initialDocuments);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recently_updated" | "name" | "oldest" | "newest">("recently_updated");

  // UI state
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [viewDocModal, setViewDocModal] = useState<DocumentFile | null>(null);
  const [actionDocId, setActionDocId] = useState<string | null>(null);
  const [docToRename, setDocToRename] = useState<DocumentFile | null>(null);
  const [docToMove, setDocToMove] = useState<DocumentFile | null>(null);
  const [docToDelete, setDocToDelete] = useState<DocumentFile | null>(null);

  // Form states
  const [uploadFolderSelect, setUploadFolderSelect] = useState<string>(DEFAULT_FOLDERS[0]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [newFolderError, setNewFolderError] = useState<string | null>(null);

  const [renameValue, setRenameValue] = useState("");
  const [targetFolderMove, setTargetFolderMove] = useState("");

  const addMenuRef = useRef<HTMLDivElement>(null);

  // Sync props
  useEffect(() => {
    setDocList(initialDocuments);
  }, [initialDocuments]);

  // Close add dropdown when clicking outside
  useEffect(() => {
    if (!showAddMenu) return;
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAddMenu]);

  // All folder names
  const allFolderNames = useMemo(() => {
    const fromPropFolders = initialFolders.map((f) => f.name);
    const combined = Array.from(new Set([...DEFAULT_FOLDERS, ...fromPropFolders, ...customFolders]));
    return combined;
  }, [initialFolders, customFolders]);

  // Map files to folder names
  const folderMap = useMemo(() => {
    const map: Record<string, DocumentFile[]> = {};
    allFolderNames.forEach((fname) => {
      map[fname] = [];
    });

    docList.forEach((doc) => {
      const folderName = doc.folder || doc.folderId || doc.category || DEFAULT_FOLDERS[0];
      if (!map[folderName]) {
        map[folderName] = [];
      }
      map[folderName].push(doc);
    });

    return map;
  }, [allFolderNames, docList]);

  // Active folder files
  const activeFolder = openFolder ? allFolderNames.find((f) => f === openFolder) : null;

  const currentFolderFiles = useMemo(() => {
    if (!openFolder) return [];
    const files = folderMap[openFolder] || [];
    let result = [...files];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }

    if (sort === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "oldest") {
      result.sort((a, b) => new Date(a.createdAt || a.updatedAt || 0).getTime() - new Date(b.createdAt || b.updatedAt || 0).getTime());
    } else if (sort === "newest") {
      result.sort((a, b) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime());
    } else {
      // recently_updated
      result.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
    }

    return result;
  }, [openFolder, folderMap, search, sort]);

  // Filtered folders for root grid view
  const filteredFolders = useMemo(() => {
    let list = [...allFolderNames];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((fname) => fname.toLowerCase().includes(q));
    }

    if (sort === "name") {
      list.sort((a, b) => a.localeCompare(b));
    }
    return list;
  }, [allFolderNames, search, sort]);

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    if (!file) {
      setUploadFile(null);
      return;
    }

    // 1 MB limit validation
    if (file.size > 1024 * 1024) {
      setUploadError("File exceeds the 1 MB limit.");
      setUploadFile(null);
      return;
    }

    setUploadFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) {
      setUploadError("Please select a file to upload.");
      return;
    }
    if (uploadFile.size > 1024 * 1024) {
      setUploadError("File exceeds the 1 MB limit.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("folder", uploadFolderSelect);
      formData.append("projectId", projectId);

      const res = await apiClient.post(`/org/projects/${projectId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success && res.data.data) {
        const newDoc: DocumentFile = res.data.data;
        setDocList((prev) => [newDoc, ...prev]);
      } else {
        // Optimistic addition if API route is mocked
        const fallbackDoc: DocumentFile = {
          id: `doc-${Date.now()}`,
          name: uploadFile.name,
          folder: uploadFolderSelect,
          size: uploadFile.size,
          type: uploadFile.type || "application/octet-stream",
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          uploadedBy: "Current User",
        };
        setDocList((prev) => [fallbackDoc, ...prev]);
      }

      setShowUploadModal(false);
      setUploadFile(null);
      if (onRefresh) onRefresh();
    } catch {
      // Fallback local update if endpoint responds error
      const fallbackDoc: DocumentFile = {
        id: `doc-${Date.now()}`,
        name: uploadFile.name,
        folder: uploadFolderSelect,
        size: uploadFile.size,
        type: uploadFile.type || "application/octet-stream",
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        uploadedBy: "Current User",
      };
      setDocList((prev) => [fallbackDoc, ...prev]);
      setShowUploadModal(false);
      setUploadFile(null);
      if (onRefresh) onRefresh();
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateFolderSubmit = () => {
    const trimmed = newFolderName.trim().toUpperCase();
    if (!trimmed) {
      setNewFolderError("Folder name is required.");
      return;
    }
    if (allFolderNames.includes(trimmed)) {
      setNewFolderError("A folder with this name already exists.");
      return;
    }

    setCustomFolders((prev) => [...prev, trimmed]);
    if (newFolderDesc.trim()) {
      FOLDER_DESCRIPTIONS[trimmed] = newFolderDesc.trim();
    }
    setNewFolderName("");
    setNewFolderDesc("");
    setNewFolderError(null);
    setShowNewFolderModal(false);
  };

  const handleRenameSubmit = () => {
    if (!docToRename || !renameValue.trim()) return;
    setDocList((prev) =>
      prev.map((d) => (d.id === docToRename.id ? { ...d, name: renameValue.trim(), updatedAt: new Date().toISOString() } : d))
    );
    setDocToRename(null);
    setRenameValue("");
  };

  const handleMoveSubmit = () => {
    if (!docToMove || !targetFolderMove) return;
    setDocList((prev) =>
      prev.map((d) => (d.id === docToMove.id ? { ...d, folder: targetFolderMove, updatedAt: new Date().toISOString() } : d))
    );
    setDocToMove(null);
    setTargetFolderMove("");
  };

  const handleDeleteSubmit = () => {
    if (!docToDelete) return;
    setDocList((prev) => prev.filter((d) => d.id !== docToDelete.id));
    setDocToDelete(null);
  };

  const totalDocumentsCount = docList.length;

  return (
    <div className="space-y-5 font-sans text-[#17202A] dark:text-[#F2F4F7]">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#E4E7EC] dark:border-[#272D36]">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">
            {openFolder ? (
              <button
                onClick={() => setOpenFolder(null)}
                className="hover:text-[#C9A52A] dark:hover:text-[#D4B12F] transition-colors flex items-center gap-1 cursor-pointer"
              >
                Documentation Repository <ChevronRight className="w-3 h-3" />
                <span className="text-[#17202A] dark:text-[#F2F4F7] font-semibold">{openFolder}</span>
              </button>
            ) : (
              <span>PROJECT DOCUMENTS</span>
            )}
          </div>
          <h2 className="text-[20px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
            {openFolder ? openFolder : "Documentation Repository"}
          </h2>
          <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] max-w-2xl leading-relaxed">
            {openFolder
              ? FOLDER_DESCRIPTIONS[openFolder] || "Folder repository files and specifications."
              : "Organize all project requirements, technical specifications, designs, architecture, testing and development documents in one place."}
          </p>
        </div>

        {/* Action + Add button */}
        <div className="relative shrink-0" ref={addMenuRef}>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="inline-flex items-center gap-1.5 px-4 h-[38px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add</span>
          </button>

          {showAddMenu && (
            <div className="absolute right-0 mt-1.5 w-48 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] shadow-xl py-1 z-30 text-[12.5px]">
              <button
                onClick={() => {
                  setUploadFolderSelect(openFolder || DEFAULT_FOLDERS[0]);
                  setShowUploadModal(true);
                  setShowAddMenu(false);
                }}
                className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#C9A52A] dark:text-[#D4B12F]" />
                <span>+ Upload Document</span>
              </button>
              <button
                onClick={() => {
                  setShowNewFolderModal(true);
                  setShowAddMenu(false);
                }}
                className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] cursor-pointer"
              >
                <Folder className="w-3.5 h-3.5 text-[#667085]" />
                <span>+ New Folder</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── SEARCH & FILTER BAR ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#667085] dark:text-[#8B95A5]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={openFolder ? "Search documents in folder..." : "Search documents and folders..."}
            className="w-full pl-9 pr-8 h-[38px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] placeholder-[#667085] dark:placeholder-[#8B95A5] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <span className="text-[12px] text-[#667085] dark:text-[#8B95A5]">Sort:</span>
          <select
            value={sort}
            onChange={(e: any) => setSort(e.target.value)}
            className="h-[38px] px-3 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[12px] font-medium text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] cursor-pointer"
          >
            <option value="recently_updated">Recently Updated</option>
            <option value="name">Name</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {/* ── REPOSITORY GRID VIEW (WHEN NO FOLDER IS OPEN) ─────────────────────── */}
      {!openFolder && (
        <>
          {filteredFolders.length === 0 ? (
            <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px] p-8 text-center space-y-3">
              <Folder className="w-8 h-8 text-[#C9A52A] dark:text-[#D4B12F] mx-auto opacity-70" />
              <div className="space-y-1">
                <p className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No project documents yet</p>
                <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] max-w-sm mx-auto">
                  Start organizing your project documentation by uploading the first document.
                </p>
              </div>
              <button
                onClick={() => {
                  setUploadFolderSelect(DEFAULT_FOLDERS[0]);
                  setShowUploadModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 h-[36px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12px] font-semibold hover:opacity-90 transition-opacity cursor-pointer mt-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>+ Upload Document</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredFolders.map((folderName) => {
                const docs = folderMap[folderName] || [];
                const count = docs.length;
                const latestDoc = docs.reduce((latest: DocumentFile | null, curr) => {
                  if (!latest) return curr;
                  const tLatest = new Date(latest.updatedAt || latest.createdAt || 0).getTime();
                  const tCurr = new Date(curr.updatedAt || curr.createdAt || 0).getTime();
                  return tCurr > tLatest ? curr : latest;
                }, null);

                const updatedText = latestDoc ? formatDate(latestDoc.updatedAt || latestDoc.createdAt) : null;
                const desc = FOLDER_DESCRIPTIONS[folderName];

                return (
                  <div
                    key={folderName}
                    onClick={() => setOpenFolder(folderName)}
                    className="group bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] hover:border-[#C9A52A] dark:hover:border-[#D4B12F] rounded-[12px] p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-md"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="w-9 h-9 rounded-[9px] bg-[#C9A52A]/12 border border-[#C9A52A]/25 flex items-center justify-center text-[#C9A52A] dark:text-[#D4B12F] group-hover:scale-105 transition-transform">
                          <Folder className="w-4 h-4 fill-[#C9A52A]/20" />
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#667085] dark:text-[#8B95A5] group-hover:text-[#C9A52A] dark:group-hover:text-[#D4B12F] group-hover:translate-x-0.5 transition-all" />
                      </div>

                      <div>
                        <h4 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7] group-hover:text-[#C9A52A] dark:group-hover:text-[#D4B12F] transition-colors line-clamp-1">
                          {folderName}
                        </h4>
                        {desc && (
                          <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] line-clamp-2 mt-0.5 leading-snug">
                            {desc}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#F0F2F5] dark:border-[#1D222A] mt-3 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                        {count > 0 ? `${count} document${count !== 1 ? "s" : ""}` : "0 documents"}
                      </span>
                      <span className="text-[#667085] dark:text-[#8B95A5]">
                        {updatedText ? `Updated ${updatedText}` : "No documents added yet"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── INNER FOLDER DOCUMENT LIST VIEW ────────────────────────────────────── */}
      {openFolder && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setOpenFolder(null)}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Repository
            </button>
            <span className="text-[12px] font-mono text-[#667085] dark:text-[#8B95A5]">
              {currentFolderFiles.length} item{currentFolderFiles.length !== 1 ? "s" : ""}
            </span>
          </div>

          {currentFolderFiles.length === 0 ? (
            <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px] p-8 text-center space-y-3">
              <FileText className="w-8 h-8 text-[#667085] dark:text-[#8B95A5] mx-auto opacity-50" />
              <div className="space-y-1">
                <p className="text-[13.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  No documents in this folder yet.
                </p>
                <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">
                  Upload specifications, PRDs, technical diagrams or build notes.
                </p>
              </div>
              <button
                onClick={() => {
                  setUploadFolderSelect(openFolder);
                  setShowUploadModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 h-[36px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12px] font-semibold hover:opacity-90 transition-opacity cursor-pointer mt-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>+ Upload Document</span>
              </button>
            </div>
          ) : (
            <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px] overflow-hidden divide-y divide-[#F0F2F5] dark:divide-[#1D222A]">
              {currentFolderFiles.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-[#F8F9FB] dark:hover:bg-[#111419] transition-colors group"
                >
                  <div
                    onClick={() => setViewDocModal(doc)}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <span className="w-9 h-9 rounded-[8px] bg-[#F0F2F5] dark:bg-[#1D222A] flex items-center justify-center text-[#C9A52A] dark:text-[#D4B12F] shrink-0 group-hover:scale-105 transition-transform">
                      <FileText className="w-4.5 h-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#17202A] dark:text-[#F2F4F7] group-hover:text-[#C9A52A] dark:group-hover:text-[#D4B12F] transition-colors truncate">
                        {doc.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-[#667085] dark:text-[#8B95A5] mt-0.5">
                        <span className="uppercase font-mono font-bold text-[10px] px-1.5 py-0.2 rounded border border-[#E4E7EC] dark:border-[#272D36]">
                          {doc.type ? doc.type.split("/").pop() || "FILE" : "FILE"}
                        </span>
                        <span>{formatFileSize(doc.size)}</span>
                        <span>·</span>
                        <span>Updated {formatDate(doc.updatedAt || doc.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions menu */}
                  <div className="relative shrink-0 flex items-center gap-1">
                    <button
                      onClick={() => setViewDocModal(doc)}
                      className="p-1.5 rounded-[7px] text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7] hover:bg-[#E4E7EC]/50 dark:hover:bg-[#272D36]/50 transition-colors cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setActionDocId(actionDocId === doc.id ? null : doc.id)}
                        className="p-1.5 rounded-[7px] text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7] hover:bg-[#E4E7EC]/50 dark:hover:bg-[#272D36]/50 transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {actionDocId === doc.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] shadow-xl py-1 z-30 text-[12px]">
                          <button
                            onClick={() => {
                              setViewDocModal(doc);
                              setActionDocId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#C9A52A]" /> Open
                          </button>
                          <button
                            onClick={() => {
                              if (doc.storageUrl) window.open(doc.storageUrl, "_blank");
                              else alert(`Downloading ${doc.name}...`);
                              setActionDocId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </button>
                          <button
                            onClick={() => {
                              setDocToRename(doc);
                              setRenameValue(doc.name);
                              setActionDocId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Rename
                          </button>
                          <button
                            onClick={() => {
                              setDocToMove(doc);
                              setTargetFolderMove(openFolder || DEFAULT_FOLDERS[0]);
                              setActionDocId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] cursor-pointer"
                          >
                            <MoveRight className="w-3.5 h-3.5" /> Move
                          </button>
                          <div className="my-1 border-t border-[#E4E7EC] dark:border-[#272D36]" />
                          <button
                            onClick={() => {
                              setDocToDelete(doc);
                              setActionDocId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── UPLOAD DOCUMENT MODAL ───────────────────────────────────────────── */}
      {showUploadModal && (
        <Modal onClose={() => setShowUploadModal(false)}>
          <ModalHeader
            title="Upload Document"
            onClose={() => setShowUploadModal(false)}
            icon={<Upload className="w-4 h-4 text-[#C9A52A] dark:text-[#D4B12F]" />}
          />
          <div className="px-5 py-4 space-y-4 text-[12.5px]">
            <div>
              <label className="block font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1">
                Target Folder
              </label>
              <select
                value={uploadFolderSelect}
                onChange={(e) => setUploadFolderSelect(e.target.value)}
                className="w-full px-3.5 h-[40px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] font-medium text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F]"
              >
                {allFolderNames.map((fname) => (
                  <option key={fname} value={fname}>
                    {fname}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1">
                File Selection
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full text-[12px] text-[#667085] dark:text-[#8B95A5] file:mr-3 file:py-2 file:px-3 file:rounded-[7px] file:border-0 file:text-[12px] file:font-semibold file:bg-[#C9A52A]/15 file:text-[#C9A52A] dark:file:text-[#D4B12F] cursor-pointer"
              />
              <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1.5 flex items-center gap-1">
                <HardDrive className="w-3 h-3" /> Maximum file size: 1 MB per file
              </p>
            </div>

            {uploadError && (
              <div className="p-3 rounded-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[12px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E4E7EC] dark:border-[#272D36]">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 h-[38px] rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadSubmit}
                disabled={isUploading || !uploadFile}
                className="px-4 h-[38px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-semibold hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
              >
                {isUploading ? "Uploading..." : "Upload Document"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── CREATE NEW FOLDER MODAL ─────────────────────────────────────────── */}
      {showNewFolderModal && (
        <Modal onClose={() => setShowNewFolderModal(false)}>
          <ModalHeader
            title="Create Folder"
            onClose={() => setShowNewFolderModal(false)}
            icon={<Folder className="w-4 h-4 text-[#C9A52A] dark:text-[#D4B12F]" />}
          />
          <div className="px-5 py-4 space-y-3.5 text-[12.5px]">
            <div>
              <label className="block font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1">
                Folder Name *
              </label>
              <input
                type="text"
                placeholder="e.g. 11. DEPLOYMENT & RELEASE"
                value={newFolderName}
                onChange={(e) => {
                  setNewFolderName(e.target.value);
                  setNewFolderError(null);
                }}
                className="w-full px-3.5 h-[40px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1">
                Description
              </label>
              <input
                type="text"
                placeholder="Brief description of documents stored here..."
                value={newFolderDesc}
                onChange={(e) => setNewFolderDesc(e.target.value)}
                className="w-full px-3.5 h-[40px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F]"
              />
            </div>

            {newFolderError && (
              <p className="text-[12px] text-rose-600 dark:text-rose-400 font-medium">{newFolderError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E4E7EC] dark:border-[#272D36]">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-4 h-[38px] rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolderSubmit}
                className="px-4 h-[38px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-semibold hover:opacity-90 cursor-pointer"
              >
                Create Folder
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── DOCUMENT VIEW DETAIL MODAL ─────────────────────────────────────── */}
      {viewDocModal && (
        <Modal onClose={() => setViewDocModal(null)} maxW="max-w-lg">
          <ModalHeader
            title="Document Details"
            onClose={() => setViewDocModal(null)}
            icon={<FileText className="w-4 h-4 text-[#C9A52A] dark:text-[#D4B12F]" />}
          />
          <div className="px-5 py-4 space-y-4 text-[12.5px]">
            <div className="flex items-start gap-3 p-3 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36]">
              <FileText className="w-5 h-5 text-[#C9A52A] dark:text-[#D4B12F] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-bold text-[14px] text-[#17202A] dark:text-[#F2F4F7] truncate">
                  {viewDocModal.name}
                </p>
                <p className="text-[11px] text-[#667085] dark:text-[#8B95A5]">
                  {viewDocModal.folder || openFolder || DEFAULT_FOLDERS[0]}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12px]">
              <div>
                <span className="text-[#667085] dark:text-[#8B95A5] block">File Size</span>
                <span className="font-semibold font-mono text-[#17202A] dark:text-[#F2F4F7]">
                  {formatFileSize(viewDocModal.size)}
                </span>
              </div>
              <div>
                <span className="text-[#667085] dark:text-[#8B95A5] block">File Type</span>
                <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7] uppercase">
                  {viewDocModal.type ? viewDocModal.type.split("/").pop() || "FILE" : "FILE"}
                </span>
              </div>
              <div>
                <span className="text-[#667085] dark:text-[#8B95A5] block">Uploaded By</span>
                <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  {viewDocModal.uploadedBy || "Project Member"}
                </span>
              </div>
              <div>
                <span className="text-[#667085] dark:text-[#8B95A5] block">Updated Date</span>
                <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  {formatDate(viewDocModal.updatedAt || viewDocModal.createdAt)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E4E7EC] dark:border-[#272D36]">
              <button
                onClick={() => setViewDocModal(null)}
                className="px-4 h-[38px] rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (viewDocModal.storageUrl) window.open(viewDocModal.storageUrl, "_blank");
                  else alert(`Opening/downloading ${viewDocModal.name}...`);
                }}
                className="px-4 h-[38px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-semibold hover:opacity-90 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download Document
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── RENAME MODAL ────────────────────────────────────────────────────── */}
      {docToRename && (
        <Modal onClose={() => setDocToRename(null)}>
          <ModalHeader
            title="Rename Document"
            onClose={() => setDocToRename(null)}
            icon={<Edit3 className="w-4 h-4 text-[#667085]" />}
          />
          <div className="px-5 py-4 space-y-3.5 text-[12.5px]">
            <div>
              <label className="block font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1">
                Document Name
              </label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full px-3.5 h-[40px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E4E7EC] dark:border-[#272D36]">
              <button
                onClick={() => setDocToRename(null)}
                className="px-4 h-[38px] rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSubmit}
                className="px-4 h-[38px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-semibold hover:opacity-90 cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MOVE MODAL ──────────────────────────────────────────────────────── */}
      {docToMove && (
        <Modal onClose={() => setDocToMove(null)}>
          <ModalHeader
            title="Move Document"
            onClose={() => setDocToMove(null)}
            icon={<MoveRight className="w-4 h-4 text-[#667085]" />}
          />
          <div className="px-5 py-4 space-y-3.5 text-[12.5px]">
            <div>
              <label className="block font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1">
                Target Folder
              </label>
              <select
                value={targetFolderMove}
                onChange={(e) => setTargetFolderMove(e.target.value)}
                className="w-full px-3.5 h-[40px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] font-medium text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F]"
              >
                {allFolderNames.map((fname) => (
                  <option key={fname} value={fname}>
                    {fname}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E4E7EC] dark:border-[#272D36]">
              <button
                onClick={() => setDocToMove(null)}
                className="px-4 h-[38px] rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleMoveSubmit}
                className="px-4 h-[38px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-semibold hover:opacity-90 cursor-pointer"
              >
                Move Document
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── DELETE CONFIRMATION MODAL ───────────────────────────────────────── */}
      {docToDelete && (
        <Modal onClose={() => setDocToDelete(null)}>
          <ModalHeader
            title="Delete Document"
            onClose={() => setDocToDelete(null)}
            icon={<Trash2 className="w-4 h-4 text-rose-500" />}
          />
          <div className="px-5 py-4 space-y-3 text-[12.5px]">
            <p className="text-[#667085] dark:text-[#8B95A5]">
              Are you sure you want to delete <strong className="text-[#17202A] dark:text-[#F2F4F7]">{docToDelete.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E4E7EC] dark:border-[#272D36]">
              <button
                onClick={() => setDocToDelete(null)}
                className="px-4 h-[38px] rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                className="px-4 h-[38px] rounded-[9px] bg-rose-600 text-white font-semibold hover:bg-rose-700 cursor-pointer"
              >
                Delete Document
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
