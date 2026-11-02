"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Value = string | number;
type StateDict = Record<string, Value>;
type Task = { node: string; update: StateDict; note: string };
type Preset = {
  label: string;
  code: string;
  initial: StateDict;
  /** One entry per super-step; every task in a super-step runs in parallel. */
  supersteps: Task[][];
};

type PresetKey = "bmi" | "blog" | "batting";

const PRESETS: Record<PresetKey, Preset> = {
  bmi: {
    label: "BMI (sequential)",
    code: "START → calculate_bmi → label_bmi → END",
    initial: { weight_kg: 80, height_m: 1.73 },
    supersteps: [
      [{ node: "calculate_bmi", update: { bmi: 26.73 }, note: "80 / 1.73² = 26.73" }],
      [{ node: "label_bmi", update: { category: "overweight" }, note: "25 ≤ 26.73 < 30" }],
    ],
  },
  blog: {
    label: "Blog (prompt chain)",
    code: "START → create_outline → write_blog → END",
    initial: { topic: "Monsoon forecasting with AI" },
    supersteps: [
      [{ node: "create_outline", update: { outline: "1. Why monsoons are hard · 2. Data · 3. Models · 4. Limits" }, note: "LLM call #1 reads topic" }],
      [{ node: "write_blog", update: { content: "Every June, a billion people watch the sky… (1,200 words)" }, note: "LLM call #2 reads topic + outline" }],
    ],
  },
  batting: {
    label: "Batting stats (parallel)",
    code: "START → {strike_rate, boundary_pct, balls_per_boundary} → summary → END",
    initial: { runs: 100, balls: 50, fours: 6, sixes: 4 },
    supersteps: [
      [
        { node: "strike_rate", update: { strike_rate: 200 }, note: "100 / 50 × 100" },
        { node: "boundary_pct", update: { boundary_pct: 48 }, note: "(6×4 + 4×6) / 100 × 100" },
        { node: "balls_per_boundary", update: { balls_per_boundary: 5 }, note: "50 / (6 + 4)" },
      ],
      [{ node: "summary", update: { summary: "SR 200 · 48% in boundaries · a boundary every 5 balls" }, note: "reads all three results" }],
    ],
  },
};

function stateAfter(p: Preset, done: number): StateDict {
  let s: StateDict = { ...p.initial };
  for (const step of p.supersteps.slice(0, done)) for (const t of step) s = { ...s, ...t.update };
  return s;
}

export function LgGraphStepper({ initial = "bmi" }: { initial?: PresetKey }) {
  const [key, setKey] = useState<PresetKey>(initial);
  const [done, setDone] = useState(0);
  const preset = PRESETS[key];
  const total = preset.supersteps.length;
  const finished = done >= total;
  const state = stateAfter(preset, done);
  const lastStep = done > 0 ? preset.supersteps[done - 1] : [];
  const changed = new Set(lastStep.flatMap((t) => Object.keys(t.update)));

  return (
    <Widget title="Graph execution stepper" hint="invoke() the graph, then step one super-step at a time. Watch which nodes are active and how each partial update lands in the shared state.">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PRESETS) as PresetKey[]).map((k) => (
          <Pill key={k} active={key === k} onClick={() => { setKey(k); setDone(0); }}>
            {PRESETS[k].label}
          </Pill>
        ))}
      </div>
      <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 font-mono text-[0.75rem] break-words">{preset.code}</p>

      <ol className="mt-3 flex flex-wrap items-stretch gap-2">
        <li className={`rounded-lg border px-3 py-2 text-xs ${done === 0 ? "border-accent bg-accent-soft" : "border-border"}`}>
          <p className="font-semibold">input</p>
          <p className="text-muted">initial state</p>
        </li>
        {preset.supersteps.map((step, i) => {
          const status = i < done - 1 ? "past" : i === done - 1 ? "current" : "waiting";
          return (
            <li key={i} className={`min-w-0 rounded-lg border px-3 py-2 text-xs ${status === "current" ? "border-accent bg-accent-soft" : status === "past" ? "border-border bg-surface-2" : "border-dashed border-border"}`}>
              <p className="font-semibold">super-step {i + 1}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {step.map((t) => (
                  <span key={t.node} className={`rounded px-1.5 py-0.5 font-mono ${status === "current" ? "bg-accent text-white dark:text-bg" : "bg-surface"}`}>{t.node}</span>
                ))}
              </div>
            </li>
          );
        })}
        <li className={`rounded-lg border px-3 py-2 text-xs ${finished ? "border-good bg-good-soft" : "border-dashed border-border"}`}>
          <p className="font-semibold">END</p>
          <p className="text-muted">{finished ? "halted" : "not yet"}</p>
        </li>
      </ol>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">What the active nodes returned</p>
          {lastStep.length === 0 ? (
            <p className="mt-1 text-sm text-muted">Nothing yet. The input dict becomes the starting state; START passes it to the first node.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {lastStep.map((t) => (
                <li key={t.node} className="rounded-lg border border-border p-2">
                  <p className="font-mono text-[0.75rem] font-semibold">{t.node}</p>
                  <pre className="mt-1 overflow-x-auto font-mono text-[0.72rem]">{`return ${JSON.stringify(t.update)}`}</pre>
                  <p className="mt-1 text-xs text-muted">{t.note}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">State after {done === 0 ? "input" : `super-step ${done}`}</p>
          <ul className="mt-1 space-y-1">
            {Object.entries(state).map(([k, v]) => (
              <li key={k} className={`rounded px-2 py-1 font-mono text-[0.72rem] break-words ${changed.has(k) ? "bg-good-soft" : "bg-surface-2"}`}>
                {k}: {typeof v === "string" ? `"${v}"` : v}
                {changed.has(k) && <span className="ml-2 text-muted">← new</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted">
        {finished
          ? "No node is active and no messages are in flight, so the run halts and invoke() returns the final state."
          : done === 0
            ? "Press Step to run the first super-step."
            : lastStep.length > 1
              ? `${lastStep.length} nodes ran in the same super-step. Their updates were all applied before anything downstream started.`
              : "One node ran. Its update was merged into the state and passed along the outgoing edge."}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={finished} onClick={() => setDone((d) => Math.min(d + 1, total))} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-50 dark:text-bg">
          Step
        </button>
        <button type="button" disabled={finished} onClick={() => setDone(total)} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-50">
          Run to END
        </button>
        <button type="button" onClick={() => setDone(0)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>
    </Widget>
  );
}
