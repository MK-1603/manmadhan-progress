"use client";

import { useEffect, useState } from "react";
import { PremiumCard } from "@/components/ui/premium-card";
import { Search, Map } from "lucide-react";
import apiClient from "@/lib/api-client";
import Image from "next/image";

export default function HierarchyPage() {
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHierarchy = async () => {
      try {
        const workspaceId = localStorage.getItem("workspaceId") || "default";
        const res = await apiClient.get(`/organization/hierarchy?workspaceId=${workspaceId}`);
        if (res.data.success) {
          setHierarchy(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load hierarchy", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHierarchy();
  }, []);

  const renderNode = (node: any, level = 0) => {
    return (
      <div key={node.id} className="relative w-full">
        <div 
          className="flex items-center gap-4 py-3 px-4 rounded-xl border border-border bg-layer-1 hover:bg-layer-2 transition-colors mb-2"
          style={{ marginLeft: `${level * 2}rem` }}
        >
          <div className="w-10 h-10 rounded-full bg-layer-3 border border-border overflow-hidden flex items-center justify-center shrink-0">
            {node.avatar ? (
              <Image src={node.avatar} alt={node.name} width={40} height={40} className="object-cover" />
            ) : (
              <span className="font-bold text-xs text-muted-foreground">{node.name.charAt(0)}</span>
            )}
          </div>
          <div>
            <p className="font-semibold text-foreground">{node.name}</p>
            <p className="text-xs font-medium text-gold">{node.role}</p>
          </div>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="relative border-l border-border/50 ml-[20px] mt-2 mb-4 pl-4 space-y-2">
            {node.children.map((child: any) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Map className="w-8 h-8 text-purple-500" /> Organization Hierarchy
          </h1>
          <p className="text-muted-foreground mt-1">Visualize your reporting structure.</p>
        </div>
      </div>

      <PremiumCard className="p-6 layer-2">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
            <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            Loading hierarchy...
          </div>
        ) : hierarchy.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No hierarchy data found. Ensure users have managers assigned.
          </div>
        ) : (
          <div className="overflow-x-auto pb-8">
            <div className="min-w-[600px] pt-4 pr-4">
              {hierarchy.map((root) => renderNode(root))}
            </div>
          </div>
        )}
      </PremiumCard>
    </div>
  );
}
