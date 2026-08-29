"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function COCEOProjectCreatePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/co-ceo/projects?openCreate=true");
  }, [router]);

  return null;
}
