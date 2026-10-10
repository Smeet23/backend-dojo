"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

type Technique = "poll3" | "poll1" | "long" | "sse" | "ws";

const LABELS: Record<Technique, string> = {
  poll3: "Polling, 3 s",
  poll1: "Polling, 1 s",
  long: "Long polling",
  sse: "SSE",
  ws: "WebSocket",
};

const WINDOW = 60; // seconds shown
const TRANSIT = 0.1; // one network trip, seconds (exaggerated so it's visible)
const PROCESS = 0.1; // client handles a response before re-requesting
const HOLD = 30; // long-poll server timeout
const EVENTS = [7.0, 7.15, 31.4, 52.8]; // task moves on board 412 (two in a quick burst)

type Sim = { requests: number[]; deliveries: { event: number; at: number }[]; empty: number; headerBytes: number };

/** Deterministic simulation of each transport over one minute of board activity. */
export function simulate(t: Technique): Sim {
  const deliveries: { event: number; at: number }[] = [];
  const requests: number[] = [];
  let empty = 0;

  if (t === "poll3" || t === "poll1") {
    const interval = t === "poll3" ? 3 : 1;
    for (let at = interval; at <= WINDOW; at += interval) {
      requests.push(at);
      const fresh = EVENTS.filter((e) => e > at - interval && e <= at);
      if (fresh.length === 0) empty += 1;
      for (const e of fresh) deliveries.push({ event: e, at: at + TRANSIT });
    }
    return { requests, deliveries, empty, headerBytes: requests.length * 800 };
  }

  if (t === "long") {
    // A request is "open" at the server from arrival until it answers.
    let sent = 0;
    const pending = [...EVENTS];
    while (sent < WINDOW) {
      requests.push(sent);
      const arrives = sent + TRANSIT;
      const waiting = pending.filter((e) => e <= arrives);
      let answerAt: number;
      let batch: number[];
      if (waiting.length) {
        answerAt = arrives;
        batch = waiting;
      } else {
        const next = pending.find((e) => e > arrives && e <= arrives + HOLD);
        if (next === undefined) {
          answerAt = arrives + HOLD;
          batch = [];
          empty += 1;
        } else {
          answerAt = next;
          batch = [next];
        }
      }
      for (const e of batch) {
        deliveries.push({ event: e, at: answerAt + TRANSIT });
        pending.splice(pending.indexOf(e), 1);
      }
      sent = answerAt + TRANSIT + PROCESS;
    }
    return { requests: requests.filter((r) => r <= WINDOW), deliveries, empty, headerBytes: requests.length * 800 };
  }

  // SSE and WebSocket: one connection, events pushed the moment they happen.
  requests.push(0);
  for (const e of EVENTS) deliveries.push({ event: e, at: e + TRANSIT });
  return { requests, deliveries, empty: 0, headerBytes: t === "ws" ? 800 + EVENTS.length * 2 : 800 + EVENTS.length * 30 };
}

const NOTES: Record<Technique, string> = {
  poll3: "Most requests come back empty, and each one runs auth, logging and a DB query. Average delay is about half the interval.",
  poll1: "Three times the requests (and the bill) to cut the delay. Still mostly empty answers.",
  long: "Near-instant, except the second event in the burst lands in the gap while the client is re-requesting, so it waits for the next request.",
  sse: "One request whose response never ends. Every event arrives one network trip after it happens. Moves the user makes still go up as separate POSTs.",
  ws: "One upgraded connection, events in both directions, about 2 bytes of framing per small message.",
};

function pct(t: number) {
  return `${Math.min(100, (t / WINDOW) * 100)}%`;
}

export function RealtimeTimeline() {
  const [tech, setTech] = useState<Technique>("poll3");
  const sim = useMemo(() => simulate(tech), [tech]);
  const delays = sim.deliveries.map((d) => d.at - d.event);
  const avg = delays.reduce((a, b) => a + b, 0) / delays.length;
  const max = Math.max(...delays);

  return (
    <Widget title="One minute of a live board" hint="Four task moves happen (two in a quick burst). Compare how each transport delivers them. Network trips are exaggerated to 0.1 s.">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(LABELS) as Technique[]).map((t) => <Pill key={t} active={tech === t} onClick={() => setTech(t)}>{LABELS[t]}</Pill>)}
      </div>

      <div className="mt-5 space-y-1">
        <p className="text-xs text-muted">Requests the client opens</p>
        <div className="relative h-6 rounded bg-surface-2">
          {sim.requests.map((r, i) => (
            <span key={i} className="absolute top-1 h-4 w-0.5 bg-muted" style={{ left: pct(r) }} />
          ))}
          {(tech === "sse" || tech === "ws") && <span className="absolute inset-y-2 left-0 right-0 rounded bg-accent-soft" />}
        </div>
        <p className="pt-2 text-xs text-muted">Task moves (top) and when the other teammate sees them (bottom)</p>
        <div className="relative h-10 rounded bg-surface-2">
          {EVENTS.map((e) => (
            <span key={e} className="absolute top-1 h-3 w-3 -translate-x-1/2 rounded-full bg-warn" style={{ left: pct(e) }} />
          ))}
          {sim.deliveries.map((d) => (
            <span key={d.event} className="absolute bottom-1 h-3 w-3 -translate-x-1/2 rounded-full bg-good" style={{ left: pct(d.at) }} />
          ))}
        </div>
        <div className="flex justify-between text-[0.7rem] text-muted"><span>0 s</span><span>30 s</span><span>60 s</span></div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Stat label="HTTP requests" value={String(sim.requests.length)} />
        <Stat label="Empty answers" value={String(sim.empty)} />
        <Stat label="Avg delay" value={`${avg.toFixed(2)} s`} />
        <Stat label="Worst delay" value={`${max.toFixed(2)} s`} />
      </div>
      <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">{NOTES[tech]}</p>
      <p className="mt-2 text-xs text-muted">At 10,000 open boards, multiply the request count by 10,000 every minute.</p>
    </Widget>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-mono text-base">{value}</p>
    </div>
  );
}
