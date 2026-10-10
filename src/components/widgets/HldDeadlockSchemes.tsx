"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Scheme = "detect" | "waitdie" | "woundwait";
type Tone = "good" | "warn" | "bad" | "neutral";
type Ev = { text: string; tone: Tone; edges: string[]; holders: { A: string; B: string } };

/**
 * T1 (timestamp 1, older) and T2 (timestamp 2, younger).
 * T1 locks A, T2 locks B, then T1 asks for B and T2 asks for A.
 */
function timeline(scheme: Scheme): Ev[] {
  const base: Ev[] = [
    { text: "T1 (ts 1, older) X-locks A", tone: "neutral", edges: [], holders: { A: "T1", B: "-" } },
    { text: "T2 (ts 2, younger) X-locks B", tone: "neutral", edges: [], holders: { A: "T1", B: "T2" } },
  ];
  if (scheme === "detect") {
    return [
      ...base,
      { text: "T1 requests B, held by T2. T1 waits", tone: "warn", edges: ["T1 → T2"], holders: { A: "T1", B: "T2" } },
      { text: "T2 requests A, held by T1. T2 waits", tone: "warn", edges: ["T1 → T2", "T2 → T1"], holders: { A: "T1", B: "T2" } },
      { text: "Detector finds the cycle T1 → T2 → T1 in the wait-for graph", tone: "bad", edges: ["T1 → T2", "T2 → T1"], holders: { A: "T1", B: "T2" } },
      { text: "Victim: T2 (younger, less work). Abort T2, release B", tone: "warn", edges: [], holders: { A: "T1", B: "-" } },
      { text: "T1 gets B, finishes and commits. T2 retries later", tone: "good", edges: [], holders: { A: "-", B: "-" } },
    ];
  }
  if (scheme === "waitdie") {
    return [
      ...base,
      { text: "T1 requests B, held by T2. T1 is older, so it may wait", tone: "warn", edges: ["T1 → T2"], holders: { A: "T1", B: "T2" } },
      { text: "T2 requests A, held by T1. T2 is younger, so it dies (aborts itself) instead of waiting", tone: "bad", edges: ["T1 → T2"], holders: { A: "T1", B: "T2" } },
      { text: "T2's locks are released. No cycle ever formed", tone: "neutral", edges: [], holders: { A: "T1", B: "-" } },
      { text: "T1 gets B and commits. T2 restarts with its original ts 2", tone: "good", edges: [], holders: { A: "-", B: "-" } },
    ];
  }
  return [
    ...base,
    { text: "T1 requests B, held by T2. T1 is older, so it wounds T2: T2 is aborted", tone: "bad", edges: [], holders: { A: "T1", B: "-" } },
    { text: "T1 gets B immediately", tone: "good", edges: [], holders: { A: "T1", B: "T1" } },
    { text: "T2 restarts with ts 2, requests B, held by older T1. Younger waits", tone: "warn", edges: ["T2 → T1"], holders: { A: "T1", B: "T1" } },
    { text: "T1 commits, T2 gets its locks and finishes", tone: "good", edges: [], holders: { A: "T2", B: "T2" } },
  ];
}

const LABEL: Record<Scheme, string> = { detect: "Detect (wait-for graph)", waitdie: "Wait-die", woundwait: "Wound-wait" };
const RULE: Record<Scheme, string> = {
  detect: "Let everyone wait. Periodically look for a cycle and abort a victim.",
  waitdie: "Older requester waits for younger. Younger requester dies.",
  woundwait: "Older requester wounds (aborts) the younger holder. Younger requester waits.",
};
const TONE: Record<Tone, string> = { good: "bg-good-soft", warn: "bg-warn-soft", bad: "bg-bad-soft", neutral: "bg-surface-2" };

export function HldDeadlockSchemes() {
  const [scheme, setScheme] = useState<Scheme>("detect");
  const [step, setStep] = useState(0);
  const evs = timeline(scheme);
  const cur = step > 0 ? evs[step - 1] : null;
  const edges = cur?.edges ?? [];
  const cycle = edges.length === 2;
  const done = step >= evs.length;

  return (
    <Widget
      title="Handling a deadlock"
      hint="Two transactions lock A and B in opposite order. Pick a scheme and step through what the lock manager does."
    >
      <div className="flex flex-wrap gap-2">
        {(Object.keys(LABEL) as Scheme[]).map((s) => (
          <Pill key={s} active={scheme === s} onClick={() => { setScheme(s); setStep(0); }}>
            {LABEL[s]}
          </Pill>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">{RULE[scheme]}</p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-border bg-bg p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Lock table</p>
          <p className="mt-1 font-mono text-xs">A held by {cur?.holders.A ?? "-"}</p>
          <p className="font-mono text-xs">B held by {cur?.holders.B ?? "-"}</p>
        </div>
        <div className={`min-w-0 rounded-lg border p-3 text-sm ${cycle ? "border-bad bg-bad-soft" : "border-border bg-bg"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Wait-for graph</p>
          {edges.length === 0 ? (
            <p className="mt-1 text-xs text-muted">No one is waiting</p>
          ) : (
            edges.map((e) => (
              <p key={e} className="mt-1 font-mono text-xs">{e}</p>
            ))
          )}
          {cycle && <p className="mt-1 text-xs font-semibold">Cycle: deadlock</p>}
        </div>
      </div>

      <ol className="mt-3 space-y-1.5">
        {evs.slice(0, step).map((e, i) => (
          <li key={i} className={`rounded-md px-3 py-2 text-sm ${TONE[e.tone]}`}>
            {e.text}
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.min(s + 1, evs.length))}
          disabled={done}
          className="min-h-10 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
        >
          Next step ({step}/{evs.length})
        </button>
        <button type="button" onClick={() => setStep(0)} className="min-h-10 rounded-lg border border-border px-4 text-sm hover:bg-surface-2">
          Reset
        </button>
      </div>
    </Widget>
  );
}
