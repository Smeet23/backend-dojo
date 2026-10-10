"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Scenario = "counter" | "withdraw";
type Step = { who: "A" | "B"; text: string; value: number; blocked?: boolean };

const SCRIPTS: Record<Scenario, { title: string; code: string; label: string; start: number; expected: number; noLock: Step[]; lock: Step[] }> = {
  counter: {
    title: "Two threads run counter++",
    label: "counter",
    code: "counter = counter + 1   // read, add, write",
    start: 0,
    expected: 2,
    noLock: [
      { who: "A", text: "read counter into register → 0", value: 0 },
      { who: "B", text: "read counter into register → 0", value: 0 },
      { who: "A", text: "add 1 in register → 1", value: 0 },
      { who: "B", text: "add 1 in register → 1", value: 0 },
      { who: "A", text: "write register to counter", value: 1 },
      { who: "B", text: "write register to counter (overwrites A's update)", value: 1 },
    ],
    lock: [
      { who: "A", text: "acquire lock ✓", value: 0 },
      { who: "B", text: "try to acquire lock → must wait", value: 0, blocked: true },
      { who: "A", text: "read counter → 0", value: 0 },
      { who: "A", text: "add 1 → 1", value: 0 },
      { who: "A", text: "write counter", value: 1 },
      { who: "A", text: "release lock", value: 1 },
      { who: "B", text: "acquire lock ✓", value: 1 },
      { who: "B", text: "read counter → 1", value: 1 },
      { who: "B", text: "add 1 → 2", value: 1 },
      { who: "B", text: "write counter", value: 2 },
      { who: "B", text: "release lock", value: 2 },
    ],
  },
  withdraw: {
    title: "Two async withdraw(100) calls on one event loop",
    label: "balance",
    code: "if (balance >= amount) {\n  await payments.charge(amount); // yields\n  balance -= amount;\n}",
    start: 100,
    expected: 0,
    noLock: [
      { who: "A", text: "check: balance 100 ≥ 100 → ok", value: 100 },
      { who: "A", text: "await payments.charge() → yields to the event loop", value: 100 },
      { who: "B", text: "check: balance 100 ≥ 100 → ok (A hasn't subtracted yet)", value: 100 },
      { who: "B", text: "await payments.charge() → yields", value: 100 },
      { who: "A", text: "resumes: balance -= 100", value: 0 },
      { who: "B", text: "resumes: balance -= 100 (its check is stale)", value: -100 },
    ],
    lock: [
      { who: "A", text: "acquire this account's lock ✓", value: 100 },
      { who: "A", text: "check: balance 100 ≥ 100 → ok", value: 100 },
      { who: "A", text: "await payments.charge() → yields", value: 100 },
      { who: "B", text: "try to acquire lock → waits (other requests still run)", value: 100, blocked: true },
      { who: "A", text: "resumes: balance -= 100", value: 0 },
      { who: "A", text: "release lock", value: 0 },
      { who: "B", text: "acquire lock ✓", value: 0 },
      { who: "B", text: "check: balance 0 ≥ 100 → fails, return “insufficient funds”", value: 0 },
      { who: "B", text: "release lock", value: 0 },
    ],
  },
};

export function RaceConditionLab() {
  const [scenario, setScenario] = useState<Scenario>("counter");
  const [locked, setLocked] = useState(false);
  const [shown, setShown] = useState(0);

  const script = SCRIPTS[scenario];
  const steps = locked ? script.lock : script.noLock;
  const value = shown === 0 ? script.start : steps[shown - 1].value;
  const finished = shown === steps.length;
  const wrong = finished && value !== script.expected;

  function pick(next: () => void) {
    next();
    setShown(0);
  }

  return (
    <Widget title="Race condition lab" hint="Step through two tasks touching the same shared value. Then turn on the lock and step through again.">
      <div className="flex flex-wrap gap-2">
        <Pill active={scenario === "counter"} onClick={() => pick(() => setScenario("counter"))}>Threads: counter++</Pill>
        <Pill active={scenario === "withdraw"} onClick={() => pick(() => setScenario("withdraw"))}>Async: withdraw</Pill>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Pill active={!locked} onClick={() => pick(() => setLocked(false))}>No lock</Pill>
        <Pill active={locked} onClick={() => pick(() => setLocked(true))}>With a lock</Pill>
      </div>

      <p className="mt-3 text-sm font-semibold">{script.title}</p>
      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-2 font-mono text-[0.75rem]">{script.code}</pre>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
        <span className="text-sm text-muted">Shared {script.label}</span>
        <span className={`font-mono text-lg font-semibold ${wrong ? "text-bad" : finished ? "text-good" : ""}`}>{value}</span>
      </div>

      <ol className="mt-3 space-y-1">
        {steps.slice(0, shown).map((s, i) => (
          <li
            key={i}
            className={`flex gap-2 rounded-md px-2 py-1 text-sm ${s.who === "A" ? "bg-accent-soft" : "bg-surface-2"} ${s.blocked ? "border border-warn" : ""}`}
          >
            <span className="font-mono text-xs font-semibold">{s.who}</span>
            <span>{s.text}</span>
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={finished}
          onClick={() => setShown((n) => Math.min(steps.length, n + 1))}
          className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-50 dark:text-bg"
        >
          Next step ({shown}/{steps.length})
        </button>
        <button type="button" onClick={() => setShown(steps.length)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Run all
        </button>
        <button type="button" onClick={() => setShown(0)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>

      {finished && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${wrong ? "bg-bad-soft" : "bg-good-soft"}`}>
          {wrong
            ? `Expected ${script.expected}, got ${value}. The two tasks interleaved between reading the value and writing it back.`
            : `Correct: ${value}. The lock made the read-check-write sequence happen as one unit, so the second task saw the first task's result.`}
        </p>
      )}
    </Widget>
  );
}
