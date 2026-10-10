"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type State = "closed" | "open" | "half-open";
type Line = { t: number; text: string; tone: "good" | "warn" | "bad" | "neutral" };

const THRESHOLD = 3;
const COOLDOWN = 10;

const stateStyle: Record<State, string> = {
  closed: "border-good bg-good-soft",
  open: "border-bad bg-bad-soft",
  "half-open": "border-warn bg-warn-soft",
};

const stateHelp: Record<State, string> = {
  closed: "Calls go through. Consecutive failures are counted.",
  open: "Calls fail fast without touching the dependency, giving it room to recover.",
  "half-open": "Cool-down over. The next call is a trial: success closes, failure re-opens.",
};

export function CircuitBreakerLab() {
  const [healthy, setHealthy] = useState(true);
  const [state, setState] = useState<State>("closed");
  const [failures, setFailures] = useState(0);
  const [openedAt, setOpenedAt] = useState(0);
  const [clock, setClock] = useState(0);
  const [reached, setReached] = useState(0);
  const [shortCircuited, setShortCircuited] = useState(0);
  const [log, setLog] = useState<Line[]>([]);

  const push = (line: Line) => setLog((l) => [line, ...l].slice(0, 7));

  function send() {
    const t = clock + 1;
    setClock(t);
    let current = state;
    if (current === "open") {
      if (t - openedAt >= COOLDOWN) {
        current = "half-open";
      } else {
        setShortCircuited((n) => n + 1);
        push({ t, text: `Breaker open → failed fast (cool-down ends at t=${openedAt + COOLDOWN}s)`, tone: "neutral" });
        return;
      }
    }
    setReached((n) => n + 1);
    if (healthy) {
      setFailures(0);
      setState("closed");
      push({ t, text: current === "half-open" ? "Trial call succeeded → breaker closed" : "Call succeeded (200)", tone: "good" });
      return;
    }
    if (current === "half-open") {
      setState("open");
      setOpenedAt(t);
      push({ t, text: "Trial call failed → breaker open again", tone: "bad" });
      return;
    }
    const f = failures + 1;
    setFailures(f);
    if (f >= THRESHOLD) {
      setState("open");
      setOpenedAt(t);
      push({ t, text: `Failure ${f}/${THRESHOLD} → breaker opens`, tone: "bad" });
    } else {
      push({ t, text: `Call failed (timeout). Failure ${f}/${THRESHOLD}`, tone: "warn" });
    }
  }

  function wait() {
    const t = clock + 5;
    setClock(t);
    if (state === "open" && t - openedAt >= COOLDOWN) {
      setState("half-open");
      push({ t, text: "Cool-down elapsed → half-open", tone: "warn" });
    } else {
      push({ t, text: "Waited 5 s", tone: "neutral" });
    }
  }

  function reset() {
    setHealthy(true);
    setState("closed");
    setFailures(0);
    setOpenedAt(0);
    setClock(0);
    setReached(0);
    setShortCircuited(0);
    setLog([]);
  }

  return (
    <Widget title="Circuit breaker" hint="Take the payment provider down, send requests until the breaker opens, then wait and bring it back.">
      <div className="flex flex-wrap gap-2">
        <Pill active={healthy} onClick={() => setHealthy(true)}>Provider healthy</Pill>
        <Pill active={!healthy} onClick={() => setHealthy(false)}>Provider down</Pill>
      </div>
      <div className={`mt-3 rounded-lg border p-3 ${stateStyle[state]}`}>
        <p className="font-mono text-sm font-semibold uppercase">{state}</p>
        <p className="mt-1 text-sm">{stateHelp[state]}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={send} className="min-h-10 flex-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
          Send request
        </button>
        <button type="button" onClick={wait} className="min-h-10 flex-1 rounded-lg border border-border px-3 text-sm">
          Wait 5 s
        </button>
        <button type="button" onClick={reset} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-muted p-2">
          <p className="text-xs text-muted-foreground">Clock</p>
          <p className="font-mono">t={clock}s</p>
        </div>
        <div className="rounded-lg bg-muted p-2">
          <p className="text-xs text-muted-foreground">Reached provider</p>
          <p className="font-mono">{reached}</p>
        </div>
        <div className="rounded-lg bg-muted p-2">
          <p className="text-xs text-muted-foreground">Failed fast</p>
          <p className="font-mono">{shortCircuited}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Opens after {THRESHOLD} consecutive failures · cool-down {COOLDOWN} s · each request takes 1 s
      </p>
      <ol className="mt-3 space-y-1">
        {log.map((line, i) => (
          <li
            key={`${log.length - i}-${line.t}`}
            className={`rounded-md px-2 py-1 text-[0.8rem] ${
              line.tone === "good" ? "bg-good-soft" : line.tone === "warn" ? "bg-warn-soft" : line.tone === "bad" ? "bg-bad-soft" : "bg-muted"
            }`}
          >
            <span className="font-mono text-muted-foreground">t={line.t}s</span> {line.text}
          </li>
        ))}
      </ol>
    </Widget>
  );
}
