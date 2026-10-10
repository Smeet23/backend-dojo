"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type PState = "idle" | "working" | "prepared" | "committed" | "aborted";
type Tone = "good" | "warn" | "bad" | "neutral";
type Snap = { coord: string; parts: PState[] };
type Ev = { actor: string; text: string; tone: Tone; snap: Snap };
type Scenario = "happy" | "vote-no" | "crash-before-decision" | "crash-mid-commit";

const NAMES = ["Order DB", "Payment DB", "Inventory DB"];

const SCENARIOS: { id: Scenario; label: string }[] = [
  { id: "happy", label: "Everyone says YES" },
  { id: "vote-no", label: "Inventory votes NO" },
  { id: "crash-before-decision", label: "Coordinator crashes after votes" },
  { id: "crash-mid-commit", label: "Coordinator crashes mid-commit" },
];

function build(scenario: Scenario): Ev[] {
  const evs: Ev[] = [];
  let coord = "starting";
  const parts: PState[] = ["idle", "idle", "idle"];
  const push = (actor: string, text: string, tone: Tone) => evs.push({ actor, text, tone, snap: { coord, parts: [...parts] } });

  coord = "sent PREPARE";
  parts.fill("working");
  push("Coordinator", "Sends PREPARE to all three participants.", "neutral");

  parts[0] = "prepared";
  parts[1] = "prepared";
  push("Order, Payment", "Do their writes, take row locks, fsync a prepare record, vote YES. They are now in doubt.", "neutral");

  if (scenario === "vote-no") {
    parts[2] = "aborted";
    push("Inventory DB", "MUG-01 is out of stock. Votes NO and rolls back locally (a NO voter may abort on its own).", "warn");
    coord = "logged ABORT";
    push("Coordinator", "Any NO means abort. Writes ABORT to its log.", "neutral");
    parts[0] = "aborted";
    parts[1] = "aborted";
    coord = "done (aborted)";
    push("Coordinator", "Sends ABORT. Order and Payment roll back and release locks. Nobody was charged.", "good");
    return evs;
  }

  parts[2] = "prepared";
  push("Inventory DB", "Reserves the item, locks the row, logs prepare, votes YES.", "neutral");

  if (scenario === "crash-before-decision") {
    coord = "CRASHED (no decision logged)";
    push("Coordinator", "Crashes before writing COMMIT or ABORT to its log.", "bad");
    push("Participants", "All three are prepared. They can't commit (someone might have voted NO) and can't abort (the coordinator might have decided COMMIT). They hold locks and wait.", "bad");
    push("Other traffic", "Checkouts for the same wallet and SKU queue behind those row locks. Timeouts start piling up.", "bad");
    coord = "recovered: no decision in log → ABORT";
    push("Coordinator", "Restarts after 4 minutes. Its log has no decision for this transaction, so it is safe to abort (presumed abort).", "warn");
    parts.fill("aborted");
    coord = "done (aborted)";
    push("Coordinator", "Sends ABORT. Participants roll back and finally release their locks.", "good");
    return evs;
  }

  coord = "logged COMMIT";
  push("Coordinator", "All YES. Writes COMMIT to its durable log. The transaction is now decided.", "good");

  if (scenario === "crash-mid-commit") {
    parts[0] = "committed";
    push("Order DB", "Receives COMMIT, commits, releases locks.", "good");
    coord = "CRASHED (COMMIT is in its log)";
    push("Coordinator", "Crashes before reaching Payment and Inventory.", "bad");
    push("Payment, Inventory", "Still prepared and holding locks. They must NOT abort on their own: Order already committed. They wait.", "bad");
    coord = "recovered: COMMIT in log → resend";
    push("Coordinator", "Restarts, finds COMMIT for this transaction in its log, resends COMMIT.", "warn");
    parts[1] = "committed";
    parts[2] = "committed";
    coord = "done (committed)";
    push("Payment, Inventory", "Commit and release locks. Atomicity held, but only after a long blocking window.", "good");
    return evs;
  }

  parts.fill("committed");
  push("Participants", "Receive COMMIT, commit, release locks, send ACK.", "good");
  coord = "done (committed)";
  push("Coordinator", "All ACKs in. It can forget the transaction.", "good");
  return evs;
}

const BADGE: Record<PState, string> = {
  idle: "bg-surface-2",
  working: "bg-surface-2",
  prepared: "bg-warn-soft",
  committed: "bg-good-soft",
  aborted: "bg-bad-soft",
};
const TONE: Record<Tone, string> = { good: "bg-good-soft", warn: "bg-warn-soft", bad: "bg-bad-soft", neutral: "bg-surface-2" };

export function HldTwoPhaseCommitSim() {
  const [scenario, setScenario] = useState<Scenario>("happy");
  const [shown, setShown] = useState(1);
  const evs = build(scenario);
  const visible = evs.slice(0, shown);
  const snap = visible[visible.length - 1].snap;
  const done = shown >= evs.length;

  return (
    <Widget title="Two-phase commit under failure" hint="Pick a scenario and step through. Yellow participants are prepared: holding locks and unable to decide on their own.">
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((s) => (
          <Pill key={s.id} active={scenario === s.id} onClick={() => { setScenario(s.id); setShown(1); }}>
            {s.label}
          </Pill>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-border p-2 text-sm">
        <p className="text-xs text-muted">Coordinator</p>
        <p className={`font-mono break-words ${snap.coord.startsWith("CRASHED") ? "text-bad" : ""}`}>{snap.coord}</p>
      </div>
      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
        {NAMES.map((n, i) => (
          <div key={n} className={`min-w-0 rounded-lg border border-border p-2 ${BADGE[snap.parts[i]]}`}>
            <p className="text-xs text-muted">{n}</p>
            <p className="font-mono">{snap.parts[i]}</p>
            <p className="text-xs text-muted">{snap.parts[i] === "prepared" || snap.parts[i] === "working" ? "locks held" : "no locks"}</p>
          </div>
        ))}
      </div>

      <ol className="mt-3 space-y-2">
        {visible.map((e, i) => (
          <li key={i} className={`rounded-lg p-2 text-[0.82rem] ${TONE[e.tone]}`}>
            <span className="font-medium">{e.actor}:</span> {e.text}
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={done} onClick={() => setShown((s) => s + 1)} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-50 dark:text-bg">
          Next step
        </button>
        <button type="button" disabled={done} onClick={() => setShown(evs.length)} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-50">
          Run to end
        </button>
        <button type="button" onClick={() => setShown(1)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>
    </Widget>
  );
}
