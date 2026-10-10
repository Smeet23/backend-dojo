"use client";

import { useState } from "react";
import { Widget } from "./Widget";

type BState = "CLOSED" | "OPEN" | "HALF_OPEN";
type Outcome = "ok" | "fail" | "slow";
type Log = { text: string; tone: "good" | "bad" | "warn" | "neutral" };
type S = {
  state: BState;
  window: Outcome[];
  openedAt: number;
  clock: number;
  trial: Outcome[];
  rejected: number;
  log: Log[];
};

const WINDOW = 10;
const MIN_CALLS = 5;
const FAILURE_RATE = 50;
const SLOW_RATE = 60;
const OPEN_WAIT = 5;
const TRIAL_CALLS = 3;

const START: S = { state: "CLOSED", window: [], openedAt: 0, clock: 0, trial: [], rejected: 0, log: [] };

function rates(w: Outcome[]) {
  const n = w.length || 1;
  return {
    fail: Math.round((w.filter((o) => o === "fail").length / n) * 100),
    slow: Math.round((w.filter((o) => o === "slow").length / n) * 100),
  };
}

function push(s: S, entry: Log): Log[] {
  return [entry, ...s.log].slice(0, 7);
}

function call(s: S, outcome: Outcome): S {
  if (s.state === "OPEN") {
    return { ...s, rejected: s.rejected + 1, log: push(s, { text: "Rejected instantly (CallNotPermitted) → fallback", tone: "warn" }) };
  }
  if (s.state === "HALF_OPEN") {
    if (s.trial.length >= TRIAL_CALLS) {
      return { ...s, rejected: s.rejected + 1, log: push(s, { text: "Trial slots busy → rejected", tone: "warn" }) };
    }
    const trial = [...s.trial, outcome];
    const r = rates(trial);
    if (trial.length < TRIAL_CALLS) {
      return { ...s, trial, log: push(s, { text: `Trial call ${trial.length}/${TRIAL_CALLS}: ${outcome}`, tone: outcome === "ok" ? "good" : "bad" }) };
    }
    if (r.fail >= FAILURE_RATE || r.slow >= SLOW_RATE) {
      return { ...s, state: "OPEN", openedAt: s.clock, trial: [], log: push(s, { text: `Trials failed (${r.fail}% failed, ${r.slow}% slow) → OPEN again`, tone: "bad" }) };
    }
    return { ...s, state: "CLOSED", window: [], trial: [], log: push(s, { text: "Trials healthy → CLOSED, window reset", tone: "good" }) };
  }
  const window = [...s.window, outcome].slice(-WINDOW);
  const r = rates(window);
  const tone = outcome === "ok" ? "good" : outcome === "slow" ? "warn" : "bad";
  if (window.length >= MIN_CALLS && (r.fail >= FAILURE_RATE || r.slow >= SLOW_RATE)) {
    return {
      ...s,
      window,
      state: "OPEN",
      openedAt: s.clock,
      log: push(s, { text: `${outcome} → ${r.fail}% failed, ${r.slow}% slow over ${window.length} calls → OPEN`, tone: "bad" }),
    };
  }
  const note = window.length < MIN_CALLS ? ` (only ${window.length} calls, below minimum ${MIN_CALLS})` : "";
  return { ...s, window, log: push(s, { text: `${outcome} → ${r.fail}% failed, ${r.slow}% slow${note}`, tone }) };
}

function tick(s: S): S {
  const clock = s.clock + 1;
  if (s.state === "OPEN" && clock - s.openedAt >= OPEN_WAIT) {
    return { ...s, clock, state: "HALF_OPEN", trial: [], log: push(s, { text: `t${clock}: wait of ${OPEN_WAIT}s over → HALF_OPEN`, tone: "neutral" }) };
  }
  return { ...s, clock };
}

const STATE_STYLE: Record<BState, string> = {
  CLOSED: "border-good bg-good-soft",
  OPEN: "border-bad bg-bad-soft",
  HALF_OPEN: "border-warn bg-warn-soft",
};

const CELL: Record<Outcome, string> = { ok: "bg-good", fail: "bg-bad", slow: "bg-warn" };

export function HldBreakerStateMachine() {
  const [s, setS] = useState<S>(START);
  const r = rates(s.window);
  const left = s.state === "OPEN" ? OPEN_WAIT - (s.clock - s.openedAt) : 0;

  return (
    <Widget
      title="Sliding-window breaker"
      hint={`Count-based window of ${WINDOW} calls, opens at ${FAILURE_RATE}% failures or ${SLOW_RATE}% slow calls once ${MIN_CALLS} calls are recorded. Waits ${OPEN_WAIT}s in OPEN, then allows ${TRIAL_CALLS} trial calls.`}
    >
      <div className="flex flex-wrap gap-2">
        {(["CLOSED", "OPEN", "HALF_OPEN"] as BState[]).map((st) => (
          <div key={st} className={`min-h-10 flex-1 rounded-lg border px-3 py-2 text-center font-mono text-xs ${s.state === st ? STATE_STYLE[st] + " font-semibold" : "border-border text-muted"}`}>
            {st}
            {st === "OPEN" && s.state === "OPEN" && <span className="block text-[0.65rem]">half-open in {left}s</span>}
            {st === "HALF_OPEN" && s.state === "HALF_OPEN" && <span className="block text-[0.65rem]">trials {s.trial.length}/{TRIAL_CALLS}</span>}
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted">Sliding window (oldest left)</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {Array.from({ length: WINDOW }).map((_, i) => {
          const o = s.window[i];
          return <div key={i} className={`h-6 w-6 rounded ${o ? CELL[o] : "border border-dashed border-border"}`} title={o ?? "empty"} />;
        })}
      </div>
      <p className="mt-1 font-mono text-[0.72rem]">
        failure rate {r.fail}% · slow rate {r.slow}% · rejected {s.rejected}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button type="button" onClick={() => setS((p) => call(p, "ok"))} className="min-h-10 min-w-0 rounded-lg border border-good bg-good-soft px-2 text-sm">Call: success</button>
        <button type="button" onClick={() => setS((p) => call(p, "fail"))} className="min-h-10 min-w-0 rounded-lg border border-bad bg-bad-soft px-2 text-sm">Call: error</button>
        <button type="button" onClick={() => setS((p) => call(p, "slow"))} className="min-h-10 min-w-0 rounded-lg border border-warn bg-warn-soft px-2 text-sm">Call: slow (2s)</button>
        <button type="button" onClick={() => setS(tick)} className="min-h-10 min-w-0 rounded-lg bg-accent px-2 text-sm font-medium text-white dark:text-bg">Wait 1s (t{s.clock})</button>
      </div>
      <button type="button" onClick={() => setS(START)} className="mt-2 min-h-10 w-full rounded-lg border border-border px-3 text-sm">
        Reset
      </button>

      <ol className="mt-3 space-y-1">
        {s.log.map((l, i) => (
          <li key={i} className={`rounded-md px-2 py-1 font-mono text-[0.72rem] break-words ${l.tone === "bad" ? "bg-bad-soft" : l.tone === "warn" ? "bg-warn-soft" : l.tone === "good" ? "bg-good-soft" : "bg-surface-2"}`}>
            {l.text}
          </li>
        ))}
      </ol>
    </Widget>
  );
}
