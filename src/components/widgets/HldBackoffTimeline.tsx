"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Strategy = "fixed" | "expo" | "full" | "equal";

const LABEL: Record<Strategy, string> = {
  fixed: "Fixed 500 ms",
  expo: "Exponential",
  full: "Exponential + full jitter",
  equal: "Exponential + equal jitter",
};

const CLIENTS = 30;
const SHOWN = 8;
const BASE = 200;
const CAP = 3200;
const SPAN = 8000;
const BUCKET = 250;

/** Small deterministic PRNG so the picture is stable between renders. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    // mulberry32
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function attempts(strategy: Strategy, retries: number, client: number): number[] {
  const rand = rng(client * 7919 + 17);
  const times = [0];
  let t = 0;
  for (let i = 0; i < retries; i++) {
    const exp = Math.min(CAP, BASE * 2 ** i);
    let wait: number;
    if (strategy === "fixed") wait = 500;
    else if (strategy === "expo") wait = exp;
    else if (strategy === "full") wait = rand() * exp;
    else wait = exp / 2 + rand() * (exp / 2);
    t += wait;
    if (t > SPAN) break;
    times.push(t);
  }
  return times;
}

export function HldBackoffTimeline() {
  const [strategy, setStrategy] = useState<Strategy>("expo");
  const [retries, setRetries] = useState(5);

  const all = Array.from({ length: CLIENTS }, (_, c) => attempts(strategy, retries, c));
  const buckets = Array(Math.ceil(SPAN / BUCKET)).fill(0) as number[];
  for (const list of all) for (const t of list) buckets[Math.min(buckets.length - 1, Math.floor(t / BUCKET))]++;
  const peak = Math.max(...buckets);
  const peakAfterFirst = Math.max(...buckets.slice(1));
  const total = all.reduce((a, l) => a + l.length, 0);

  return (
    <Widget
      title="Backoff and jitter"
      hint={`A dependency blips at t=0 and ${CLIENTS} clients fail together. Each retries up to ${retries} times (base ${BASE} ms, cap ${CAP} ms). Compare how the retries bunch up.`}
    >
      <div className="flex flex-wrap gap-2">
        {(Object.keys(LABEL) as Strategy[]).map((s) => (
          <Pill key={s} active={strategy === s} onClick={() => setStrategy(s)}>
            {LABEL[s]}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Max retries</span>
        {[2, 3, 5].map((n) => (
          <Pill key={n} active={retries === n} onClick={() => setRetries(n)}>
            {n}
          </Pill>
        ))}
      </div>

      <div className="mt-4 space-y-1.5">
        {all.slice(0, SHOWN).map((list, c) => (
          <div key={c} className="flex items-center gap-2">
            <span className="w-14 shrink-0 font-mono text-[0.7rem] text-muted">client {c + 1}</span>
            <div className="relative h-4 min-w-0 flex-1 rounded bg-surface-2">
              {list.map((t, i) => (
                <span
                  key={i}
                  className={`absolute top-0.5 h-3 w-1.5 rounded-sm ${i === 0 ? "bg-bad" : "bg-accent"}`}
                  style={{ left: `calc(${(t / SPAN) * 100}% - 3px)` }}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="flex justify-between pl-16 text-[0.65rem] text-muted">
          <span>0 s</span>
          <span>{SPAN / 2000} s</span>
          <span>{SPAN / 1000} s</span>
        </div>
      </div>

      <p className="mt-4 text-xs font-semibold text-muted">Requests hitting the dependency per {BUCKET} ms, all {CLIENTS} clients</p>
      <div className="mt-1 flex h-20 items-end gap-px">
        {buckets.map((n, i) => (
          <div key={i} className="min-w-0 flex-1 rounded-t-sm bg-accent" style={{ height: `${(n / peak) * 100}%`, opacity: i === 0 ? 0.4 : 1 }} title={`${n} requests`} />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
        <div className={`min-w-0 rounded-lg p-2 ${peakAfterFirst > CLIENTS * 0.6 ? "bg-bad-soft" : peakAfterFirst > CLIENTS * 0.3 ? "bg-warn-soft" : "bg-good-soft"}`}>
          <p className="text-xs text-muted">Worst retry spike</p>
          <p className="font-mono">{peakAfterFirst} in {BUCKET} ms</p>
        </div>
        <div className="min-w-0 rounded-lg bg-surface-2 p-2">
          <p className="text-xs text-muted">Total requests</p>
          <p className="font-mono">{total} ({(total / CLIENTS).toFixed(1)}x)</p>
        </div>
      </div>
    </Widget>
  );
}
