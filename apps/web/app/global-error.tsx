"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#080A0D] text-zinc-100 antialiased font-sans">
        <ErrorState type="500" onPrimaryAction={reset} />
      </body>
    </html>
  );
}
