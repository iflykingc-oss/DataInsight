"use client";

import { useEffect } from "react";
import { startDataLifecycleManager } from "@/lib/data-lifecycle";

export function DataLifecycleProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const cleanup = startDataLifecycleManager();
    return cleanup;
  }, []);

  return <>{children}</>;
}
