"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function CEOFocusPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ceo/dashboard");
  }, [router]);

  return (
    <div className="h-full w-full min-h-[400px] flex items-center justify-center bg-[#F8F9FA] dark:bg-[#0B0D10]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#B28D18] dark:text-[#D4B12F]" />
        <span className="text-xs font-mono text-[#667085] dark:text-[#8B94A3]">
          Redirecting to CEO Dashboard...
        </span>
      </div>
    </div>
  );
}
