"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

const CAPACITY = 6; // token bucket size, and leaky bucket queue size
const RATE = 2; // tokens per second, and leak (drain) rate per second

type Outcome = { at: number; served: number | null };

function arrivals(burst: number, trickle: boolean): number[] {
  const times = Array.from({ length: burst }, () => 0);
  if (trickle) for (let i = 0; i < 12; i++) times.push(4 + i * 0.25); // 4 req/s from t=4 to t=6.75
  return times;
}

function tokenBucket(times: number[]): Outcome[] {
  let tokens = CAPACITY;
  let last = 0;
  return times.map((t) => {
    tokens = Math.min(CAPACITY, tokens + (t - last) * RATE);
    last = t;
    if (tokens >= 1) {
      tokens -= 1;
      return { at: t, served: t };
    }
    return { at: t, served: null };
  });
}

function leakyBucket(times: number[]): Outcome[] {
  const interval = 1 / RATE;
  const serveTimes: number[] = [];
  let nextFree = 0;
  return times.map((t) => {
    const waiting = serveTimes.filter((s) => s > t).length;
    if (waiting >= CAPACITY) return { at: t, served: null };
    const s = Math.max(t, nextFree);
    nextFree = s + interval;
    serveTimes.push(s);
    return { at: t, served: s };
  });
}

function summary(out: Outcome[]) {
  const ok = out.filter((o) => o.served !== null);
  const waits = ok.map((o) => (o.served as number) - o.at);
  const max = waits.length ? Math.max(...waits) : 0;
  return { ok: ok.length, dropped: out.length - ok.length, maxWait: max };
}

function Row({ title, out }: { title: string; out: Outcome[] }) {
  const s = summary(out);
  return (
    <div className="min-w-0 rounded-lg border border-border p-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {out.map((o, i) => {
          const wait = o.served === null ? null : o.served - o.at;
          const tone = o.served === null ? "bg-bad-soft" : wait && wait > 0 ? "bg-warn-soft" : "bg-good-soft";
          return (
            <span key={i} className={`rounded px-1.5 py-0.5 font-mono text-[0.68rem] ${tone}`} title={`arrived t=${o.at}`}>
              {o.served === null ? "drop" : wait && wait > 0 ? `+${wait.toFixed(1)}s` : "now"}
            </span>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded bg-good-soft p-1.5"><p className="text-muted">Served</p><p className="font-mono">{s.ok}</p></div>
        <div className="rounded bg-bad-soft p-1.5"><p className="text-muted">Rejected</p><p className="font-mono">{s.dropped}</p></div>
        <div className="rounded bg-warn-soft p-1.5"><p className="text-muted">Max wait</p><p className="font-mono">{s.maxWait.toFixed(1)}s</p></div>
      </div>
    </div>
  );
}

export function HldBucketBurst() {
  const [burst, setBurst] = useState(10);
  const [trickle, setTrickle] = useState(false);
  const times = useMemo(() => arrivals(burst, trickle), [burst, trickle]);
  const tb = useMemo(() => tokenBucket(times), [times]);
  const lb = useMemo(() => leakyBucket(times), [times]);

  return (
    <Widget
      title="Token bucket vs leaky bucket"
      hint={`Both are sized ${CAPACITY} with a rate of ${RATE}/s. A burst arrives at t=0. Each chip is one request: served now, served after a wait, or dropped.`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Burst size</span>
        {[4, 10, 16].map((b) => (
          <Pill key={b} active={burst === b} onClick={() => setBurst(b)}>
            {b} at once
          </Pill>
        ))}
        <Pill active={trickle} onClick={() => setTrickle((t) => !t)}>
          Then 4 req/s from t=4: {trickle ? "on" : "off"}
        </Pill>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Row title="Token bucket (answer now or reject)" out={tb} />
        <Row title="Leaky bucket (queue, drain at a steady rate)" out={lb} />
      </div>

      <p className="mt-3 text-sm text-muted">
        The token bucket answers instantly and rejects the overflow. The leaky bucket accepts roughly the same number but makes later
        requests wait, so the downstream sees a perfectly even {RATE}/s. With the 4 req/s trickle on, both settle to about {RATE}/s:
        that is the sustained rate either way.
      </p>
    </Widget>
  );
}
