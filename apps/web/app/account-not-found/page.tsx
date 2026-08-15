"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function AccountNotFoundPage() {
  return <ErrorState type="ACCOUNT_NOT_FOUND" />;
}
