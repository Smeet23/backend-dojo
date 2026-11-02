"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const TITLES = [
  "Introduction to self-attention",
  "How self-attention works",
  "A step-by-step example",
  "Why it beats RNNs",
  "Multi-head attention",
  "Common pitfalls",
  "Conclusion",
];
/** Simulated seconds each worker takes; longer sections take longer. */
const DURATION = [3, 7, 6, 4, 5, 2, 1];

type Reducer = "add" | "none";

export function LgFanOutLab() {
  const [n, setN] = useState(5);
  const [reducer, setReducer] = useState<Reducer>("add");
  const [sortOnAssemble, setSortOnAssemble] = useState(true);
  const [t, setT] = useState(-1); // -1: plan not made; 0: fanned out

  const tasks = Array.from({ length: n }, (_, i) => ({ id: i + 1, title: i === n - 1 ? "Conclusion" : TITLES[i], dur: i === n - 1 ? 1 : DURATION[i] }));
  const maxDur = Math.max(...tasks.map((x) => x.dur));
  const done = t < 0 ? [] : tasks.filter((x) => x.dur <= t).sort((a, b) => a.dur - b.dur || a.id - b.id);
  const allDone = t >= maxDur;
  const assembled = sortOnAssemble ? [...done].sort((a, b) => a.id - b.id) : done;
  const outOfOrder = assembled.some((x, i) => x.id !== i + 1);

  function reset(next?: () => void) {
    setT(-1);
    next?.();
  }

  return (
    <Widget title="Orchestrator fan-out with Send" hint="Pick how many sections the planner creates, fan out one worker per task, and advance the clock. Workers finish in whatever order their work takes.">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Sections in plan:</span>
        {[3, 4, 5, 6, 7].map((k) => (
          <Pill key={k} active={n === k} onClick={() => reset(() => setN(k))}>
            {k}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">sections key:</span>
        <Pill active={reducer === "add"} onClick={() => reset(() => setReducer("add"))}>Annotated[list, operator.add]</Pill>
        <Pill active={reducer === "none"} onClick={() => reset(() => setReducer("none"))}>plain list (no reducer)</Pill>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">assemble:</span>
        <Pill active={sortOnAssemble} onClick={() => setSortOnAssemble(true)}>sort by task id</Pill>
        <Pill active={!sortOnAssemble} onClick={() => setSortOnAssemble(false)}>join in arrival order</Pill>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setT(t < 0 ? 0 : t)} disabled={t >= 0} className="min-h-10 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-40 dark:text-bg">
          1. Plan + fan out
        </button>
        <button type="button" onClick={() => setT((x) => Math.min(x + 1, maxDur))} disabled={t < 0 || allDone || reducer === "none"} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-40">
          2. Advance 1s (t={Math.max(t, 0)}s)
        </button>
        <button type="button" onClick={() => setT(maxDur)} disabled={t < 0 || allDone || reducer === "none"} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-40">
          Run to end
        </button>
        <button type="button" onClick={() => reset()} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>

      {t >= 0 && (
        <>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">fan_out returned {n} Send objects</p>
          <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {tasks.map((x) => {
              const fin = x.dur <= t && reducer === "add";
              return (
                <div key={x.id} className={`min-w-0 rounded-lg border p-2 text-xs ${fin ? "border-good bg-good-soft" : "border-border bg-surface-2"}`}>
                  <p className="break-words font-mono">Send(&quot;worker&quot;, task={x.id})</p>
                  <p className="break-words text-muted">{x.title}</p>
                  <p className="text-muted">{fin ? `done at t=${x.dur}s` : `writing… (needs ${x.dur}s)`}</p>
                </div>
              );
            })}
          </div>

          {reducer === "none" ? (
            <div className="mt-3 rounded-lg border border-bad bg-bad-soft p-3 text-sm">
              <p className="font-semibold">InvalidUpdateError</p>
              <p className="text-muted">
                {n} workers return an update for <code className="font-mono">sections</code> in the same superstep, but the key has no reducer, so it can hold only one value per step. LangGraph refuses the update. Add <code className="font-mono">operator.add</code>.
              </p>
            </div>
          ) : (
            <>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">state[&quot;sections&quot;] (arrival order)</p>
              <pre className="mt-1 overflow-x-auto rounded-lg bg-surface-2 p-2 text-[0.72rem]">
                {done.length ? done.map((x) => `(${x.id}, "## ${x.title}…")`).join("\n") : "[]"}
              </pre>
              <div className={`mt-3 rounded-lg border p-3 text-sm ${!allDone ? "border-border" : outOfOrder ? "border-bad bg-bad-soft" : "border-good bg-good-soft"}`}>
                {!allDone ? (
                  <p className="text-muted">assemble is waiting: it runs once, in the next superstep, after all {n} workers finish ({done.length}/{n} done).</p>
                ) : (
                  <>
                    <p className="font-semibold">{outOfOrder ? "Blog assembled out of order" : "Blog assembled in plan order"}</p>
                    <ol className="mt-1 list-decimal pl-5 text-xs">
                      {assembled.map((x, i) => (
                        <li key={x.id} className={x.id !== i + 1 ? "text-bad" : ""}>
                          {x.title}
                        </li>
                      ))}
                    </ol>
                    {outOfOrder && <p className="mt-1 text-xs text-muted">Parallel updates have no guaranteed order. Sort by the task id you stored with each section.</p>}
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
    </Widget>
  );
}
