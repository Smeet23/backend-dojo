"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "naive" | "atomic" | "locked";

type Step = { who: "A" | "B"; sql: string; value: number; note: string; blocked?: boolean };

/**
 * Two requests change the same stock count at the same moment.
 * A adds 20 (a restock), B removes 20 (a sale). Start: 40. Correct end: 40.
 */
const SCRIPTS: Record<Mode, Step[]> = {
  naive: [
    { who: "A", sql: "SELECT stock FROM products WHERE id = 7;  -- 40", value: 40, note: "A reads 40 into application memory." },
    { who: "B", sql: "SELECT stock FROM products WHERE id = 7;  -- 40", value: 40, note: "B also reads 40. Both now hold a copy that is about to go stale." },
    { who: "A", sql: "UPDATE products SET stock = 60 WHERE id = 7;", value: 60, note: "A computes 40 + 20 in code and writes 60." },
    { who: "B", sql: "UPDATE products SET stock = 20 WHERE id = 7;", value: 20, note: "B computes 40 - 20 from its stale copy and writes 20. A's restock is gone: a lost update." },
  ],
  atomic: [
    { who: "A", sql: "UPDATE products SET stock = stock + 20 WHERE id = 7;", value: 60, note: "A's UPDATE reads and writes in one statement and takes a row lock until A commits." },
    { who: "B", sql: "UPDATE products SET stock = stock - 20 WHERE id = 7;", value: 60, note: "B's UPDATE needs the same row, so it waits for A's lock.", blocked: true },
    { who: "A", sql: "COMMIT;", value: 60, note: "A commits and releases the lock." },
    { who: "B", sql: "-- B resumes, re-reads 60, writes 40", value: 40, note: "B's UPDATE re-evaluates stock on the latest committed value: 60 - 20 = 40. Both changes count." },
  ],
  locked: [
    { who: "A", sql: "BEGIN; SELECT stock FROM products WHERE id = 7 FOR UPDATE;  -- 40", value: 40, note: "A reads 40 and locks the row, because it needs to run some checks in code first." },
    { who: "B", sql: "BEGIN; SELECT stock FROM products WHERE id = 7 FOR UPDATE;", value: 40, note: "B asks for the same lock and waits. It cannot read a value that is about to change.", blocked: true },
    { who: "A", sql: "UPDATE products SET stock = 60 WHERE id = 7; COMMIT;", value: 60, note: "A writes 60 and commits, which releases the lock." },
    { who: "B", sql: "-- B's SELECT returns 60\nUPDATE products SET stock = 40 WHERE id = 7; COMMIT;", value: 40, note: "B now reads 60 (not 40), computes 60 - 20 and writes 40. Correct." },
  ],
};

const LABEL: Record<Mode, string> = {
  naive: "Read, compute in code, write",
  atomic: "Atomic UPDATE",
  locked: "SELECT … FOR UPDATE",
};

export function LostUpdateLab() {
  const [mode, setMode] = useState<Mode>("naive");
  const [step, setStep] = useState(0);
  const script = SCRIPTS[mode];
  const shown = script.slice(0, step);
  const value = step === 0 ? 40 : script[step - 1].value;
  const done = step >= script.length;

  return (
    <Widget title="Lost update" hint="Two requests hit the same product row at the same time: a restock (+20) and a sale (−20). Stock starts at 40, so it should end at 40.">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SCRIPTS) as Mode[]).map((m) => (
          <Pill key={m} active={mode === m} onClick={() => { setMode(m); setStep(0); }}>
            {LABEL[m]}
          </Pill>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
        <span className="text-muted">products.stock (id 7)</span>
        <span className="font-mono text-lg font-semibold">{value}</span>
      </div>

      <ol className="mt-3 space-y-2">
        {shown.map((s, i) => (
          <li key={i} className={`rounded-lg border p-2 text-sm ${s.blocked ? "border-warn bg-warn-soft" : "border-border"} ${s.who === "B" ? "sm:ml-8" : "sm:mr-8"}`}>
            <p className="text-xs font-semibold text-accent">Request {s.who}{s.blocked ? " (waiting)" : ""}</p>
            <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-[0.72rem] leading-5">{s.sql}</pre>
            <p className="mt-1">{s.note}</p>
          </li>
        ))}
      </ol>

      <div className="mt-3 flex gap-2">
        <button type="button" disabled={done} onClick={() => setStep((s) => s + 1)} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-50 dark:text-bg">
          Next step
        </button>
        <button type="button" onClick={() => setStep(0)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>
      {done && (
        <p className={`mt-2 rounded-lg p-2 text-sm ${value === 40 ? "bg-good-soft" : "bg-bad-soft"}`}>
          Final stock: {value}. {value === 40 ? "Both changes were applied." : "Wrong: one request silently overwrote the other."}
        </p>
      )}
    </Widget>
  );
}
