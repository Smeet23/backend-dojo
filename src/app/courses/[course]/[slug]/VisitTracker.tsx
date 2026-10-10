"use client";

import { useEffect } from "react";
import { markVisited, useStorageAvailable } from "@/lib/progress";

export function VisitTracker({ lectureKey }: { lectureKey: string }) {
  const storageOk = useStorageAvailable();

  useEffect(() => {
    markVisited(lectureKey);
  }, [lectureKey]);

  if (storageOk) return null;
  return (
    <p className="mb-4 rounded-lg bg-warn-soft px-3 py-2 text-sm">
      Browser storage is blocked here (private mode?), so progress won&apos;t be saved.
    </p>
  );
}
