"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSyncStatus } from "@/lib/progress";

const labels = {
  loading: { text: "Syncing…", dot: "bg-muted-foreground" },
  synced: { text: "Synced", dot: "bg-good" },
  locked: { text: "Unlock to sync", dot: "bg-warn" },
  offline: { text: "Offline", dot: "bg-bad" },
};

export function SyncBadge() {
  const status = useSyncStatus();
  const { text, dot } = labels[status];
  return (
    <Badge variant="outline" asChild className="h-8 gap-1.5 rounded-full px-3 text-xs font-medium">
      <Link href="/unlock" title="Progress sync">
        <span className={cn("size-2 rounded-full", dot)} aria-hidden />
        <span className={cn(status === "synced" && "hidden sm:inline")}>{text}</span>
      </Link>
    </Badge>
  );
}
