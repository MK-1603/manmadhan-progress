"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CEOProjectCreatePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ceo/projects?openCreate=true");
  }, [router]);

  return null;
}
