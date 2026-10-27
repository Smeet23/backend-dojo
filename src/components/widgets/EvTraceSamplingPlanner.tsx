"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

type Intent = "tour" | "availability" | "maintenance" | "balance";
type T = { id: number; intent: Intent; mode: string | null; thumbsDown: boolean; guardrail: boolean; disagree: boolean };

const MODES = ["Claims reschedule, no tool call", "Quotes wrong price", "Transfer loop", "Wrong date format", "Shows another resident's balance"];
const SIGNALS: Record<string, string> = {
  "Claims reschedule, no tool call": "users complain (thumbs down)",
  "Quotes wrong price": "judges disagree",
  "Transfer loop": "guardrail timeout",
  "Wrong date format": "no signal at all",
  "Shows another resident's balance": "no signal, rare intent",
};

// A deterministic "firehose" of 60 leasing-assistant traces; 18 are failures (30%).
const TRACES: T[] = Array.from({ length: 60 }, (_, id) => {
  const intent: Intent = id < 4 ? "balance" : (["tour", "availability", "maintenance"] as const)[id % 3];
  let mode: string | null = null;
  if (id === 2) mode = MODES[4];
  else if ([6, 15, 27, 42].includes(id)) mode = MODES[0];
  else if ([7, 19, 28, 37, 49].includes(id)) mode = MODES[1];
  else if ([8, 32, 53].includes(id)) mode = MODES[2];
  else if ([10, 21, 33, 45, 51].includes(id)) mode = MODES[3];
  return {
    id, intent, mode,
    thumbsDown: [6, 15, 42, 12, 30, 47].includes(id),
    guardrail: mode === MODES[2],
    disagree: [7, 19, 28, 49, 13, 39, 55].includes(id),
  };
});
const TRUE_RATE = TRACES.filter((t) => t.mode).length / TRACES.length;

function shuffle<X>(xs: X[], seed: number): X[] {
  const a = [...xs];
  let s = seed;
  for (let k = a.length - 1; k > 0; k--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (k + 1);
    [a[k], a[j]] = [a[j], a[k]];
  }
  return a;
}

const STRATS = {
  random: { label: "Random", desc: "Uniform over all traces." },
  stratified: { label: "Stratified by intent", desc: "Round-robin, random within each intent." },
  uncertainty: { label: "Judge disagreement", desc: "Traces where two evaluators disagree, then random." },
  failure: { label: "Failure signals", desc: "Thumbs down or guardrail hits first, then random." },
  blend: { label: "Blend", desc: "Half random, half from the signal pools." },
} as const;
type Strat = keyof typeof STRATS;

function pick(strat: Strat, n: number, seed: number): T[] {
  const r = shuffle(TRACES, seed);
  const fill = (first: T[]) => [...first, ...r.filter((t) => !first.includes(t))].slice(0, n);
  if (strat === "random") return r.slice(0, n);
  if (strat === "uncertainty") return fill(r.filter((t) => t.disagree));
  if (strat === "failure") return fill(r.filter((t) => t.thumbsDown || t.guardrail));
  if (strat === "stratified") {
    const groups = (["tour", "availability", "maintenance", "balance"] as const).map((g) => r.filter((t) => t.intent === g));
    const out: T[] = [];
    for (let k = 0; out.length < n; k++) for (const g of groups) if (g[k] && out.length < n) out.push(g[k]);
    return out;
  }
  const half = r.slice(0, Math.ceil(n / 2));
  const sig = r.filter((t) => !half.includes(t) && (t.disagree || t.thumbsDown || t.guardrail));
  return fill([...half, ...sig]);
}

export function EvTraceSamplingPlanner() {
  const [strat, setStrat] = useState<Strat>("random");
  const [n, setN] = useState(12);
  const [seed, setSeed] = useState(7);
  const chosen = useMemo(() => pick(strat, n, seed), [strat, n, seed]);
  const ids = new Set(chosen.map((t) => t.id));
  const fails = chosen.filter((t) => t.mode);
  const found = new Set(fails.map((t) => t.mode));
  const est = fails.length / chosen.length;

  return (
    <Widget title="Sampling from the firehose" hint="60 production traces, 30% failing across 5 failure modes. Choose a strategy and a review budget; see what you'd learn.">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STRATS) as Strat[]).map((s) => (
          <Pill key={s} active={strat === s} onClick={() => setStrat(s)}>{STRATS[s].label}</Pill>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">{STRATS[strat].desc}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          Budget: <b>{n}</b> traces
          <input type="range" min={4} max={30} value={n} onChange={(e) => setN(Number(e.target.value))} className="w-32 accent-accent" />
        </label>
        <button type="button" onClick={() => setSeed((s) => s + 101)} className="min-h-9 rounded-lg border border-border px-3 text-sm">Redraw random</button>
      </div>

      <div className="mt-3 grid grid-cols-10 gap-1" aria-label="Trace grid">
        {TRACES.map((t) => {
          const on = ids.has(t.id);
          const tone = !on ? "bg-surface-2 text-muted" : t.mode ? "bg-bad-soft border-bad" : "bg-good-soft border-good";
          const sig = `${t.thumbsDown ? "☹" : ""}${t.guardrail ? "⏱" : ""}${t.disagree ? "≠" : ""}`;
          return (
            <div key={t.id} title={`${t.intent}${t.mode ? `: ${t.mode}` : ""}`} className={`flex h-8 items-center justify-center rounded border text-[10px] ${on ? tone : "border-transparent " + tone}`}>
              {sig || (t.intent === "balance" ? "$" : "")}
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-muted">☹ user thumbs down · ⏱ guardrail timeout · ≠ judges disagree · $ balance intent (rare). Picked traces are colored: red failing, green passing.</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-3 text-sm">
          <p>Failures in sample: <b>{fails.length}</b> of {chosen.length}</p>
          <p className="mt-1">
            Failure rate this sample suggests: <b>{Math.round(est * 100)}%</b> (true: {Math.round(TRUE_RATE * 100)}%)
          </p>
          {strat !== "random" && strat !== "stratified" && est > TRUE_RATE + 0.1 && (
            <p className="mt-2 rounded bg-warn-soft p-2 text-xs">Targeted samples overstate how often things fail. Don&apos;t report this as your failure rate.</p>
          )}
        </div>
        <div className="rounded-lg border border-border p-3 text-sm">
          <p>Failure modes discovered: <b>{found.size}</b> of {MODES.length}</p>
          <ul className="mt-1 space-y-0.5 text-xs">
            {MODES.map((m) => (
              <li key={m} className={found.has(m) ? "" : "text-muted"}>
                {found.has(m) ? "✓" : "·"} {m} <span className="text-muted">({SIGNALS[m]})</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Widget>
  );
}
