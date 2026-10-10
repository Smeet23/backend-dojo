"use client";

import { useState } from "react";
import Link from "next/link";
import { lock, unlock, useProgress, useSyncStatus } from "@/lib/progress";

export function UnlockForm() {
  const status = useSyncStatus();
  const progress = useProgress();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const done = Object.values(progress.lessons).filter((l) => l.done).length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!(await unlock(passcode))) setError("Wrong passcode.");
      else setPasscode("");
    } catch {
      setError("Couldn't reach the server. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "synced") {
    return (
      <div className="rounded-xl border border-good bg-good-soft p-4">
        <p className="font-medium">This device is synced ✓</p>
        <p className="mt-1 text-sm">
          {done} lecture{done === 1 ? "" : "s"} done · {Object.keys(progress.misses).length} weak spots tracked.
        </p>
        <div className="mt-4 flex gap-2">
          <Link href="/" className="min-h-10 flex-1 rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-medium text-white dark:text-bg">
            Back to lectures
          </Link>
          <button type="button" onClick={() => void lock()} className="min-h-10 rounded-lg border border-border bg-surface px-4 text-sm">
            Lock this device
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-border bg-surface p-4">
      {status === "offline" && (
        <p className="mb-3 rounded-lg bg-bad-soft px-3 py-2 text-sm">Can&apos;t reach the server. Progress is kept on this device and syncs when you&apos;re back online.</p>
      )}
      <label htmlFor="passcode" className="block text-sm font-medium">Passcode</label>
      <input
        id="passcode"
        type="password"
        autoComplete="current-password"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        className="mt-1 min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-base"
        required
      />
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
      <button
        type="submit"
        disabled={busy || !passcode}
        className="mt-4 min-h-11 w-full rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
      >
        {busy ? "Unlocking…" : "Unlock and sync"}
      </button>
      <p className="mt-3 text-xs text-muted">Anything you&apos;ve done on this device so far is merged in; nothing is lost.</p>
    </form>
  );
}
