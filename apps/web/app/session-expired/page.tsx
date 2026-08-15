"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ErrorState } from "@/components/ui/error-state";
import { Loader2 } from "lucide-react";

function SessionExpiredContent() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/dashboard";

  return <ErrorState type="401" returnUrl={returnUrl} />;
}

export default function SessionExpiredPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080A0D] flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#D9A514]" />
      </div>
    }>
      <SessionExpiredContent />
    </Suspense>
  );
}
