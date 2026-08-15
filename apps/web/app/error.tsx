"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error boundary caught error:", error);
  }, [error]);

  return <ErrorState type="500" onPrimaryAction={reset} />;
}
