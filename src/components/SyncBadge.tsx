"use client";

import Link from "next/link";
import { useSyncStatus } from "@/lib/progress";

const labels = {
  loading: { text: "Syncing…", dot: "bg-muted" },
  synced: { text: "Synced", dot: "bg-good" },
  locked: { text: "Unlock to sync", dot: "bg-warn" },
  offline: { text: "Offline", dot: "bg-bad" },
};

export function SyncBadge() {
  const status = useSyncStatus();
  const { text, dot } = labels[status];
  return (
    <Link href="/unlock" className="flex items-center gap-1.5 text-sm text-muted hover:text-text" title="Progress sync">
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
      {text}
    </Link>
  );
}
