"use client";

import { useEffect } from "react";
import { markVisited, useStorageAvailable } from "@/lib/progress";

export function VisitTracker({ lectureId }: { lectureId: number }) {
  const storageOk = useStorageAvailable();

  useEffect(() => {
    markVisited(lectureId);
  }, [lectureId]);

  if (storageOk) return null;
  return (
    <p className="mb-4 rounded-lg bg-warn-soft px-3 py-2 text-sm">
      Browser storage is blocked here (private mode?), so progress won&apos;t be saved.
    </p>
  );
}
