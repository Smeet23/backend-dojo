"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Tone = "good" | "warn" | "bad" | "neutral";
type Snap = { holder: string; maxFence: number; ledger: string[] };
type Ev = { t: string; actor: string; cmd: string; text: string; tone: Tone; snap: Snap };

function buildTimeline(fencing: boolean, safeRelease: boolean): Ev[] {
  const evs: Ev[] = [];
  let holder = "(none)";
  let maxFence = 0;
  const ledger: string[] = [];
  const push = (t: string, actor: string, cmd: string, text: string, tone: Tone) =>
    evs.push({ t, actor, cmd, text, tone, snap: { holder, maxFence, ledger: [...ledger] } });

  holder = "A (token-a1)";
  push("0 s", "A", "SET lock:order:42 token-a1 NX PX 10000  → OK\nINCR fence:order:42  → 33", "A gets the lock with a 10 s lease and fencing token 33.", "good");

  maxFence = 33;
  ledger.push("fence 33 · A marks order 42 as charging");
  push("1 s", "A", "UPDATE orders SET status='charging' … fence=33", "A starts the protected work. Storage records 33 as the highest token seen.", "good");

  push("2 s", "A", "(stop-the-world GC pause, 15 s)", "A freezes mid-task. It can't renew the lease, and it has no idea time is passing.", "warn");

  holder = "(none)";
  push("10 s", "Redis", "key lock:order:42 expires", "The lease runs out. As far as Redis knows, nobody holds the lock.", "warn");

  holder = "B (token-b7)";
  push("11 s", "B", "SET lock:order:42 token-b7 NX PX 10000  → OK\nINCR fence:order:42  → 34", "B acquires the free lock and gets token 34.", "good");

  maxFence = 34;
  ledger.push("fence 34 · B charges the card for order 42");
  push("12 s", "B", "UPDATE orders … fence=34", "B does the work. Storage now remembers 34.", "good");

  if (fencing) {
    push("17 s", "A", "UPDATE orders … fence=33  → REJECTED (33 < 34)", "A wakes up believing it still holds the lock. Storage sees a stale token and refuses the write.", "good");
  } else {
    ledger.push("no fence · A charges the card again (zombie)");
    push("17 s", "A", "UPDATE orders …  → OK", "A wakes up believing it still holds the lock. Storage has no way to tell, so the zombie write lands: the order is charged twice.", "bad");
  }

  if (safeRelease) {
    push("18 s", "A", "EVAL compare-and-delete(lock:order:42, token-a1)  → 0", "A tries to release. The script sees the value is token-b7, not token-a1, and leaves B's lock alone.", "good");
  } else {
    holder = "(none)";
    push("18 s", "A", "DEL lock:order:42  → 1", "A releases with a plain DEL and deletes B's lock. B is still working, but the lock is free.", "bad");
    holder = "C (token-c2)";
    push("19 s", "C", "SET lock:order:42 token-c2 NX PX 10000  → OK\nINCR fence:order:42  → 35", "C grabs the lock while B is still mid-task. Two holders at once.", "bad");
    if (fencing) {
      maxFence = 35;
      ledger.push("fence 35 · C charges the card again");
      push("20 s", "C", "UPDATE orders … fence=35", "C writes. Fencing can only order writes; it can't stop B and C overlapping on the same task.", "warn");
    } else {
      ledger.push("no fence · C charges the card again");
      push("20 s", "C", "UPDATE orders …  → OK", "C writes too. Another duplicate charge.", "bad");
    }
  }
  return evs;
}

const TONE: Record<Tone, string> = { good: "bg-good-soft", warn: "bg-warn-soft", bad: "bg-bad-soft", neutral: "bg-surface-2" };

export function SdFencingLock() {
  const [fencing, setFencing] = useState(false);
  const [safeRelease, setSafeRelease] = useState(false);
  const [shown, setShown] = useState(1);

  const timeline = buildTimeline(fencing, safeRelease);
  const visible = timeline.slice(0, shown);
  const snap = visible[visible.length - 1].snap;
  const done = shown >= timeline.length;
  const badCount = timeline.filter((e) => e.tone === "bad").length;

  return (
    <Widget
      title="Lease expiry and the paused client"
      hint="Client A holds a Redis lock on order 42, then freezes in a GC pause. Step through, then turn on the two defences and replay."
    >
      <div className="flex flex-wrap gap-2">
        <Pill active={safeRelease} onClick={() => { setSafeRelease((v) => !v); setShown(1); }}>
          Release: {safeRelease ? "compare-and-delete script" : "plain DEL"}
        </Pill>
        <Pill active={fencing} onClick={() => { setFencing((v) => !v); setShown(1); }}>
          Storage checks fencing token: {fencing ? "on" : "off"}
        </Pill>
      </div>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-border p-2">
          <p className="text-xs text-muted">Redis: lock:order:42</p>
          <p className="font-mono break-all">{snap.holder}</p>
        </div>
        <div className="min-w-0 rounded-lg border border-border p-2">
          <p className="text-xs text-muted">Orders DB: highest fence seen</p>
          <p className="font-mono">{fencing ? snap.maxFence || "none" : "not tracked"}</p>
        </div>
      </div>

      <ol className="mt-3 space-y-2">
        {visible.map((e, i) => (
          <li key={i} className={`rounded-lg p-2 ${TONE[e.tone]}`}>
            <p className="text-xs text-muted">
              t = {e.t} · {e.actor}
            </p>
            <pre className="mt-1 overflow-x-auto font-mono text-[0.72rem] whitespace-pre-wrap break-all">{e.cmd}</pre>
            <p className="mt-1 text-[0.8rem]">{e.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={done} onClick={() => setShown((s) => s + 1)} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-50 dark:text-bg">
          Next event
        </button>
        <button type="button" disabled={done} onClick={() => setShown(timeline.length)} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-50">
          Run to end
        </button>
        <button type="button" onClick={() => setShown(1)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>

      {done && (
        <div className={`mt-3 rounded-lg p-2 text-sm ${badCount ? "bg-bad-soft" : "bg-good-soft"}`}>
          <p className="font-medium">Ledger for order 42</p>
          <ul className="mt-1 list-disc pl-5 font-mono text-[0.75rem]">
            {snap.ledger.map((l, i) => (
              <li key={i} className="break-words">{l}</li>
            ))}
          </ul>
          <p className="mt-1">
            {badCount === 0
              ? "One charge. The zombie write was rejected and nobody deleted another client's lock. Notice B redid work A had started, so the task itself should still be idempotent."
              : `${badCount} unsafe event${badCount === 1 ? "" : "s"}. Turn on the defences you're missing and replay.`}
          </p>
        </div>
      )}
    </Widget>
  );
}
