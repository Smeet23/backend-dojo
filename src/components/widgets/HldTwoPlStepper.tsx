"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "none" | "basic" | "strict" | "rigorous";
type Tone = "good" | "warn" | "bad" | "neutral";
type Item = "A" | "B" | "C";

type Step = {
  who: string;
  text: string;
  tone: Tone;
  locks: Record<Item, string>;
  values: Record<Item, number>;
};

type Script = { label: string; blurb: string; steps: Step[]; verdict: string; verdictTone: Tone };

const V0: Record<Item, number> = { A: 100, B: 100, C: 1 };
const NOLOCKS: Record<Item, string> = { A: "-", B: "-", C: "-" };

const SCRIPTS: Record<Mode, Script> = {
  none: {
    label: "Unlock after each use",
    blurb: "Locks are used, but T1 releases A before it has locked B. That breaks the two-phase rule.",
    steps: [
      { who: "T1", text: "X-lock A, write A = 50 (debit)", tone: "neutral", locks: { A: "T1:X", B: "-", C: "-" }, values: { A: 50, B: 100, C: 1 } },
      { who: "T1", text: "Unlock A (done with it), then go do other work", tone: "warn", locks: NOLOCKS, values: { A: 50, B: 100, C: 1 } },
      { who: "T2", text: "S-lock A, read 50", tone: "neutral", locks: { A: "T2:S", B: "-", C: "-" }, values: { A: 50, B: 100, C: 1 } },
      { who: "T2", text: "S-lock B, read 100. Report total = 150", tone: "bad", locks: { A: "T2:S", B: "T2:S", C: "-" }, values: { A: 50, B: 100, C: 1 } },
      { who: "T2", text: "Commit, release locks", tone: "neutral", locks: NOLOCKS, values: { A: 50, B: 100, C: 1 } },
      { who: "T1", text: "X-lock B (acquiring after a release!), write B = 150, commit", tone: "neutral", locks: NOLOCKS, values: { A: 50, B: 150, C: 1 } },
    ],
    verdict: "T2 reported 150 although the true total is always 200. T1 → T2 on A and T2 → T1 on B form a cycle: not serializable.",
    verdictTone: "bad",
  },
  basic: {
    label: "Basic 2PL",
    blurb: "T1 takes every lock before releasing any. It may release before it commits.",
    steps: [
      { who: "T1", text: "X-lock A, write A = 50", tone: "neutral", locks: { A: "T1:X", B: "-", C: "-" }, values: { A: 50, B: 100, C: 1 } },
      { who: "T1", text: "X-lock B, write B = 150. Lock point: T1 holds everything it needs", tone: "good", locks: { A: "T1:X", B: "T1:X", C: "-" }, values: { A: 50, B: 150, C: 1 } },
      { who: "T1", text: "Shrinking phase: unlock A and B (not committed yet)", tone: "warn", locks: NOLOCKS, values: { A: 50, B: 150, C: 1 } },
      { who: "T2", text: "S-lock A and B, read 50 + 150 = 200. Consistent!", tone: "good", locks: { A: "T2:S", B: "T2:S", C: "-" }, values: { A: 50, B: 150, C: 1 } },
      { who: "T1", text: "ABORT (fraud check failed). Restore A = 100, B = 100", tone: "bad", locks: { A: "T2:S", B: "T2:S", C: "-" }, values: { A: 100, B: 100, C: 1 } },
      { who: "T2", text: "T2 read values that were never committed. It must abort too", tone: "bad", locks: NOLOCKS, values: { A: 100, B: 100, C: 1 } },
    ],
    verdict: "Serializable, but T2 read uncommitted data, so T1's abort cascades to T2. Had T2 already committed, the schedule would be unrecoverable.",
    verdictTone: "warn",
  },
  strict: {
    label: "Strict 2PL",
    blurb: "X locks are held until commit or abort. Shared locks may still be released early.",
    steps: [
      { who: "T1", text: "S-lock C, read fee rate = 1%", tone: "neutral", locks: { A: "-", B: "-", C: "T1:S" }, values: V0 },
      { who: "T1", text: "X-lock A and B, write A = 50, B = 150. Lock point", tone: "good", locks: { A: "T1:X", B: "T1:X", C: "T1:S" }, values: { A: 50, B: 150, C: 1 } },
      { who: "T1", text: "Release S on C (allowed: it's a shared lock). Keep X on A and B", tone: "neutral", locks: { A: "T1:X", B: "T1:X", C: "-" }, values: { A: 50, B: 150, C: 1 } },
      { who: "T3", text: "X-lock C, set fee = 2%, commit. T3 commits before T1 does", tone: "neutral", locks: { A: "T1:X", B: "T1:X", C: "-" }, values: { A: 50, B: 150, C: 2 } },
      { who: "T2", text: "S-lock A requested: waits, T1 holds X", tone: "warn", locks: { A: "T1:X (T2 waits)", B: "T1:X", C: "-" }, values: { A: 50, B: 150, C: 2 } },
      { who: "T1", text: "ABORT. Restore A = 100, B = 100, release X locks", tone: "bad", locks: { A: "-", B: "-", C: "-" }, values: { A: 100, B: 100, C: 2 } },
      { who: "T2", text: "S-lock A and B granted, read 100 + 100 = 200, commit", tone: "good", locks: NOLOCKS, values: { A: 100, B: 100, C: 2 } },
    ],
    verdict: "No cascade: T2 waited instead of reading T1's uncommitted writes, so T1's abort touched nobody else. Note T3 changed C while T1 was still running: had T1 committed, the serial order would be T1, T3, T2 even though T3 committed first.",
    verdictTone: "good",
  },
  rigorous: {
    label: "Rigorous 2PL",
    blurb: "Every lock, shared or exclusive, is held until commit or abort.",
    steps: [
      { who: "T1", text: "S-lock C, read fee rate = 1%", tone: "neutral", locks: { A: "-", B: "-", C: "T1:S" }, values: V0 },
      { who: "T1", text: "X-lock A and B, write A = 50, B = 150. Lock point", tone: "good", locks: { A: "T1:X", B: "T1:X", C: "T1:S" }, values: { A: 50, B: 150, C: 1 } },
      { who: "T3", text: "X-lock C requested: waits, T1 still holds S on C", tone: "warn", locks: { A: "T1:X", B: "T1:X", C: "T1:S (T3 waits)" }, values: { A: 50, B: 150, C: 1 } },
      { who: "T2", text: "S-lock A requested: waits, T1 holds X", tone: "warn", locks: { A: "T1:X (T2 waits)", B: "T1:X", C: "T1:S (T3 waits)" }, values: { A: 50, B: 150, C: 1 } },
      { who: "T1", text: "COMMIT. Release every lock at once", tone: "good", locks: NOLOCKS, values: { A: 50, B: 150, C: 1 } },
      { who: "T3", text: "X-lock C granted, set fee = 2%, commit", tone: "neutral", locks: NOLOCKS, values: { A: 50, B: 150, C: 2 } },
      { who: "T2", text: "S-lock A and B granted, read 50 + 150 = 200, commit", tone: "good", locks: NOLOCKS, values: { A: 50, B: 150, C: 2 } },
    ],
    verdict: "Serializable, no cascades, and the serial order is simply the commit order: T1, T3, T2. The price: T3 waited longer than under strict 2PL.",
    verdictTone: "good",
  },
};

