"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Draft = { text: string; score: number; feedback: string };

/** Scripted drafts so the loop is deterministic: quality improves, then plateaus. */
const DRAFTS: Draft[] = [
  { text: "We added dark mode. Check it out!", score: 40, feedback: "Generic. No hook and no reason to care." },
  { text: "Dark mode is here! Rest your eyes while you take notes at night.", score: 58, feedback: "Better, but a cliché. Say something only this app could say." },
  { text: "Night owls: your 2 a.m. notes no longer glow like a stadium. Dark mode is live in Notely.", score: 71, feedback: "Good hook. Tell people how to switch it on." },
  { text: "Night owls: your 2 a.m. notes no longer glow like a stadium. Settings → Appearance → Dark. You're welcome.", score: 80, feedback: "Specific and funny. A little long; trim a few words." },
  { text: "2 a.m. notes shouldn't glow like a stadium. Dark mode is live: Settings → Appearance.", score: 86, feedback: "Tight, specific and on-brand." },
  { text: "Your 2 a.m. notes no longer light up the room. Dark mode: Settings → Appearance.", score: 89, feedback: "Hard to improve further. Changes are now just rewording." },
];

const draftAt = (i: number): Draft => DRAFTS[Math.min(i, DRAFTS.length - 1)];

const BARS = { lenient: 55, balanced: 75, strict: 95 } as const;
type Bar = keyof typeof BARS;
const MAX_OPTIONS = [2, 3, 5, 8];
const RECURSION_LIMIT = 25;

type Node = "START" | "generate" | "evaluate" | "optimize" | "END" | "ERROR";
type Sim = {
  next: Node;
  steps: number;
  iteration: number;
  evaluation: string;
  feedback: string;
  posts: string[];
  feedbacks: string[];
  log: { text: string; tone: "good" | "warn" | "bad" | "neutral" }[];
  stopReason: string;
};

const START_SIM: Sim = { next: "generate", steps: 0, iteration: 0, evaluation: "", feedback: "", posts: [], feedbacks: [], log: [], stopReason: "" };

function advance(s: Sim, bar: Bar, maxIter: number, buggy: boolean): Sim {
  if (s.next === "END" || s.next === "ERROR" || s.next === "START") return s;
  const steps = s.steps + 1;
  if (steps > RECURSION_LIMIT) {
    return { ...s, next: "ERROR", stopReason: `GraphRecursionError: hit recursion_limit=${RECURSION_LIMIT} super-steps`, log: [{ text: `GraphRecursionError after ${RECURSION_LIMIT} super-steps`, tone: "bad" as const }, ...s.log].slice(0, 10) };
  }
  if (s.next === "generate") {
    const d = draftAt(0);
    return { ...s, steps, next: "evaluate", iteration: 1, posts: [d.text], log: [{ text: "generate → draft 1 written, iteration = 1", tone: "neutral" as const }, ...s.log].slice(0, 10) };
  }
  if (s.next === "optimize") {
    const iteration = s.iteration + 1;
    const d = draftAt(iteration - 1);
    return { ...s, steps, next: "evaluate", iteration, posts: [...s.posts, d.text], log: [{ text: `optimize → draft ${iteration} rewritten from feedback, iteration = ${iteration}`, tone: "neutral" as const }, ...s.log].slice(0, 10) };
  }
  // evaluate, then the router decides
  const d = draftAt(s.iteration - 1);
  const approved = d.score >= BARS[bar];
  const evaluation = approved ? "approved" : "needs_improvement";
  const capped = s.iteration >= maxIter;
  const stop = buggy ? approved && capped : approved || capped;
  const log = [{ text: `evaluate → score ${d.score} vs bar ${BARS[bar]}: ${evaluation}`, tone: approved ? ("good" as const) : ("warn" as const) }, ...s.log];
  let stopReason = "";
  if (stop) stopReason = approved ? `Approved on iteration ${s.iteration}.` : `Stopped at max_iterations=${maxIter}. Best effort shipped (or flagged for a human).`;
  const routeText = stop ? "router → END" : "router → optimize";
  return {
    ...s,
    steps,
    next: stop ? "END" : "optimize",
    evaluation,
    feedback: d.feedback,
    feedbacks: [...s.feedbacks, d.feedback],
    log: [{ text: routeText, tone: stop ? ("good" as const) : ("neutral" as const) }, ...log].slice(0, 10),
    stopReason,
  };
}

