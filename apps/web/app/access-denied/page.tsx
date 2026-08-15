"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function AccessDeniedPage() {
  return <ErrorState type="403" />;
}