const TONE: Record<Tone, string> = { good: "bg-good-soft", warn: "bg-warn-soft", bad: "bg-bad-soft", neutral: "bg-surface-2" };
const BORDER: Record<Tone, string> = { good: "border-good bg-good-soft", warn: "border-warn bg-warn-soft", bad: "border-bad bg-bad-soft", neutral: "border-border bg-surface-2" };

export function HldTwoPlStepper() {
  const [mode, setMode] = useState<Mode>("none");
  const [step, setStep] = useState(0);
  const sc = SCRIPTS[mode];
  const cur = step > 0 ? sc.steps[step - 1] : null;
  const locks = cur?.locks ?? NOLOCKS;
  const values = cur?.values ?? V0;
  const done = step >= sc.steps.length;

  return (
    <Widget
      title="Two-phase locking variants"
      hint="T1 moves 50 from account A to B. T2 reports A + B (always 200 if correct). Some modes add T3, which changes a fee rate C. Pick a mode and step."
    >
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SCRIPTS) as Mode[]).map((m) => (
          <Pill key={m} active={mode === m} onClick={() => { setMode(m); setStep(0); }}>
            {SCRIPTS[m].label}
          </Pill>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">{sc.blurb}</p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
        {(["A", "B", "C"] as Item[]).map((it) => (
          <div key={it} className="min-w-0 rounded-lg border border-border bg-bg p-2">
            <p className="text-xs text-muted">{it === "C" ? "C (fee %)" : `Account ${it}`}</p>
            <p className="text-lg font-semibold">{values[it]}</p>
            <p className="break-words font-mono text-xs text-accent">{locks[it]}</p>
          </div>
        ))}
      </div>

      <ol className="mt-3 space-y-1.5">
        {sc.steps.slice(0, step).map((s, i) => (
          <li key={i} className={`rounded-md px-3 py-2 text-sm ${TONE[s.tone]}`}>
            <span className="mr-2 font-semibold">{s.who}</span>
            {s.text}
          </li>
        ))}
      </ol>

      {done && <div className={`mt-3 rounded-lg border p-3 text-sm ${BORDER[sc.verdictTone]}`}>{sc.verdict}</div>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.min(s + 1, sc.steps.length))}
          disabled={done}
          className="min-h-10 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
        >
          Next step ({step}/{sc.steps.length})
        </button>
        <button type="button" onClick={() => setStep(0)} className="min-h-10 rounded-lg border border-border px-4 text-sm hover:bg-surface-2">
          Reset
        </button>
      </div>
    </Widget>
  );
}
