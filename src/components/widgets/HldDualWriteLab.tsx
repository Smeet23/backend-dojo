"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Strategy = "dual" | "eventFirst" | "outbox";
type Crash = "none" | "afterDb" | "afterPublish";

const STRATEGY_LABEL: Record<Strategy, string> = {
  dual: "DB, then publish",
  eventFirst: "Publish, then DB",
  outbox: "Outbox + relay",
};

const CRASH_LABEL: Record<Crash, string> = {
  none: "No crash",
  afterDb: "Crash after step 1",
  afterPublish: "Crash after step 2",
};

type Step = { text: string; tone: "good" | "bad" | "neutral" | "warn" };
type Outcome = { steps: Step[]; dbRow: boolean; events: number; verdict: string; tone: "good" | "warn" | "bad" };

function simulate(strategy: Strategy, crash: Crash): Outcome {
  const steps: Step[] = [];
  if (strategy === "dual") {
    steps.push({ text: "1. INSERT order 8812 → committed", tone: "good" });
    if (crash === "afterDb") {
      steps.push({ text: "Process killed before publishing", tone: "bad" });
      return { steps, dbRow: true, events: 0, verdict: "Order exists but no event was sent. Inventory and email never hear about it.", tone: "bad" };
    }
    steps.push({ text: "2. Publish OrderPlaced → acked", tone: "good" });
    if (crash === "afterPublish") steps.push({ text: "Process killed after both writes (nothing left to do)", tone: "neutral" });
    return { steps, dbRow: true, events: 1, verdict: "Consistent this time, but only because the crash missed the gap.", tone: "warn" };
  }
  if (strategy === "eventFirst") {
    steps.push({ text: "1. Publish OrderPlaced → acked", tone: "good" });
    if (crash === "afterDb") {
      steps.push({ text: "Process killed before the INSERT", tone: "bad" });
      return { steps, dbRow: false, events: 1, verdict: "Downstream services reserved stock for an order that doesn't exist.", tone: "bad" };
    }
    steps.push({ text: "2. INSERT order 8812 → committed", tone: "good" });
    if (crash === "afterPublish") steps.push({ text: "Process killed after both writes (nothing left to do)", tone: "neutral" });
    return { steps, dbRow: true, events: 1, verdict: "Consistent this time, but the gap is still there.", tone: "warn" };
  }
  steps.push({ text: "1. BEGIN; INSERT order; INSERT outbox row; COMMIT", tone: "good" });
  if (crash === "afterDb") {
    steps.push({ text: "Process killed. Outbox row still unpublished.", tone: "warn" });
    steps.push({ text: "Relay restarts, finds the row, publishes → acked, marks sent", tone: "good" });
    return { steps, dbRow: true, events: 1, verdict: "Delayed, not lost. The relay finished the job after restart.", tone: "good" };
  }
  steps.push({ text: "2. Relay publishes OrderPlaced → acked", tone: "good" });
  if (crash === "afterPublish") {
    steps.push({ text: "Relay killed before marking the row sent", tone: "warn" });
    steps.push({ text: "Relay restarts, publishes the same row again", tone: "warn" });
    return { steps, dbRow: true, events: 2, verdict: "At-least-once: a duplicate event. Idempotent consumers drop it by event id.", tone: "good" };
  }
  steps.push({ text: "3. Relay marks the outbox row sent", tone: "good" });
  return { steps, dbRow: true, events: 1, verdict: "Consistent.", tone: "good" };
}

const TONE: Record<Step["tone"], string> = {
  good: "bg-good-soft",
  bad: "bg-bad-soft",
  warn: "bg-warn-soft",
  neutral: "bg-surface-2",
};

export function HldDualWriteLab() {
  const [strategy, setStrategy] = useState<Strategy>("dual");
  const [crash, setCrash] = useState<Crash>("afterDb");
  const out = simulate(strategy, crash);

  return (
    <Widget title="Dual write vs outbox" hint="Pick a strategy and where the process crashes. Watch whether the database and the broker end up agreeing.">
      <p className="text-xs font-semibold text-muted">Strategy</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {(Object.keys(STRATEGY_LABEL) as Strategy[]).map((s) => (
          <Pill key={s} active={strategy === s} onClick={() => setStrategy(s)}>
            {STRATEGY_LABEL[s]}
          </Pill>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold text-muted">Failure</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {(Object.keys(CRASH_LABEL) as Crash[]).map((c) => (
          <Pill key={c} active={crash === c} onClick={() => setCrash(c)}>
            {CRASH_LABEL[c]}
          </Pill>
        ))}
      </div>

      <ol className="mt-4 space-y-1">
        {out.steps.map((s, i) => (
          <li key={i} className={`rounded-md px-3 py-1.5 font-mono text-[0.75rem] break-words ${TONE[s.tone]}`}>
            {s.text}
          </li>
        ))}
      </ol>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
        <div className="min-w-0 rounded-lg border border-border p-2">
          <p className="text-xs text-muted">orders table</p>
          <p className="font-mono">{out.dbRow ? "row 8812" : "empty"}</p>
        </div>
        <div className="min-w-0 rounded-lg border border-border p-2">
          <p className="text-xs text-muted">OrderPlaced events</p>
          <p className="font-mono">{out.events}</p>
        </div>
      </div>
      <p className={`mt-3 rounded-lg p-3 text-sm ${out.tone === "good" ? "bg-good-soft" : out.tone === "warn" ? "bg-warn-soft" : "bg-bad-soft"}`}>{out.verdict}</p>
    </Widget>
  );
}
