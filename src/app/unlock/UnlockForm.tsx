"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, KeyRound, Lock, WifiOff } from "lucide-react";
import { lock, unlock, useProgress, useSyncStatus } from "@/lib/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      const result = await unlock(passcode);
      if (result.ok) setPasscode("");
      else if (result.reason === "wrong") setError("Wrong passcode.");
      else setError(`Too many wrong attempts. Try again in ${Math.ceil(result.retryAfter / 60)} minute${result.retryAfter > 60 ? "s" : ""}.`);
    } catch {
      setError("Couldn't reach the server. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "synced") {
    return (
      <Card>
        <CardHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-good-soft text-good">
            <CheckCircle2 className="size-6" />
          </div>
          <CardTitle>This device is synced</CardTitle>
          <CardDescription>
            {done} lecture{done === 1 ? "" : "s"} done · {Object.keys(progress.misses).length} weak spots tracked. Progress saves to the database as you go.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="w-full sm:flex-1">
            <Link href="/">Back to lectures</Link>
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => void lock()}>
            <Lock /> Lock this device
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRound className="size-5" />
        </div>
        <CardTitle>Unlock this device</CardTitle>
        <CardDescription>Enter your passcode once. This device then stays synced for a year.</CardDescription>
      </CardHeader>
      <form onSubmit={submit}>
        <CardContent className="space-y-4">
          {status === "offline" && (
            <Alert>
              <WifiOff />
              <AlertTitle>Can&apos;t reach the server</AlertTitle>
              <AlertDescription>Progress is kept on this device and syncs when you&apos;re back online.</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="passcode">Passcode</Label>
            <Input
              id="passcode"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              aria-invalid={error ? true : undefined}
              className="h-11 text-base"
              required
            />
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </div>
        </CardContent>
        <CardFooter className="mt-6 flex-col items-stretch gap-3">
          <Button type="submit" size="lg" disabled={busy || !passcode}>
            {busy ? "Unlocking…" : "Unlock and sync"}
          </Button>
          <p className="text-xs text-muted-foreground">Anything you&apos;ve done on this device so far is merged in; nothing is lost.</p>
        </CardFooter>
      </form>
    </Card>
  );
}
