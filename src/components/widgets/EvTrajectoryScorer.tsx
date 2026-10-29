"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const EXPECTED = ["search_flights", "filter_price", "book_flight", "send_confirmation"];
const TOOLS = [...EXPECTED, "search_hotels", "ask_user"];

const PRESETS: { name: string; steps: string[] }[] = [
  { name: "Run 1", steps: [...EXPECTED] },
  { name: "Run 2", steps: ["search_flights", "search_flights", "filter_price", "book_flight", "send_confirmation"] },
  { name: "Run 3", steps: ["search_flights", "ask_user", "filter_price", "book_flight", "send_confirmation"] },
  { name: "Run 4", steps: ["search_flights", "book_flight", "send_confirmation"] },
  { name: "Run 5", steps: ["search_hotels", "search_flights", "filter_price", "search_hotels", "book_flight", "send_confirmation"] },
];

/** Length of the longest common subsequence: how many expected steps happen in the right order. */
function lcs(a: string[], b: string[]) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length];
}

function score(run: string[]) {
  const inOrder = lcs(run, EXPECTED);
  const exact = run.length === EXPECTED.length && run.every((s, i) => s === EXPECTED[i]);
  const anyOrder = EXPECTED.every((s) => run.includes(s));
  const relevant = run.filter((s) => EXPECTED.includes(s)).length;
  return {
    exact,
    inOrderOk: inOrder === EXPECTED.length,
    anyOrder,
    precision: run.length ? relevant / run.length : 0,
    recall: EXPECTED.filter((s) => run.includes(s)).length / EXPECTED.length,
    ratio: run.length / EXPECTED.length,
    redundant: run.length - inOrder,
  };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`rounded-lg border p-2 text-sm ${ok ? "border-good bg-good-soft" : "border-bad bg-bad-soft"}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-semibold">{ok ? "pass" : "fail"}</p>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-lg border p-2 text-sm ${warn ? "border-warn bg-warn-soft" : "border-border bg-surface-2"}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-mono font-semibold">{value}</p>
    </div>
  );
}

export function EvTrajectoryScorer() {
  const [runs, setRuns] = useState(() => PRESETS.map((p) => [...p.steps]));
  const [sel, setSel] = useState(0);
  const run = runs[sel];
  const s = score(run);

  const edit = (f: (r: string[]) => string[]) => setRuns((prev) => prev.map((r, i) => (i === sel ? f(r) : r)));

  // Convergence: optimal = shortest run that reaches the goal in order; score = mean of optimal / steps taken.
  const scored = runs.map(score);
  const goodLens = runs.filter((_, i) => scored[i].inOrderOk).map((r) => r.length);
  const optimal = goodLens.length ? Math.min(...goodLens) : 0;
  const convergence = optimal
    ? runs.reduce((acc, r, i) => acc + (scored[i].inOrderOk && r.length ? optimal / r.length : 0), 0) / runs.length
    : 0;

  return (
    <Widget
      title="Trajectory scorer"
      hint={`"Book me a flight to San Francisco on Friday under $400." The same query ran 5 times. Pick a run, edit its tool calls, and watch the trace-level metrics and the cross-run convergence score change.`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Expected path</p>
      <p className="mt-1 font-mono text-xs break-words">{EXPECTED.join(" → ")}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((p, i) => (
          <Pill key={p.name} active={sel === i} onClick={() => setSel(i)}>
            {p.name}
            {scored[i].inOrderOk ? "" : " ✗"}
          </Pill>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-border p-2">
        <p className="text-xs text-muted">Actual path of {PRESETS[sel].name} ({run.length} steps)</p>
        <ol className="mt-1 flex flex-wrap gap-1">
          {run.length === 0 && <li className="text-sm text-muted">(no tool calls)</li>}
          {run.map((t, i) => (
            <li
              key={i}
              className={`rounded px-2 py-0.5 font-mono text-xs ${EXPECTED.includes(t) ? "bg-surface-2" : "bg-bad-soft"}`}
            >
              {i + 1}. {t}
            </li>
          ))}
        </ol>
        <div className="mt-2 flex flex-wrap gap-1">
          {TOOLS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => edit((r) => [...r, t])}
              className="min-h-8 rounded-md border border-border px-2 font-mono text-xs hover:bg-surface-2"
            >
              + {t}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => edit((r) => r.slice(0, -1))} className="min-h-8 rounded-md border border-border px-2 text-xs">
            Remove last
          </button>
          <button type="button" onClick={() => edit(() => [...PRESETS[sel].steps])} className="min-h-8 rounded-md border border-border px-2 text-xs">
            Reset this run
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Check ok={s.exact} label="Exact match" />
        <Check ok={s.inOrderOk} label="In-order match" />
        <Check ok={s.anyOrder} label="Any-order match" />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Tool precision" value={pct(s.precision)} warn={s.precision < 1} />
        <Stat label="Tool recall" value={pct(s.recall)} warn={s.recall < 1} />
        <Stat label="Path length ratio" value={`${s.ratio.toFixed(2)}×`} warn={s.ratio > 1} />
        <Stat label="Redundant steps" value={String(s.redundant)} warn={s.redundant > 0} />
      </div>

      <div className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">
        <p>
          Convergence across all 5 runs: <span className="font-mono font-semibold">{convergence.toFixed(2)}</span>
          <span className="text-muted">
            {" "}
            (optimal = {optimal || "none"} steps, {goodLens.length}/5 runs reach the goal in order)
          </span>
        </p>
        <p className="mt-1 text-muted">
          {!s.inOrderOk
            ? "This run never completes the expected path in order, so it adds 0 to convergence, however short it is."
            : s.redundant > 0
              ? `This run gets there but wastes ${s.redundant} step${s.redundant > 1 ? "s" : ""}: right answer, higher cost and latency.`
              : "This run is on the optimal path. Make every run look like this and convergence reaches 1.00."}
        </p>
      </div>
    </Widget>
  );
}
