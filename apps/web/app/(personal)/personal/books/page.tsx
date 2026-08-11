"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import { LoaderCircle, Plus, Book, Image as ImageIcon, Search, Trash2, X } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { useConfirm } from "@/hooks/use-confirm";

export default function BooksPage() {
  const { socket, isConnected } = useSocket();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { confirm } = useConfirm();

  // Modal State
  const [showBookModal, setShowBookModal] = useState(false);
  const [newBook, setNewBook] = useState({ title: "", author: "", coverUrl: "", pageCount: 300, status: "Want to Read" });
  const [saving, setSaving] = useState(false);

  const fetchBooks = useCallback(async () => {
    try {
      const response = await apiClient.get("/personal/books");
      setBooks(response.data.data);
    } catch (err) {
      console.error("Failed to load books", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on("book_created", (book: any) => {
      setBooks(prev => [book, ...prev]);
    });

    socket.on("book_updated", (book: any) => {
      setBooks(prev => prev.map(b => b.id === book.id ? book : b));
    });

    socket.on("book_deleted", ({ id }: { id: string }) => {
      setBooks(prev => prev.filter(b => b.id !== id));
    });

    return () => {
      socket.off("book_created");
      socket.off("book_updated");
      socket.off("book_deleted");
    };
  }, [socket, isConnected]);

  const handleCreateBook = async () => {
    if (!newBook.title.trim()) return;
    setSaving(true);
    try {
      await apiClient.post("/personal/books", newBook);
      setShowBookModal(false);
      setNewBook({ title: "", author: "", coverUrl: "", pageCount: 300, status: "Want to Read" });
    } catch (err) {
      console.error("Failed to create book", err);
    } finally {
      setSaving(false);
    }
  };

  const deleteBook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({ title: "Confirm Action", description: "Delete this book?", variant: "destructive", confirmLabel: "Confirm" });
    if (ok) {
      try {
        await apiClient.delete(`/personal/books/${id}`);
      } catch (err) {
        console.error("Failed to delete", err);
      }
    }
  };

  const filteredBooks = books.filter(b => {
    if (search.trim()) {
      const s = search.toLowerCase();
      if (!b.title?.toLowerCase().includes(s) && !b.author?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto animate-in fade-in duration-500 overflow-y-auto hide-scrollbar">
      
      {/* Header */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] sm:text-[40px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-tight tracking-tight mb-2">
            Library
          </h1>
          <p className="text-[16px] text-[#52525B] dark:text-[#A1A1AA] max-w-[600px]">
            Curate your reading list and track your literary journey.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative min-w-[200px] flex-1 lg:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
            <input 
              type="text" 
              placeholder="Search books..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-full border border-[#E5E7EB] dark:border-[#242424] bg-white dark:bg-[#111111] text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B] transition-colors"
            />
          </div>
          <button 
            onClick={() => setShowBookModal(true)}
            className="h-10 px-4 rounded-full bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-medium hover:bg-[#333333] dark:hover:bg-[#E5E7EB] transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Book
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoaderCircle className="w-8 h-8 text-[#A1A1AA] animate-spin" />
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 border border-dashed border-[#E5E7EB] dark:border-[#242424] rounded-2xl bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-center">
          <Book className="w-12 h-12 text-[#A1A1AA] dark:text-[#52525B] mb-4" />
          <h3 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">No books found</h3>
          <p className="text-[#52525B] dark:text-[#A1A1AA] max-w-md">
            Your library is empty. Add a book you're reading or want to read.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {filteredBooks.map(book => (
            <div key={book.id} className="group relative flex flex-col">
              <button 
                onClick={(e) => deleteBook(book.id, e)}
                className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-[#F4F4F5] dark:bg-[#1D1D1D] mb-3 shadow-sm border border-[#E5E7EB] dark:border-[#242424] flex items-center justify-center relative">
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-[#A1A1AA]" />
                )}
                
                {book.status === "Reading" && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-[#E5E7EB] dark:bg-[#333333]">
                    <div 
                      className="h-full bg-[#171717] dark:bg-[#F5F5F5]" 
                      style={{ width: `${Math.min(100, Math.round(((book.currentPage || 0) / (book.pageCount || 1)) * 100))}%` }} 
                    />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="text-sm font-bold text-[#171717] dark:text-[#F5F5F5] leading-tight line-clamp-2 mb-1 group-hover:text-blue-500 transition-colors">
                  {book.title}
                </h3>
                <p className="text-xs text-[#52525B] dark:text-[#A1A1AA] line-clamp-1">{book.author || "Unknown Author"}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Book Modal */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5]">Add New Book</h2>
              <button onClick={() => setShowBookModal(false)} className="text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1.5">Book Title</label>
                <input 
                  type="text" 
                  value={newBook.title} 
                  onChange={(e) => setNewBook({...newBook, title: e.target.value})}
                  className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#242424] bg-transparent text-[#171717] dark:text-[#F5F5F5] text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1.5">Author</label>
                <input 
                  type="text" 
                  value={newBook.author} 
                  onChange={(e) => setNewBook({...newBook, author: e.target.value})}
                  className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#242424] bg-transparent text-[#171717] dark:text-[#F5F5F5] text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1.5">Cover Image URL (Optional)</label>
                <input 
                  type="text" 
                  value={newBook.coverUrl} 
                  onChange={(e) => setNewBook({...newBook, coverUrl: e.target.value})}
                  className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#242424] bg-transparent text-[#171717] dark:text-[#F5F5F5] text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1.5">Total Pages</label>
                  <input 
                    type="number" 
                    value={newBook.pageCount} 
                    onChange={(e) => setNewBook({...newBook, pageCount: parseInt(e.target.value) || 0})}
                    className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#242424] bg-transparent text-[#171717] dark:text-[#F5F5F5] text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1.5">Status</label>
                  <select 
                    value={newBook.status} 
                    onChange={(e) => setNewBook({...newBook, status: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#242424] bg-transparent text-[#171717] dark:text-[#F5F5F5] text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]"
                  >
                    <option value="Want to Read">Want to Read</option>
                    <option value="Reading">Reading</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            <button 
              onClick={handleCreateBook}
              disabled={saving || !newBook.title.trim()}
              className="w-full h-10 rounded-lg bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-medium hover:bg-[#333333] dark:hover:bg-[#E5E7EB] transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Book"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
