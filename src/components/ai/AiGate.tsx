"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useAiStatus } from "@/lib/ai-client";

/** Shows children only with the passcode session; otherwise a short unlock prompt (or nothing). */
export function AiGate({ children, quiet = false, what = "AI features" }: { children: ReactNode; quiet?: boolean; what?: string }) {
  const status = useAiStatus();
  if (status === "ready") return <>{children}</>;
  if (status === "loading" || quiet) return null;
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-4 text-sm text-muted">
      🔒 {what} need your passcode.{" "}
      <Link href="/unlock" className="font-medium text-accent">Unlock →</Link>
    </div>
  );
}

export function AiBadge() {
  return <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-accent">AI</span>;
}

export function ErrorNote({ error }: { error: string }) {
  return <p className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-sm">{error}</p>;
}
