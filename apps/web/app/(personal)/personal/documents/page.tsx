"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import { LoaderCircle, Plus, FileText, Search, Folder, Trash2, X, Save, FileBox, UploadCloud } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { useConfirm } from "@/hooks/use-confirm";

export default function DocumentsPage() {
  const { socket, isConnected } = useSocket();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState("Root");
  const { confirm } = useConfirm();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Editor State
  const [activeDocument, setActiveDocument] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [folder, setFolder] = useState("Root");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await apiClient.get("/personal/documents");
      setDocuments(response.data.data);
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on("document_created", (doc: any) => {
      setDocuments(prev => [doc, ...prev]);
    });

    socket.on("document_updated", (doc: any) => {
      setDocuments(prev => prev.map(d => d.id === doc.id ? doc : d));
      if (activeDocument && activeDocument.id === doc.id) {
        setActiveDocument(doc);
      }
    });

    socket.on("document_deleted", ({ id }: { id: string }) => {
      setDocuments(prev => prev.filter(d => d.id !== id));
      if (activeDocument && activeDocument.id === id) {
        setActiveDocument(null);
      }
    });

    return () => {
      socket.off("document_created");
      socket.off("document_updated");
      socket.off("document_deleted");
    };
  }, [socket, isConnected, activeDocument]);

  const handleCreateNew = () => {
    setActiveDocument({ id: "new" });
    setTitle("");
    setContent("");
    setFolder(activeFolder !== "Root" ? activeFolder : "Root");
  };

  const handleSelectDocument = (doc: any) => {
    setActiveDocument(doc);
    setTitle(doc.title);
    setContent(doc.content || "");
    setFolder(doc.folder || "Root");
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (activeDocument.id === "new") {
        const response = await apiClient.post("/personal/documents", {
          title,
          content,
          folder,
          fileType: "markdown"
        });
        setActiveDocument(response.data.data);
      } else {
        const response = await apiClient.patch(`/personal/documents/${activeDocument.id}`, {
          title,
          content,
          folder,
        });
        setActiveDocument(response.data.data);
      }
    } catch (err) {
      console.error("Failed to save document", err);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      alert("File exceeds 1MB limit.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", activeFolder !== "Root" ? activeFolder : "Root");

    try {
      const response = await apiClient.post("/personal/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setActiveDocument(response.data.data);
    } catch (err: any) {
      console.error("Failed to upload document", err);
      if (err.response?.status === 413) {
        alert("File exceeds 1MB limit on the server.");
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({ 
      title: "Delete Document", 
      description: "Are you sure you want to delete this document? This action cannot be undone.", 
      variant: "destructive", 
      confirmLabel: "Delete" 
    });
    if (ok) {
      try {
        await apiClient.delete(`/personal/documents/${docId}`);
      } catch (err) {
        console.error("Failed to delete document", err);
      }
    }
  };

  // Derive unique folders
  const folders = ["Root", ...Array.from(new Set(documents.map(d => d.folder).filter(Boolean))).filter(f => f !== "Root")];

  const filteredDocuments = documents.filter(d => {
    if (activeFolder !== "Root" && d.folder !== activeFolder) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      if (!d.title?.toLowerCase().includes(s) && !d.originalName?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="w-full h-full flex bg-[#FAFAFA] dark:bg-[#080808] animate-in fade-in duration-500">
      
      {/* Sidebar: Documents List */}
      <div className={`w-full md:w-[320px] lg:w-[380px] h-full flex flex-col border-r border-[#E5E7EB] dark:border-[#242424] bg-white dark:bg-[#111111] ${activeDocument ? 'hidden md:flex' : 'flex'}`}>
        
        <div className="p-4 border-b border-[#E5E7EB] dark:border-[#242424]">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#171717] dark:text-[#F5F5F5]">Documents</h1>
            <button 
              onClick={handleCreateNew}
              className="w-8 h-8 rounded-full bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] flex items-center justify-center hover:bg-[#333333] dark:hover:bg-[#E5E7EB] transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
            <input 
              type="text" 
              placeholder="Search documents..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-md border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B] transition-colors"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {folders.map(f => (
              <button 
                key={f}
                onClick={() => setActiveFolder(f as string)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeFolder === f ? 'bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808]' : 'bg-[#F4F4F5] dark:bg-[#1D1D1D] text-[#52525B] dark:text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5]'}`}
              >
                {f as React.ReactNode}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex justify-center p-8">
              <LoaderCircle className="w-6 h-6 text-[#A1A1AA] animate-spin" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-[#A1A1AA]">
              <FileBox className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No documents found.</p>
            </div>
          ) : (
            filteredDocuments.map(doc => (
              <div 
                key={doc.id}
                onClick={() => handleSelectDocument(doc)}
                className={`group cursor-pointer p-3 rounded-xl border transition-all ${activeDocument?.id === doc.id ? 'bg-white dark:bg-[#1A1A1A] border-[#E5E7EB] dark:border-[#333333] shadow-sm' : 'bg-transparent border-transparent hover:bg-[#F4F4F5]/50 dark:hover:bg-[#1D1D1D]/50'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#A1A1AA]" />
                    <h4 className="text-sm font-semibold truncate text-[#171717] dark:text-[#F5F5F5]">
                      {doc.title || "Untitled Document"}
                    </h4>
                  </div>
                  <button onClick={(e) => deleteDocument(doc.id, e)} className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-[#E5E7EB] dark:hover:bg-[#333333] text-[#A1A1AA] hover:text-red-500 transition-opacity">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between text-[11px] text-[#A1A1AA] mt-2">
                  <span>{new Date(doc.updatedAt || doc.createdAt).toLocaleDateString()}</span>
                  <span className="px-1.5 py-0.5 rounded-sm bg-[#E5E7EB]/50 dark:bg-[#242424] text-[10px] flex items-center gap-1">
                    <Folder className="w-3 h-3" /> {doc.folder}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      {activeDocument ? (
        <div className="flex-1 h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300 bg-white dark:bg-[#080808]">
          
          <div className="h-14 border-b border-[#E5E7EB] dark:border-[#242424] bg-white dark:bg-[#111111] flex items-center justify-between px-4 lg:px-8">
            <div className="flex items-center gap-4">
              <button onClick={() => setActiveDocument(null)} className="md:hidden text-[#A1A1AA] hover:text-[#171717]">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-sm text-[#52525B] dark:text-[#A1A1AA]">
                <Folder className="w-4 h-4" />
                <input 
                  type="text" 
                  value={folder} 
                  onChange={(e) => setFolder(e.target.value)}
                  placeholder="Folder"
                  className="bg-transparent focus:outline-none w-32 border-b border-transparent focus:border-[#E5E7EB] dark:focus:border-[#242424] transition-colors"
                />
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className="h-8 px-4 rounded-md bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-medium hover:bg-[#333333] dark:hover:bg-[#E5E7EB] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="hidden sm:inline">Save</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div className="max-w-4xl mx-auto h-full flex flex-col">
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document Title"
                className="w-full text-3xl lg:text-4xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 text-[#171717] dark:text-[#F5F5F5] placeholder:text-[#E5E7EB] dark:placeholder:text-[#242424] mb-6 leading-tight tracking-tight"
              />
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your document content here..."
                className="flex-1 w-full bg-transparent border-none focus:outline-none focus:ring-0 text-[#171717] dark:text-[#F5F5F5] text-[15px] lg:text-[16px] leading-relaxed resize-none placeholder:text-[#A1A1AA]"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 h-full flex-col items-center justify-center p-8 text-center bg-[#FAFAFA] dark:bg-[#080808]">
          <FileBox className="w-16 h-16 text-[#E5E7EB] dark:text-[#242424] mb-4" />
          <h2 className="text-2xl font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">Select a document</h2>
          <p className="text-[#52525B] dark:text-[#A1A1AA] max-w-sm mb-6">
            Choose a document from the sidebar or create a new one.
          </p>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleCreateNew}
              className="h-10 px-6 rounded-full bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-medium hover:bg-[#333333] dark:hover:bg-[#E5E7EB] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Document
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              onChange={handleFileUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-10 px-6 rounded-full bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] text-[#171717] dark:text-[#F5F5F5] text-sm font-medium hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {uploading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              Upload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