export function LgRefineLoop() {
  const [bar, setBar] = useState<Bar>("balanced");
  const [maxIter, setMaxIter] = useState(5);
  const [buggy, setBuggy] = useState(false);
  const [sim, setSim] = useState<Sim>(START_SIM);

  const done = sim.next === "END" || sim.next === "ERROR";
  const reset = () => setSim(START_SIM);
  const runAll = () => {
    let s = START_SIM;
    for (let i = 0; i < RECURSION_LIMIT + 2; i++) s = advance(s, bar, maxIter, buggy);
    setSim(s);
  };

  return (
    <Widget title="Generate, evaluate, optimize" hint="A post-writing loop. Pick how strict the evaluator is and the iteration cap, then step through the graph one node (one super-step) at a time.">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Evaluator bar</span>
          {(Object.keys(BARS) as Bar[]).map((b) => (
            <Pill key={b} active={bar === b} onClick={() => { setBar(b); reset(); }}>
              {b} (≥{BARS[b]})
            </Pill>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">max_iterations</span>
          {MAX_OPTIONS.map((m) => (
            <Pill key={m} active={maxIter === m} onClick={() => { setMaxIter(m); reset(); }}>
              {m}
            </Pill>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Router</span>
          <Pill active={!buggy} onClick={() => { setBuggy(false); reset(); }}>approved or capped</Pill>
          <Pill active={buggy} onClick={() => { setBuggy(true); reset(); }}>approved and capped (bug)</Pill>
        </div>
      </div>

      <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-2 p-2 font-mono text-[0.72rem]">
{`if state["evaluation"] == "approved" ${buggy ? "and" : "or "} state["iteration"] >= state["max_iterations"]:
    return "done"
return "revise"`}
      </pre>

      <div className="mt-3 flex flex-wrap gap-1 text-[0.72rem] font-mono">
        {(["generate", "evaluate", "optimize", "END"] as Node[]).map((n) => (
          <span key={n} className={`rounded-full border px-2 py-1 ${sim.next === n ? "border-accent bg-accent-soft" : "border-border"}`}>
            {n}
          </span>
        ))}
        <span className="rounded-full border border-border px-2 py-1 text-muted">super-steps: {sim.steps}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={done} onClick={() => setSim((s) => advance(s, bar, maxIter, buggy))} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-50 dark:text-bg">
          {done ? "Finished" : `Run next node (${sim.next})`}
        </button>
        <button type="button" onClick={runAll} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">Run to the end</button>
        <button type="button" onClick={reset} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">Reset</button>
      </div>

      {sim.stopReason && (
        <p className={`mt-3 rounded-lg p-2 text-sm ${sim.next === "ERROR" ? "bg-bad-soft" : sim.evaluation === "approved" ? "bg-good-soft" : "bg-warn-soft"}`}>{sim.stopReason}</p>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-border p-2 text-[0.75rem]">
          <p className="font-semibold">State</p>
          <p className="font-mono break-words">iteration: {sim.iteration}</p>
          <p className="font-mono break-words">evaluation: {sim.evaluation || "—"}</p>
          <p className="font-mono break-words">feedback: {sim.feedback || "—"}</p>
          <p className="mt-2 font-semibold">post_history ({sim.posts.length})</p>
          <ol className="list-decimal space-y-1 pl-5">
            {sim.posts.map((p, i) => (
              <li key={i} className="break-words">{p}</li>
            ))}
          </ol>
        </div>
        <div className="min-w-0 rounded-lg border border-border p-2">
          <p className="text-[0.75rem] font-semibold">Log (newest first)</p>
          <ol className="mt-1 space-y-1">
            {sim.log.map((l, i) => (
              <li key={`${sim.steps}-${i}`} className={`rounded px-2 py-1 font-mono text-[0.7rem] break-words ${l.tone === "good" ? "bg-good-soft" : l.tone === "warn" ? "bg-warn-soft" : l.tone === "bad" ? "bg-bad-soft" : "bg-surface-2"}`}>
                {l.text}
              </li>
            ))}
          </ol>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">This demo sets recursion_limit to {RECURSION_LIMIT} so the runaway case ends quickly. Current LangGraph defaults to 1000.</p>
    </Widget>
  );
}
