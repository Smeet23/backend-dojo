"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "seq" | "index";

/** Rows in "heap order": the order they happen to sit on disk, not sorted by anything. */
const ROWS = [
  "maya@shop.dev",
  "arjun@shop.dev",
  "zoe@shop.dev",
  "liam@shop.dev",
  "noah@shop.dev",
  "ella@shop.dev",
  "kiran@shop.dev",
  "bea@shop.dev",
  "omar@shop.dev",
  "tara@shop.dev",
  "dev@shop.dev",
  "hana@shop.dev",
  "raj@shop.dev",
  "fay@shop.dev",
  "ian@shop.dev",
  "carl@shop.dev",
];

/** The index: (email, row location) pairs kept in sorted order. */
const INDEX = ROWS.map((email, loc) => ({ email, loc })).sort((a, b) => a.email.localeCompare(b.email));

const TARGETS = ["omar@shop.dev", "arjun@shop.dev", "zoe@shop.dev", "nobody@shop.dev"];

const SCALES = [16, 10_000, 1_000_000, 100_000_000];

/** Positions in INDEX that a binary search inspects, in order. */
function binarySearchPath(target: string): number[] {
  const path: number[] = [];
  let lo = 0;
  let hi = INDEX.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    path.push(mid);
    const cmp = INDEX[mid].email.localeCompare(target);
    if (cmp === 0) break;
    if (cmp < 0) lo = mid + 1;
    else hi = mid - 1;
  }
  return path;
}

export function PgIndexScanLab() {
  const [mode, setMode] = useState<Mode>("seq");
  const [target, setTarget] = useState(TARGETS[0]);
  const [step, setStep] = useState(0);
  const [scale, setScale] = useState(SCALES[2]);

  const path = binarySearchPath(target);
  const hitLoc = ROWS.indexOf(target);
  // Sequential scan: one step per row (it must check them all; it can't know there isn't a second match).
  // Index scan: one step per index entry inspected, plus one jump to the row if found.
  const totalSteps = mode === "seq" ? ROWS.length : path.length + (hitLoc >= 0 ? 1 : 0);
  const done = step >= totalSteps;

  const visitedRows = new Set<number>();
  if (mode === "seq") for (let i = 0; i < Math.min(step, ROWS.length); i++) visitedRows.add(i);
  else if (hitLoc >= 0 && step > path.length) visitedRows.add(hitLoc);
  const visitedIndex = new Set(mode === "index" ? path.slice(0, step) : []);

  function reset(next?: { mode?: Mode; target?: string }) {
    if (next?.mode) setMode(next.mode);
    if (next?.target) setTarget(next.target);
    setStep(0);
  }

  const seqCost = scale;
  const idxCost = Math.ceil(Math.log2(scale));

  return (
    <Widget title="Sequential scan vs index" hint="Pick a query and a strategy, then step through it. Count how many things the database has to look at.">
      <p className="rounded-lg bg-muted px-3 py-2 font-mono text-[0.8rem] break-all">
        SELECT * FROM users WHERE email = &apos;{target}&apos;;
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {TARGETS.map((t) => (
          <Pill key={t} active={target === t} onClick={() => reset({ target: t })}>
            {t.split("@")[0]}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Pill active={mode === "seq"} onClick={() => reset({ mode: "seq" })}>Sequential scan</Pill>
        <Pill active={mode === "index"} onClick={() => reset({ mode: "index" })}>Index on email</Pill>
      </div>

      <div className={`mt-3 grid gap-3 ${mode === "index" ? "sm:grid-cols-2" : ""}`}>
        {mode === "index" && (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Index (sorted email → row location)</p>
            <ol className="grid grid-cols-2 gap-1 text-[0.72rem] font-mono">
              {INDEX.map((e, i) => (
                <li
                  key={e.email}
                  className={`truncate rounded border px-1.5 py-1 ${
                    visitedIndex.has(i) ? (e.email === target ? "border-good bg-good-soft" : "border-primary bg-primary/10") : "border-border"
                  }`}
                >
                  {e.email.split("@")[0]} → #{e.loc}
                </li>
              ))}
            </ol>
          </div>
        )}
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Table rows as stored on disk (no particular order)</p>
          <ol className="grid grid-cols-2 gap-1 text-[0.72rem] font-mono">
            {ROWS.map((email, i) => (
              <li
                key={email}
                className={`truncate rounded border px-1.5 py-1 ${
                  visitedRows.has(i) ? (email === target ? "border-good bg-good-soft" : "border-warn bg-warn-soft") : "border-border"
                }`}
              >
                #{i} {email.split("@")[0]}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={done} onClick={() => setStep((s) => s + 1)} className="min-h-10 flex-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
          Step
        </button>
        <button type="button" disabled={done} onClick={() => setStep(totalSteps)} className="min-h-10 flex-1 rounded-lg border border-border px-3 text-sm disabled:opacity-50">
          Run to end
        </button>
        <button type="button" onClick={() => reset()} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>
      <p className={`mt-2 rounded-lg p-2 text-sm ${done ? (hitLoc >= 0 ? "bg-good-soft" : "bg-warn-soft") : "bg-muted"}`}>
        {mode === "seq"
          ? `Rows read: ${Math.min(step, ROWS.length)} of ${ROWS.length}. `
          : `Index entries checked: ${Math.min(step, path.length)}. Row fetches: ${step > path.length ? 1 : 0}. `}
        {done && (hitLoc >= 0 ? "Found it." : "No match, and the database had to prove that.")}
        {done && mode === "seq" && " A sequential scan reads every row, even after a match, because nothing tells it there isn't another one further on."}
      </p>

      <div className="mt-4 border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">Now imagine the table is bigger</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SCALES.map((s) => (
            <Pill key={s} active={scale === s} onClick={() => setScale(s)}>
              {s.toLocaleString("en-US")} rows
            </Pill>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-warn-soft p-2">
            <p className="text-xs text-muted-foreground">Sequential scan</p>
            <p className="font-mono">{seqCost.toLocaleString("en-US")} rows read</p>
          </div>
          <div className="rounded-lg bg-good-soft p-2">
            <p className="text-xs text-muted-foreground">Index lookup</p>
            <p className="font-mono">~{idxCost} comparisons</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          A real B-tree packs hundreds of keys into each page, so even 100 million rows is only about 4 page reads deep.
        </p>
      </div>
    </Widget>
  );
}
